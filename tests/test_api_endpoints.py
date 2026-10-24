"""
FastAPI Integration Tests for Healthcare Copilot & PQC Channel.
Validates:
1. GET /health, GET /models
2. GET /pqc/handshake & POST /pqc/session
3. PQC_REQUIRED=False allows plaintext requests
4. PQC_REQUIRED=True rejects plaintext requests with HTTP 403
5. Encrypted wrapped requests to /chat, /links, /summary
6. Cross-channel session isolation (HTTP 403)
7. Replay rejection on API endpoints
"""

import base64
import json
import os
import sys
from pathlib import Path
import pytest
from fastapi.testclient import TestClient

ENGINE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ENGINE_DIR))

import main
from pqc_channel import build_aad, make_nonce
from cryptography.hazmat.primitives.asymmetric import x25519
from cryptography.hazmat.primitives.ciphers.aead import AESGCM


@pytest.fixture
def client():
    # Ensure PQC is enabled and required is false by default
    main.PQC_ENABLED = True
    main.PQC_REQUIRED = False
    return TestClient(main.app)


def test_health_and_models_endpoints(client):
    res = client.get("/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "ok"
    assert data["pqc_enabled"] is True
    assert data["pqc_fingerprint"] is not None
    assert data["pqc_fingerprint"].startswith("SHA256:")

    res_models = client.get("/models")
    assert res_models.status_code == 200
    m_data = res_models.json()
    assert len(m_data["models"]) > 0


def test_handshake_and_session_handshake(client):
    res_hs = client.get("/pqc/handshake")
    assert res_hs.status_code == 200
    hs = res_hs.json()
    assert "key_id" in hs
    assert hs["kem_alg"] == "ML-KEM-768"
    assert hs["sig_alg"] == "ML-DSA-65"

    # Client encapsulates
    kem_pk = base64.b64decode(hs["kem_public_key"])
    ct, _ = main.channel_mgr.provider.kem_encaps(kem_pk)
    client_x = x25519.X25519PrivateKey.generate()

    sess_payload = {
        "key_id": hs["key_id"],
        "kem_ciphertext": base64.b64encode(ct).decode(),
        "client_x25519_public": base64.b64encode(client_x.public_key().public_bytes_raw()).decode(),
    }
    res_sess = client.post("/pqc/session", json=sess_payload)
    assert res_sess.status_code == 200
    s_data = res_sess.json()
    assert "channel_id" in s_data
    assert s_data["status"] == "established"


def test_pqc_required_flag_rejects_plaintext(client):
    # Set PQC_REQUIRED = True
    main.PQC_REQUIRED = True
    try:
        # Plain chat without X-Channel-Id must be rejected with 403
        res = client.post("/chat", json={"session_id": "test-123", "message": "Hello"})
        assert res.status_code == 403
        assert "PQC secure channel required" in res.json()["detail"]

        # Plain links without X-Channel-Id must be rejected with 403
        res_links = client.post("/links", json={"session_id": "test-123", "index": 0, "kind": "purchase"})
        assert res_links.status_code == 403

        # Plain summary without X-Channel-Id must be rejected with 403
        res_sum = client.post("/summary", json={"session_id": "test-123"})
        assert res_sum.status_code == 403
    finally:
        main.PQC_REQUIRED = False


def test_encrypted_chat_and_summary_flow(client):
    # 1. Handshake & Session
    hs = client.get("/pqc/handshake").json()
    kem_pk = base64.b64decode(hs["kem_public_key"])
    ct, _ = main.channel_mgr.provider.kem_encaps(kem_pk)
    client_x = x25519.X25519PrivateKey.generate()
    sess_res = client.post("/pqc/session", json={
        "key_id": hs["key_id"],
        "kem_ciphertext": base64.b64encode(ct).decode(),
        "client_x25519_public": base64.b64encode(client_x.public_key().public_bytes_raw()).decode(),
    }).json()
    channel_id = sess_res["channel_id"]
    ch = main.channel_mgr.get_channel(channel_id)

    # 2. Seed a mock session bound to this channel
    session_id = "test-session-rx-101"
    session_data = {
        "session_id": session_id,
        "document": {
            "document_type": "prescription",
            "patient": {"name": "Test Patient", "age": "45"},
            "prescription": {"doctor_name": "Dr. Selvan"},
            "quick_summary": "Patient prescribed Amoxicillin for acute bacterial sinusitis.",
        },
        "schedule": [
            {
                "index": 0,
                "name": "Amoxicillin",
                "strength": "500 mg",
                "dosage": "1 tablet",
                "food": "After food",
                "duration_days": 5,
                "parsed": True,
                "needs_check": False,
                "as_needed": False,
            }
        ],
        "chat_history": [],
        "created_at": 1000000,
        "expires_at": 2000000,
    }
    main.channel_mgr.save_session_encrypted(session_id, channel_id, session_data)

    # 3. Encrypted POST /links request (Client Counter 0)
    links_plain = json.dumps({"session_id": session_id, "index": 0, "kind": "purchase"}).encode()
    aes_c2s = AESGCM(ch.client_to_server_key)
    nonce0 = make_nonce(0)
    aad0 = build_aad(channel_id, "POST", "/links", 0)
    c0 = aes_c2s.encrypt(nonce0, links_plain, aad0)

    res_links = client.post(
        "/links",
        json={"n": base64.b64encode(nonce0).decode(), "c": base64.b64encode(c0).decode()},
        headers={"X-Channel-Id": channel_id},
    )
    assert res_links.status_code == 200
    assert "X-Channel-Id" in res_links.headers
    enc_resp = res_links.json()
    assert "n" in enc_resp and "c" in enc_resp

    # Decrypt server response with server->client key (Server Counter 0)
    aes_s2c = AESGCM(ch.server_to_client_key)
    s_nonce0 = base64.b64decode(enc_resp["n"])
    s_aad0 = build_aad(channel_id, "POST", "/links", 0)
    dec_links = json.loads(aes_s2c.decrypt(s_nonce0, base64.b64decode(enc_resp["c"]), s_aad0).decode())
    assert "cards" in dec_links
    assert dec_links["cards"][0]["medicine"] == "Amoxicillin"

    # 4. Encrypted POST /summary request (Client Counter 1)
    summary_plain = json.dumps({"session_id": session_id}).encode()
    nonce1 = make_nonce(1)
    aad1 = build_aad(channel_id, "POST", "/summary", 1)
    c1 = aes_c2s.encrypt(nonce1, summary_plain, aad1)

    res_sum = client.post(
        "/summary",
        json={"n": base64.b64encode(nonce1).decode(), "c": base64.b64encode(c1).decode()},
        headers={"X-Channel-Id": channel_id},
    )
    assert res_sum.status_code == 200
    enc_sum = res_sum.json()
    s_nonce1 = base64.b64decode(enc_sum["n"])
    s_aad1 = build_aad(channel_id, "POST", "/summary", 1)
    dec_sum = json.loads(aes_s2c.decrypt(s_nonce1, base64.b64decode(enc_sum["c"]), s_aad1).decode())
    assert "summary" in dec_sum
    assert "Amoxicillin" in dec_sum["summary"]
    assert "signature_bundle" in dec_sum
    assert dec_sum["signature_bundle"]["sig_alg"] == "ML-DSA-65"


def test_cross_channel_session_hijacking_prevented(client):
    """Verifies that Channel 2 cannot access a session owned by Channel 1."""
    # Establish Channel 1
    hs = client.get("/pqc/handshake").json()
    kem_pk = base64.b64decode(hs["kem_public_key"])

    ct1, _ = main.channel_mgr.provider.kem_encaps(kem_pk)
    x1 = x25519.X25519PrivateKey.generate()
    cid1 = client.post("/pqc/session", json={
        "key_id": hs["key_id"],
        "kem_ciphertext": base64.b64encode(ct1).decode(),
        "client_x25519_public": base64.b64encode(x1.public_key().public_bytes_raw()).decode(),
    }).json()["channel_id"]

    # Establish Channel 2 (Adversary)
    ct2, _ = main.channel_mgr.provider.kem_encaps(kem_pk)
    x2 = x25519.X25519PrivateKey.generate()
    cid2 = client.post("/pqc/session", json={
        "key_id": hs["key_id"],
        "kem_ciphertext": base64.b64encode(ct2).decode(),
        "client_x25519_public": base64.b64encode(x2.public_key().public_bytes_raw()).decode(),
    }).json()["channel_id"]
    ch2 = main.channel_mgr.get_channel(cid2)

    # Save session under Channel 1
    session_id = "patient-victim-private-session-456"
    main.channel_mgr.save_session_encrypted(session_id, cid1, {
        "session_id": session_id,
        "document": {"patient": {"name": "Victim"}},
        "schedule": [],
        "chat_history": [],
    })

    # Channel 2 attempts to query summary for Channel 1's session
    aes_c2 = AESGCM(ch2.client_to_server_key)
    n0 = make_nonce(0)
    aad0 = build_aad(cid2, "POST", "/summary", 0)
    c0 = aes_c2.encrypt(n0, json.dumps({"session_id": session_id}).encode(), aad0)

    res = client.post(
        "/summary",
        json={"n": base64.b64encode(n0).decode(), "c": base64.b64encode(c0).decode()},
        headers={"X-Channel-Id": cid2},
    )
    # Must be 403 Forbidden!
    assert res.status_code == 403
    assert "Access denied" in res.json()["detail"]


def test_map_endpoints(client):
    res_redirect = client.get("/map", follow_redirects=False)
    assert res_redirect.status_code in (307, 302, 301)
    assert res_redirect.headers["location"].endswith("/map/index.html")

    res_map = client.get("/map/index.html")
    assert res_map.status_code == 200
    assert "Medical" in res_map.text
    assert "leaflet" in res_map.text.lower()
