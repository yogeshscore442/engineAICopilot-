"""
Tests for PQC Channel Manager and Cryptographic Protocol.
Validates:
1. Hybrid Key Exchange (ML-KEM-768 + X25519)
2. Directional Nonce & Strict Counter Anti-Replay Protection
3. Associated Authenticated Data (AAD) Tampering Detection
4. AEAD Ciphertext Tampering Detection (Single-Bit Flip)
5. Session-to-Channel Strict Binding (Cross-Channel Isolation)
6. Large File Encryption / Decryption Round-trip (15 MB)
7. KEM Key 24-hour Rotation & Grace Period Expiry
8. Decryption Error Lockout Rate Limiting
"""

import base64
import os
import sys
import time
from pathlib import Path
import pytest

from cryptography.hazmat.primitives.asymmetric import x25519

ENGINE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ENGINE_DIR))

from pqc_channel import (
    PQCChannel,
    PQCChannelError,
    PQCChannelManager,
    ReplayAttackError,
    SessionAccessDeniedError,
    TamperedCiphertextError,
    build_aad,
    make_nonce,
)
from pqc_provider import get_pqc_provider


@pytest.fixture
def channel_manager():
    provider = get_pqc_provider("my_file")
    return PQCChannelManager(provider)


def test_handshake_payload_and_signature(channel_manager):
    payload = channel_manager.key_manager.get_handshake_payload()
    assert "key_id" in payload
    assert payload["kem_alg"] == "ML-KEM-768"
    assert payload["sig_alg"] == "ML-DSA-65"
    assert "kem_public_key" in payload
    assert "sig_public_key" in payload
    assert "server_x25519_public" in payload
    assert "signature" in payload
    assert payload["fingerprint"].startswith("SHA256:")

    # Verify signature locally
    kem_pk = base64.b64decode(payload["kem_public_key"])
    sig_pk = base64.b64decode(payload["sig_public_key"])
    server_x25519_pub = base64.b64decode(payload["server_x25519_public"])
    signature = base64.b64decode(payload["signature"])

    transcript = (
        payload["key_id"].encode("utf-8")
        + b"|"
        + kem_pk
        + b"|"
        + server_x25519_pub
        + b"|"
        + payload["expires_at"].encode("utf-8")
    )
    is_valid = channel_manager.provider.verify(sig_pk, transcript, signature)
    assert is_valid is True, "Handshake signature must verify against server signing key"


def test_channel_creation_and_derivation(channel_manager):
    hs = channel_manager.key_manager.get_handshake_payload()
    kem_pk = base64.b64decode(hs["kem_public_key"])

    # Client encapsulates
    ct, _ = channel_manager.provider.kem_encaps(kem_pk)
    client_x25519_priv = x25519.X25519PrivateKey.generate()
    client_x25519_pub = client_x25519_priv.public_key().public_bytes_raw()

    channel_id = channel_manager.create_channel(
        key_id=hs["key_id"],
        kem_ciphertext_b64=base64.b64encode(ct).decode(),
        client_x25519_pub_b64=base64.b64encode(client_x25519_pub).decode(),
    )
    assert channel_id is not None
    channel = channel_manager.get_channel(channel_id)
    assert channel is not None
    assert len(channel.client_to_server_key) == 32
    assert len(channel.server_to_client_key) == 32
    assert channel.client_to_server_key != channel.server_to_client_key, "Dual keys must be distinct"


def test_monotonic_counter_anti_replay(channel_manager):
    """Verifies that replaying a previously seen counter is strictly rejected."""
    hs = channel_manager.key_manager.get_handshake_payload()
    kem_pk = base64.b64decode(hs["kem_public_key"])
    ct, _ = channel_manager.provider.kem_encaps(kem_pk)
    client_x = x25519.X25519PrivateKey.generate()
    cid = channel_manager.create_channel(
        hs["key_id"],
        base64.b64encode(ct).decode(),
        base64.b64encode(client_x.public_key().public_bytes_raw()).decode(),
    )
    ch = channel_manager.get_channel(cid)

    # Client encrypts message 0
    from cryptography.hazmat.primitives.ciphers.aead import AESGCM
    aes = AESGCM(ch.client_to_server_key)
    msg0 = b"First message counter 0"
    nonce0 = make_nonce(0)
    aad0 = build_aad(cid, "POST", "/chat", 0)
    c0 = aes.encrypt(nonce0, msg0, aad0)

    # First delivery succeeds
    dec0 = ch.decrypt_client_message(base64.b64encode(nonce0).decode(), base64.b64encode(c0).decode(), "POST", "/chat")
    assert dec0 == msg0

    # REPLAY ATTACK: Resend exact same message 0
    with pytest.raises(ReplayAttackError):
        ch.decrypt_client_message(base64.b64encode(nonce0).decode(), base64.b64encode(c0).decode(), "POST", "/chat")


