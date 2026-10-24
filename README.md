# Healthcare Copilot - Post-Quantum Cryptography (PQC) Integration

> **Quantum-Safe Protection for Sensitive Patient Health Records, Prescriptions, and Medical Diagnostics.**

---

## 1. System Architecture

```
+--------------------------------------------------------------------------------------------------+
|                                    CLIENT BROWSER (Vite + React)                                 |
|                                                                                                  |
|   +--------------------------+       +-------------------------+       +---------------------+   |
|   |  @noble/post-quantum     |       |   WebCrypto API         |       |  In-Memory Storage  |   |
|   |  - ML-KEM-768 Encaps     | <---> |   - AES-256-GCM AEAD    | <---> |  - Zero Persistence |   |
|   |  - ML-DSA-65 Verify      |       |   - Nonces: Counter-only|       |  - Wiped on Reset   |   |
|   |  - X25519 (ECDH)         |       |   - Dual-Direction Keys |       |  - No LocalStorage  |   |
|   +--------------------------+       +-------------------------+       +---------------------+   |
|                |                                  |                                              |
+----------------|----------------------------------|----------------------------------------------+
                 | Hybrid Handshake                 | Encrypted Channel Requests (X-Channel-Id)
                 | (KEM ct + X25519 pk)             | { n: base64_nonce, c: base64_ciphertext }
                 v                                  v
+--------------------------------------------------------------------------------------------------+
|                                 BACKEND GATEWAY (FastAPI / main.py)                              |
|                                                                                                  |
|   +------------------------------------------------------------------------------------------+   |
|   | PQC Channel Middleware & Interceptors                                                    |   |
|   | - Handshake Rate Limiter (20/min/IP)                                                     |   |
|   | - Monotonic Counter Validator (Anti-Replay & Anti-Reorder)                               |   |
|   | - Context-Bound AAD Verification: channel_id | method | path | counter                   |   |
|   +------------------------------------------------------------------------------------------+   |
|                |                                  |                                              |
|                v                                  v                                              |
|   +--------------------------+       +-------------------------+       +---------------------+   |
|   | pqc_provider.py          |       | pqc_channel.py          |       | In-Memory Sessions  |   |
|   | - MyFile / liboqs        | <---> | - HKDF-SHA256 Derivation| <---> | - Per-Session AES Key   |
|   | - ML-KEM-768 Decaps      |       | - Dual-Direction Keys   |       | - Tied to Channel ID|   |
|   | - ML-DSA-65 Signing      |       | - 24-hr KEM Rotation    |       | - Encrypted at Rest |   |
|   +--------------------------+       +-------------------------+       +---------------------+   |
|                                                   |                                              |
|                           +-----------------------+-----------------------+                      |
|                           | Decrypted in-memory payload buffer            |                      |
|                           | (EXIF/GPS metadata sanitized)                 |                      |
|                           v                                               v                      |
|              +--------------------------+                   +--------------------------+         |
|              | Google Gemini 1.5/2.0 API|                   | ML-DSA-65 Result Signer  |         |
|              | (TLS 1.3 Transport)      |                   | (Integrity & Non-Repud.) |         |
|              +--------------------------+                   +--------------------------+         |
|                           |                                               |                      |
|                           +-----------------------+-----------------------+                      |
|                                                   |                                              |
|                                                   v                                              |
|                     Server->Client AES-256-GCM Encrypted Response Envelope                       |
+--------------------------------------------------------------------------------------------------+
```

---

## 2. Cryptographic Message Flow

### A. Handshake & Channel Establishment