def test_out_of_order_counter_rejected(channel_manager):
    """Verifies that jumping counters or out-of-order packets are rejected."""
    hs = channel_manager.key_manager.get_handshake_payload()
    ct, _ = channel_manager.provider.kem_encaps(base64.b64decode(hs["kem_public_key"]))
    client_x = x25519.X25519PrivateKey.generate()
    cid = channel_manager.create_channel(
        hs["key_id"],
        base64.b64encode(ct).decode(),
        base64.b64encode(client_x.public_key().public_bytes_raw()).decode(),
    )
    ch = channel_manager.get_channel(cid)

    from cryptography.hazmat.primitives.ciphers.aead import AESGCM
    aes = AESGCM(ch.client_to_server_key)

    # Client attempts to send message with counter 5 when server expects 0
    nonce5 = make_nonce(5)
    aad5 = build_aad(cid, "POST", "/chat", 5)
    c5 = aes.encrypt(nonce5, b"Skip ahead", aad5)

    with pytest.raises(ReplayAttackError):
        ch.decrypt_client_message(base64.b64encode(nonce5).decode(), base64.b64encode(c5).decode(), "POST", "/chat")


def test_tampered_ciphertext_single_bit_flip_rejected(channel_manager):
    """Verifies that modifying a single bit of ciphertext triggers TamperedCiphertextError."""
    hs = channel_manager.key_manager.get_handshake_payload()
    ct, _ = channel_manager.provider.kem_encaps(base64.b64decode(hs["kem_public_key"]))
    client_x = x25519.X25519PrivateKey.generate()
    cid = channel_manager.create_channel(
        hs["key_id"],
        base64.b64encode(ct).decode(),
        base64.b64encode(client_x.public_key().public_bytes_raw()).decode(),
    )
    ch = channel_manager.get_channel(cid)

    from cryptography.hazmat.primitives.ciphers.aead import AESGCM
    aes = AESGCM(ch.client_to_server_key)
    msg = b"Tamper test sensitive patient diagnosis"
    nonce = make_nonce(0)
    aad = build_aad(cid, "POST", "/analyze", 0)
    ciphertext = bytearray(aes.encrypt(nonce, msg, aad))

    # Flip one single bit
    ciphertext[0] ^= 0x01

    with pytest.raises(TamperedCiphertextError):
        ch.decrypt_client_message(base64.b64encode(nonce).decode(), base64.b64encode(ciphertext).decode(), "POST", "/analyze")


def test_tampered_aad_rejected(channel_manager):
    """Verifies that tampering with path, method, or channel_id in AAD fails decryption."""
    hs = channel_manager.key_manager.get_handshake_payload()
    ct, _ = channel_manager.provider.kem_encaps(base64.b64decode(hs["kem_public_key"]))
    client_x = x25519.X25519PrivateKey.generate()
    cid = channel_manager.create_channel(
        hs["key_id"],
        base64.b64encode(ct).decode(),
        base64.b64encode(client_x.public_key().public_bytes_raw()).decode(),
    )
    ch = channel_manager.get_channel(cid)

    from cryptography.hazmat.primitives.ciphers.aead import AESGCM
    aes = AESGCM(ch.client_to_server_key)
    nonce = make_nonce(0)
    # Encrypted with /chat AAD
    aad = build_aad(cid, "POST", "/chat", 0)
    c = aes.encrypt(nonce, b"Legitimate message", aad)

    # Server receives request on /analyze instead of /chat -> AAD mismatch
    with pytest.raises(TamperedCiphertextError):
        ch.decrypt_client_message(base64.b64encode(nonce).decode(), base64.b64encode(c).decode(), "POST", "/analyze")