```
CLIENT                                                           SERVER
  |                                                                |
  | -------- 1. GET /pqc/handshake ------------------------------> |
  |                                                                |
  | <------- 2. 200 OK ------------------------------------------- |
  |          {                                                     |
  |            key_id: "kem_17298...",                             |
  |            kem_alg: "ML-KEM-768",                              |
  |            kem_public_key: "<base64, 1184 bytes>",             |
  |            sig_alg: "ML-DSA-65",                               |
  |            sig_public_key: "<base64, 1952 bytes>",             |
  |            server_x25519_public: "<base64, 32 bytes>",         |
  |            fingerprint: "SHA256:7B:3A:...",                    |
  |            expires_at: "2026-10-25T...",                       |
  |            signature: "<base64, 3309 bytes>"                   |
  |          }                                                     |
  |                                                                |
  | [Verify ML-DSA-65 Signature over transcript]                   |
  | [Pin / verify Signing Fingerprint in UI]                       |
  | [ML-KEM-768 Encapsulate -> (ct_kem, ss_kem)]                   |
  | [X25519 DH -> ss_x25519]                                      |
  |                                                                |
  | -------- 3. POST /pqc/session -------------------------------> |
  |          {                                                     |
  |            key_id: "kem_17298...",                             |
  |            kem_ciphertext: "<base64, 1088 bytes>",             |
  |            client_x25519_public: "<base64, 32 bytes>"          |
  |          }                                                     |
  |                                                                |
  |                                       [Server KEM Decaps -> ss_kem]
  |                                       [Server X25519 DH -> ss_x25519]
  |                                       [Derive Dual Keys via HKDF-SHA256:
  |                                          salt = ss_x25519
  |                                          IKM = ss_mlkem
  |                                          info = "healthcare-copilot-v1|" + key_id
  |                                          OKM = k_c2s (32B) || k_s2c (32B)]
  |                                                                |
  | <------- 4. 200 OK { channel_id: "chan_..." } ----------------- |
  |                                                                |
  | [Client Derives Identical k_c2s and k_s2c]                     |
```

### B. Encrypted Application Requests (`/analyze`, `/chat`, `/links`, `/summary`)

```
CLIENT                                                           SERVER
  |                                                                |
  | counter = 0                                                    |
  | nonce = make_nonce(counter) (8 bytes 0x00 || 4 bytes counter)  |
  | aad = channel_id + "|POST|/chat|" + counter                    |
  | ciphertext = AES_GCM_Encrypt(k_c2s, nonce, plaintext, aad)     |
  |                                                                |
  | -------- POST /chat -----------------------------------------> |
  |          Headers: X-Channel-Id: chan_...                       |
  |          Body: { "n": base64(nonce), "c": base64(ciphertext) } |
  |                                                                |
  |                                       [Validate counter == expected (0)]
  |                                       [Build expected AAD]
  |                                       [AES_GCM_Decrypt(k_c2s, nonce, ct, aad)]
  |                                       [Advance expected_counter = 1]
  |                                       [Execute Gemini / RAG / Engine]
  |                                                                |
  |                                       server_counter = 0
  |                                       s_nonce = make_nonce(0)
  |                                       s_aad = channel_id + "|POST|/chat|0"
  |                                       s_ct = AES_GCM_Encrypt(k_s2c, s_nonce, res, s_aad)
  |                                                                |
  | <------- 200 OK ---------------------------------------------- |
  |          { "n": base64(s_nonce), "c": base64(s_ct) }           |
  |                                                                |
  | [Client decrypts response with k_s2c]                          |
```

---

## 3. Threat Model

### A. Protected Threats
| Threat | Mitigation Mechanism |
| :--- | :--- |
| **Harvest Now, Decrypt Later (HNDL)** | Classical TLS session keys captured today can be decrypted by future CRQCs (Cryptanalytically Relevant Quantum Computers). Our hybrid **FIPS 203 ML-KEM-768 + X25519** layer ensures quantum computers cannot recover session keys. |
| **Man-in-the-Middle (MITM)** | Handshake parameters are signed with **FIPS 204 ML-DSA-65**. The client verifies this signature and pins the cryptographic fingerprint (`SHA256:...`) displayed in the UI. |
| **Replay & Out-of-Order Attacks** | Nonces are derived from strictly monotonic 32-bit counters (`8 bytes 0x00 || 4 bytes counter`). Requests with duplicate or out-of-order counters are immediately rejected with `400 Bad Request`. |
| **Tampering & Context Swapping** | AES-256-GCM includes strict Associated Authenticated Data (AAD) binding each payload to `channel_id|METHOD|path|counter`. Any altered byte or rerouted URL triggers authentication failure. |
| **Session Hijacking / In-Memory Leaks** | Sessions are strictly tied to the originating `channel_id`. Session state is stored in server memory encrypted with an ephemeral AES-256-GCM data key wrapped by the channel key. |
| **Document Privacy on Server** | Uploaded prescription images/PDFs are decrypted in-memory only, processed via buffer, and securely zeroed. Plaintext documents are never written to server disk or persistent logs. |
| **Result Forgery / Non-Repudiation** | Clinical analysis outputs and summaries are digitally signed with server ML-DSA-65. The browser verifies the signature and presents a tamper badge. |

### B. What is NOT Protected (Honest Limitations & Mitigations)
1. **Google Gemini External API Hop**:
   - *Limitation:* The call from FastAPI server to Google Gemini (`generativeai` endpoint) uses standard Google TLS 1.3 transport, not our application-layer PQC keys.
   - *Mitigations:*
     - **Data Minimization:** All EXIF/GPS metadata is stripped from images using Pillow before submission.
     - **Privacy Redaction:** No user identifiers, session IDs, or channel credentials are sent to Google.
     - Only sanitized document image bytes and structured medical extraction prompts are transmitted.
   - *Recommended Transport Complement:* Terminate external egress and ingress at a reverse proxy (e.g., Caddy or Nginx with OpenSSL 3.4+ / OQS provider) utilizing hybrid **X25519MLKEM768** TLS 1.3 key exchange.
2. **Compromised Client Device / Browser:**
   - If the patient's device is compromised by spyware or malicious browser extensions with DOM access, plaintext could be captured before encryption.
   - *Mitigation:* Zero storage persistence (`localStorage`/`IndexedDB` are never used). Keys and decrypted state are wiped immediately upon clicking "Start New Document" or closing the tab.
3. **Compromised Backend Host:**
   - Root compromise of the server host allows memory inspection of active decryption buffers.
   - *Mitigation:* Server KEM keys rotate every 24 hours; in-memory sessions auto-expire after 2 hours and are wiped from memory.

---

## 4. Key Management & Rotation

Server KEM keys are rotated on a strict 24-hour lifecycle, while preserving a 1-hour grace period for active channels.

### Generate Initial Keys
```bash
python generate_keys.py
```
Outputs:
- Generates master signing key (`ML-DSA-65`) and initial KEM key (`ML-KEM-768`).
- Sets `.env` variables: `PQC_KEM_SECRET_KEY`, `PQC_SIG_SECRET_KEY`, `PQC_SIG_PUBLIC_KEY`.

### Rotate KEM Keys
```bash
python rotate_keys.py
```
- Rotates active ML-KEM-768 keypair.
- Retains previous key for a 60-minute grace period to prevent dropping in-flight sessions.
- Displays new key ID and fingerprint.

---

## 5. Provider Switching

Healthcare Copilot supports multiple PQC backends via the standardized `PQCProvider` interface in `pqc_provider.py`:

```bash
# Option 1: Hand-crafted / existing project PQC module (Default)
export PQC_PROVIDER=my_file

# Option 2: Standard Open Quantum Safe library (liboqs-python)
export PQC_PROVIDER=liboqs

# Enable or enforce PQC requirement:
export PQC_ENABLED=true
export PQC_REQUIRED=false   # Set to true in production to block plaintext legacy traffic
```

---

## 6. Running Tests & Benchmarks

### Backend Test Suite (34 tests)
```bash
pytest tests -v
```
Verifies:
- ML-KEM-768 & ML-DSA-65 roundtrips, corrupted ciphertext rejection, and KAT vectors.
- Monotonic counter anti-replay protection.
- Tampered ciphertext single-bit flip rejection.
- Session-channel isolation (anti-hijacking).
- 15 MB large file roundtrips.
- KEM key rotation and 1-hour grace period enforcement.
- `PQC_REQUIRED=true` rejecting plaintext requests with 403.

### Frontend / Node.js Interoperability Test (8 tests)
```bash
cd frontend
node test_pqc_interop.js
```
Verifies cross-language cryptographic compatibility between Python `liboqs` and JavaScript `@noble/post-quantum`:
- Deterministic ML-KEM-768 encaps/decaps match.
- ML-DSA-65 cross-verification.
- Classical X25519 shared secret equivalence.
- Dual-direction key derivation & WebCrypto AES-256-GCM verification.

### Performance Benchmark
```bash
python benchmark_pqc.py
```

#### Typical Benchmark Results
| Metric | Measurement |
| :--- | :--- |
| **Server ML-DSA-65 Sign** | ~0.60 ms |
| **Client ML-DSA-65 Verify** | ~0.15 ms |
| **Client ML-KEM-768 Encaps** | ~0.16 ms |
| **Server ML-KEM-768 Decaps** | ~0.13 ms |
| **Total Handshake Latency** | **~1.5 - 2.5 ms** |
| **Chat Encryption Added Overhead** | **< 0.02 ms** (imperceptible) |
| **2.5 MB Document Encrypt + Decrypt**| **~17 ms** |
| **Framing Size Overhead** | **+97 bytes** per message |
"# engineAICopilot-" 