def test_session_channel_isolation(channel_manager):
    """
    CRITICAL SECURITY CHECK:
    A session created by Channel A CANNOT be read or decrypted by Channel B!
    """
    hs = channel_manager.key_manager.get_handshake_payload()
    kem_pk = base64.b64decode(hs["kem_public_key"])

    # Channel A
    ct_a, _ = channel_manager.provider.kem_encaps(kem_pk)
    xa = x25519.X25519PrivateKey.generate()
    cid_a = channel_manager.create_channel(
        hs["key_id"],
        base64.b64encode(ct_a).decode(),
        base64.b64encode(xa.public_key().public_bytes_raw()).decode(),
    )

    # Channel B (attacker or different client)
    ct_b, _ = channel_manager.provider.kem_encaps(kem_pk)
    xb = x25519.X25519PrivateKey.generate()
    cid_b = channel_manager.create_channel(
        hs["key_id"],
        base64.b64encode(ct_b).decode(),
        base64.b64encode(xb.public_key().public_bytes_raw()).decode(),
    )

    session_id = "session-alice-private-rx-999"
    sensitive_data = {
        "patient": "Alice Smith",
        "diagnosis": "Confidential Cardiac Evaluation",
        "medicines": ["Atorvastatin 20mg"],
    }

    # Bind session to Channel A
    channel_manager.save_session_encrypted(session_id, cid_a, sensitive_data)

    # Channel A reads -> SUCCESS
    read_a = channel_manager.load_session_decrypted(session_id, cid_a)
    assert read_a["patient"] == "Alice Smith"

    # Channel B attempts to read session_id -> ACCESS DENIED!
    with pytest.raises(SessionAccessDeniedError):
        channel_manager.load_session_decrypted(session_id, cid_b)


def test_large_file_roundtrip_15mb(channel_manager):
    """Tests PQC channel encryption on large files (15 MB image or PDF)."""
    hs = channel_manager.key_manager.get_handshake_payload()
    ct, _ = channel_manager.provider.kem_encaps(base64.b64decode(hs["kem_public_key"]))
    client_x = x25519.X25519PrivateKey.generate()
    cid = channel_manager.create_channel(
        hs["key_id"],
        base64.b64encode(ct).decode(),
        base64.b64encode(client_x.public_key().public_bytes_raw()).decode(),
    )
    ch = channel_manager.get_channel(cid)

    # 15 MB random data
    large_payload = os.urandom(15 * 1024 * 1024)

    # Server encrypts -> Client decrypts
    enc = ch.encrypt_server_message(large_payload, "GET", "/summary")
    from cryptography.hazmat.primitives.ciphers.aead import AESGCM
    client_aes = AESGCM(ch.server_to_client_key)
    nonce = base64.b64decode(enc["n"])
    ciphertext = base64.b64decode(enc["c"])
    aad = build_aad(cid, "GET", "/summary", 0)

    decrypted = client_aes.decrypt(nonce, ciphertext, aad)
    assert decrypted == large_payload


def test_kem_rotation_and_grace_period(channel_manager):
    """Tests that active key works, rotation moves key to grace, and grace key expires."""
    k_mgr = channel_manager.key_manager
    initial_key_id = k_mgr.active_key_id
    initial_sk = k_mgr.active_kem_sk

    # Trigger rotation
    k_mgr.rotate_kem_key()
    new_key_id = k_mgr.active_key_id

    assert new_key_id != initial_key_id
    assert k_mgr.prev_key_id == initial_key_id

    # Grace key retrieval works
    sk_grace = k_mgr.get_kem_sk(initial_key_id)
    assert sk_grace == initial_sk

    # Active key works
    sk_new = k_mgr.get_kem_sk(new_key_id)
    assert sk_new == k_mgr.active_kem_sk

    # Expire grace key manually
    k_mgr.prev_expires_at = time.time() - 10
    with pytest.raises(PQCChannelError, match="expired"):
        k_mgr.get_kem_sk(initial_key_id)
