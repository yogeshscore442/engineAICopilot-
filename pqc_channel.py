"""
Post-Quantum Cryptography (PQC) Secure Channel Manager.

Implements:
1. Hybrid Key Exchange: ML-KEM-768 + Classical X25519
2. HKDF-SHA256 Dual-Key Derivation (client->server, server->client)
3. AES-256-GCM Framing with 96-bit Counter-based Nonce & Strict AAD
4. Strict Anti-Replay & Reordering Protection
5. Session Binding & In-Memory Per-Session Data Encryption
6. ML-DSA-65 Result Integrity Signing
7. Automatic Key Rotation (24h) with Grace Period
8. Rate Limiting on Handshakes & Failed Decryptions
"""

import base64
import hashlib
import hmac
import json
import logging
import os
import struct
import time
from datetime import datetime, timezone
from typing import Any, Dict, Optional, Tuple

from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.asymmetric import x25519
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives.kdf.hkdf import HKDF

from pqc_provider import PQCProvider, get_pqc_provider

logger = logging.getLogger("pqc_channel")


class PQCChannelError(Exception):
    """Generic error for channel handshake and cryptographic failures."""
    pass


class ReplayAttackError(PQCChannelError):
    """Raised when replayed or out-of-order counter is detected."""
    pass


class TamperedCiphertextError(PQCChannelError):
    """Raised when AEAD decryption fails."""
    pass


class SessionAccessDeniedError(PQCChannelError):
    """Raised when a channel attempts to access a session it does not own."""
    pass


# ---------------- Nonce & Framing Utilities ----------------
def make_nonce(counter: int) -> bytes:
    """
    Constructs a 96-bit (12-byte) deterministic nonce from a monotonic counter.
    Format: 8 bytes zero padding || 4 bytes big-endian counter.
    Guarantees unique nonces per direction without nonce reuse.
    """
    if counter < 0 or counter > 0xFFFFFFFF:
        raise ValueError("Counter out of 32-bit bounds")
    return struct.pack(">Q", 0) + struct.pack(">I", counter)


def build_aad(channel_id: str, method: str, path: str, counter: int) -> bytes:
    """
    Builds Associated Authenticated Data (AAD) binding the message to its channel,
    HTTP method, route path, and sequence counter.
    """
    normalized_path = path.rstrip("/").lower() or "/"
    return f"{channel_id}|{method.upper()}|{normalized_path}|{counter}".encode("utf-8")


# ---------------- Key Manager ----------------
class PQCKeyManager:
    """
    Manages Server KEM (ML-KEM-768) and Signing (ML-DSA-65) keypairs.
    Supports 24-hour KEM key rotation with a 1-hour grace period for active clients.
    """

    def __init__(self, provider: PQCProvider, rotation_seconds: int = 86400, grace_seconds: int = 3600):
        self.provider = provider
        self.rotation_seconds = rotation_seconds
        self.grace_seconds = grace_seconds

        # Signing keypair (persists across KEM rotations)
        self.sig_pk, self.sig_sk = self.provider.sig_keygen()
        self.signing_fingerprint = self._compute_fingerprint(self.sig_pk)

        # Active KEM keypair
        self.active_key_id: str = ""
        self.active_kem_pk: bytes = b""
        self.active_kem_sk: bytes = b""
        self.active_created_at: float = 0.0
        self.active_expires_at: float = 0.0

        # Previous KEM keypair (grace period)
        self.prev_key_id: Optional[str] = None
        self.prev_kem_pk: Optional[bytes] = None
        self.prev_kem_sk: Optional[bytes] = None
        self.prev_expires_at: Optional[float] = None

        # Ephemeral X25519 keypair for the active handshake cycle
        self.server_x25519_priv = x25519.X25519PrivateKey.generate()
        self.server_x25519_pub = self.server_x25519_priv.public_key().public_bytes_raw()

        # Initialize first KEM key
        self.rotate_kem_key()

    @staticmethod
    def _compute_fingerprint(pk: bytes) -> str:
        """Returns human-readable SHA-256 fingerprint for UI pinning."""
        h = hashlib.sha256(pk).hexdigest().upper()
        # Format as SHA256:XX:XX:... (first 16 hex pairs)
        pairs = [h[i:i + 2] for i in range(0, 32, 2)]
        return f"SHA256:{':'.join(pairs)}"

    def rotate_kem_key(self):
        """Generates a fresh ML-KEM-768 keypair and transitions the old key to grace."""
        now = time.time()
        # If there's an active key, demote to prev with grace expiry
        if self.active_kem_pk:
            self.prev_key_id = self.active_key_id
            self.prev_kem_pk = self.active_kem_pk
            self.prev_kem_sk = self.active_kem_sk
            self.prev_expires_at = now + self.grace_seconds

        pk, sk = self.provider.kem_keygen()
        # Generate new ephemeral X25519 for server side
        self.server_x25519_priv = x25519.X25519PrivateKey.generate()
        self.server_x25519_pub = self.server_x25519_priv.public_key().public_bytes_raw()

        key_hash = hashlib.sha256(pk).hexdigest()[:12]
        self.active_key_id = f"kem_{int(now)}_{key_hash}"
        self.active_kem_pk = pk
        self.active_kem_sk = sk
        self.active_created_at = now
        self.active_expires_at = now + self.rotation_seconds

        logger.info(f"Rotated server KEM key: {self.active_key_id} (Expires in {self.rotation_seconds}s)")

    def check_rotation(self):
        """Trigger rotation if active key has expired."""
        now = time.time()
        if now >= self.active_expires_at:
            self.rotate_kem_key()
        # Prune grace key if expired
        if self.prev_expires_at and now >= self.prev_expires_at:
            self.prev_key_id = None
            self.prev_kem_pk = None
            self.prev_kem_sk = None
            self.prev_expires_at = None

    def get_handshake_payload(self) -> Dict[str, Any]:
        """
        Builds signed handshake response:
        Signed content = key_id || kem_public_key || server_x25519_public || expires_at
        """
        self.check_rotation()
        expires_at_iso = datetime.fromtimestamp(self.active_expires_at, tz=timezone.utc).isoformat()

        # Transcript string to sign
        signed_transcript = (
            self.active_key_id.encode("utf-8")
            + b"|"
            + self.active_kem_pk
            + b"|"
            + self.server_x25519_pub
            + b"|"
            + expires_at_iso.encode("utf-8")
        )

        signature = self.provider.sign(self.sig_sk, signed_transcript)

        return {
            "key_id": self.active_key_id,
            "kem_alg": self.provider.kem_alg,
            "kem_public_key": base64.b64encode(self.active_kem_pk).decode("ascii"),
            "sig_alg": self.provider.sig_alg,
            "sig_public_key": base64.b64encode(self.sig_pk).decode("ascii"),
            "server_x25519_public": base64.b64encode(self.server_x25519_pub).decode("ascii"),
            "fingerprint": self.signing_fingerprint,
            "expires_at": expires_at_iso,
            "signature": base64.b64encode(signature).decode("ascii"),
        }

    def get_kem_sk(self, key_id: str) -> bytes:
        """Retrieves KEM secret key if key_id is active or within grace period."""
        self.check_rotation()
        if key_id == self.active_key_id:
            return self.active_kem_sk
        if self.prev_key_id and key_id == self.prev_key_id:
            if time.time() < (self.prev_expires_at or 0):
                return self.prev_kem_sk
            raise PQCChannelError("Requested KEM key grace period has expired.")
        raise PQCChannelError("Unknown or expired KEM key ID.")


# ---------------- Channel Session ----------------
class PQCChannel:
    """Represents an established quantum-safe duplex encrypted communication channel."""

    def __init__(
        self,
        channel_id: str,
        client_to_server_key: bytes,
        server_to_client_key: bytes,
        ttl_seconds: int = 7200,  # 2 hours
    ):
        self.channel_id = channel_id
        self.client_to_server_key = client_to_server_key
        self.server_to_client_key = server_to_client_key
        self.created_at = time.time()
        self.expires_at = self.created_at + ttl_seconds

        # Counters for strict replay & reordering protection
        self.expected_client_counter: int = 0
        self.server_counter: int = 0

        # Security audit & rate limiting
        self.failed_decrypt_count: int = 0
        self.is_locked: bool = False

        # In-memory per-channel data key for session wrapping
        self.channel_data_key: bytes = os.urandom(32)

    def is_expired(self) -> bool:
        return time.time() >= self.expires_at or self.is_locked

    def next_server_counter(self) -> int:
        c = self.server_counter
        self.server_counter += 1
        return c

    def decrypt_client_message(self, nonce_b64: str, ciphertext_b64: str, method: str, path: str) -> bytes:
        """
        Decrypts client message with AES-256-GCM.
        Enforces:
        - Nonce counter == expected_client_counter (strictly monotonic, no replay)
        - Exact AAD matching channel_id, method, path, and counter
        """
        if self.is_expired():
            raise PQCChannelError("Channel expired or terminated.")

        if self.failed_decrypt_count >= 5:
            self.is_locked = True
            raise PQCChannelError("Channel locked due to excessive cryptographic errors.")

        try:
            nonce = base64.b64decode(nonce_b64)
            ciphertext = base64.b64decode(ciphertext_b64)
        except Exception:
            self.failed_decrypt_count += 1
            raise PQCChannelError("Malformed base64 ciphertext or nonce.")

        if len(nonce) != 12:
            self.failed_decrypt_count += 1
            raise PQCChannelError("Invalid nonce length (must be 96-bit).")

        # Extract counter from big-endian 4 bytes at end of 12-byte nonce
        claimed_counter = struct.unpack(">I", nonce[8:12])[0]
        padding = nonce[0:8]
        if padding != b"\x00" * 8:
            self.failed_decrypt_count += 1
            raise PQCChannelError("Invalid nonce format.")

        # Replay and reordering check
        if claimed_counter != self.expected_client_counter:
            self.failed_decrypt_count += 1
            logger.warning(
                f"Replay/reorder attack detected on channel {self.channel_id[:8]}: "
                f"claimed={claimed_counter}, expected={self.expected_client_counter}"
            )
            raise ReplayAttackError("Replayed or out-of-order counter detected.")

        # Reconstruct AAD
        aad = build_aad(self.channel_id, method, path, claimed_counter)

        try:
            aesgcm = AESGCM(self.client_to_server_key)
            plaintext = aesgcm.decrypt(nonce, ciphertext, aad)
            # Advance expected counter only on SUCCESS
            self.expected_client_counter += 1
            self.failed_decrypt_count = 0
            return plaintext
        except Exception as e:
            self.failed_decrypt_count += 1
            logger.warning(f"Decryption failure on channel {self.channel_id[:8]}: {e}")
            raise TamperedCiphertextError("Invalid ciphertext or MAC tag.")

    def encrypt_server_message(self, plaintext: bytes, method: str, path: str) -> Dict[str, str]:
        """
        Encrypts server response with AES-256-GCM using server->client key.
        """
        if self.is_expired():
            raise PQCChannelError("Channel expired.")

        counter = self.next_server_counter()
        nonce = make_nonce(counter)
        aad = build_aad(self.channel_id, method, path, counter)

        aesgcm = AESGCM(self.server_to_client_key)
        ciphertext = aesgcm.encrypt(nonce, plaintext, aad)

        return {
            "n": base64.b64encode(nonce).decode("ascii"),
            "c": base64.b64encode(ciphertext).decode("ascii"),
        }


# ---------------- Channel Manager & Session Binding ----------------
class PQCChannelManager:
    """Central orchestrator for active PQC channels and encrypted in-memory sessions."""

    def __init__(self, provider: Optional[PQCProvider] = None):
        self.provider = provider or get_pqc_provider()
        self.key_manager = PQCKeyManager(self.provider)

        # Active channels: channel_id -> PQCChannel
        self.channels: Dict[str, PQCChannel] = {}

        # Encrypted in-memory sessions: session_id -> { "channel_id": str, "wrapped_key": bytes, "enc_blob": bytes, "expires_at": float }
        self.encrypted_sessions: Dict[str, Dict[str, Any]] = {}

        # Handshake IP rate limiter: ip -> list of timestamps
        self.handshake_rate_limit: Dict[str, list] = {}

    def prune_expired(self):
        """Garbage collects expired channels and sessions."""
        now = time.time()
        dead_channels = [cid for cid, ch in self.channels.items() if ch.is_expired()]
        for cid in dead_channels:
            del self.channels[cid]

        dead_sessions = [sid for sid, s in self.encrypted_sessions.items() if now >= s.get("expires_at", 0)]
        for sid in dead_sessions:
            del self.encrypted_sessions[sid]

        # Prune rate limit windows older than 60s
        for ip in list(self.handshake_rate_limit.keys()):
            self.handshake_rate_limit[ip] = [t for t in self.handshake_rate_limit[ip] if now - t < 60]
            if not self.handshake_rate_limit[ip]:
                del self.handshake_rate_limit[ip]

    def check_handshake_rate_limit(self, client_ip: str):
        """Enforces max 20 handshakes per minute per IP."""
        now = time.time()
        times = self.handshake_rate_limit.setdefault(client_ip, [])
        times = [t for t in times if now - t < 60]
        self.handshake_rate_limit[client_ip] = times
        if len(times) >= 20:
            raise PQCChannelError("Handshake rate limit exceeded. Please wait a minute.")
        times.append(now)

    def create_channel(
        self,
        key_id: str,
        kem_ciphertext_b64: str,
        client_x25519_pub_b64: str,
        client_ip: str = "127.0.0.1",
    ) -> str:
        """
        Establishes hybrid quantum-safe channel:
        1. Decapsulates ML-KEM-768 ciphertext -> ss_mlkem
        2. Diffie-Hellman on X25519 -> ss_x25519
        3. HKDF-SHA256(ss_mlkem || ss_x25519) -> (k_client_to_server, k_server_to_client)
        """
        self.prune_expired()
        self.check_handshake_rate_limit(client_ip)

        # 1. Retrieve KEM secret key
        kem_sk = self.key_manager.get_kem_sk(key_id)

        try:
            kem_ciphertext = base64.b64decode(kem_ciphertext_b64)
            client_x25519_pub = base64.b64decode(client_x25519_pub_b64)
        except Exception:
            raise PQCChannelError("Invalid base64 in handshake payload.")

        if len(kem_ciphertext) != 1088:
            raise PQCChannelError("Invalid ML-KEM-768 ciphertext length.")
        if len(client_x25519_pub) != 32:
            raise PQCChannelError("Invalid X25519 public key length.")

        # 2. Decapsulate ML-KEM
        try:
            ss_mlkem = self.provider.kem_decaps(kem_sk, kem_ciphertext)
        except Exception as e:
            logger.warning(f"KEM decapsulation failed: {e}")
            raise PQCChannelError("Decapsulation failed.")

        # 3. Compute X25519 shared secret
        try:
            peer_x25519 = x25519.X25519PublicKey.from_public_bytes(client_x25519_pub)
            ss_x25519 = self.key_manager.server_x25519_priv.exchange(peer_x25519)
        except Exception as e:
            logger.warning(f"X25519 DH exchange failed: {e}")
            raise PQCChannelError("Classical key exchange failed.")

        # 4. Transcript Hash & HKDF Derivation
        transcript_hash = hashlib.sha256(
            kem_ciphertext + client_x25519_pub + self.key_manager.server_x25519_pub
        ).digest()

        combined_secret = ss_mlkem + ss_x25519
        hkdf = HKDF(
            algorithm=hashes.SHA256(),
            length=64,
            salt=b"healthcare-copilot-salt-v1",
            info=f"healthcare-copilot-v1|{key_id}|{transcript_hash.hex()}".encode("utf-8"),
        )
        derived = hkdf.derive(combined_secret)
        k_client_to_server = derived[:32]
        k_server_to_client = derived[32:64]

        # 5. Create Channel Instance
        channel_id = hashlib.sha256(os.urandom(32)).hexdigest()
        channel = PQCChannel(channel_id, k_client_to_server, k_server_to_client)
        self.channels[channel_id] = channel

        logger.info(f"PQC channel established: {channel_id[:12]} (Provider: {self.provider.name})")
        return channel_id

    def get_channel(self, channel_id: Optional[str]) -> Optional[PQCChannel]:
        if not channel_id:
            return None
        self.prune_expired()
        ch = self.channels.get(channel_id)
        if ch and not ch.is_expired():
            return ch
        return None

    # ---------- Session Binding & In-Memory Encryption ----------
    def save_session_encrypted(self, session_id: str, channel_id: str, session_data: Dict[str, Any]):
        """
        Binds session_id to channel_id.
        Encrypts session_data in memory with a per-session random AES-256 key,
        which is itself wrapped with the channel's data key.
        """
        ch = self.get_channel(channel_id)
        if not ch:
            raise PQCChannelError("Cannot bind session: Invalid or expired channel.")

        # Per-session random AES-256 key
        k_session = os.urandom(32)
        iv_data = os.urandom(12)
        plain_bytes = json.dumps(session_data).encode("utf-8")

        # Encrypt session data
        aes_data = AESGCM(k_session)
        enc_blob = aes_data.encrypt(iv_data, plain_bytes, session_id.encode("utf-8"))

        # Wrap per-session key with channel data key
        iv_wrap = os.urandom(12)
        aes_wrap = AESGCM(ch.channel_data_key)
        wrapped_key = aes_wrap.encrypt(iv_wrap, k_session, session_id.encode("utf-8"))

        self.encrypted_sessions[session_id] = {
            "channel_id": channel_id,
            "iv_data": iv_data,
            "enc_blob": enc_blob,
            "iv_wrap": iv_wrap,
            "wrapped_key": wrapped_key,
            "expires_at": time.time() + 7200,  # 2 hours
        }

    def load_session_decrypted(self, session_id: str, channel_id: str) -> Dict[str, Any]:
        """
        Enforces Session Binding:
        Verifies that the channel_id matches the owner of the session.
        Decrypts in-memory data for use in request handler.
        """
        self.prune_expired()
        sess_entry = self.encrypted_sessions.get(session_id)
        if not sess_entry:
            raise KeyError("Session expired or not found.")

        # Strict session-to-channel binding validation
        owner_channel = sess_entry.get("channel_id")
        if not hmac.compare_digest(owner_channel, channel_id):
            logger.warning(
                f"Unauthorized cross-channel access attempt: Channel {channel_id[:8]} tried to read session {session_id[:8]} owned by {owner_channel[:8]}"
            )
            raise SessionAccessDeniedError("Access denied: Session belongs to another secure channel.")

        ch = self.get_channel(channel_id)
        if not ch:
            raise PQCChannelError("Channel expired.")

        # Unwrap session key
        aes_wrap = AESGCM(ch.channel_data_key)
        k_session = aes_wrap.decrypt(sess_entry["iv_wrap"], sess_entry["wrapped_key"], session_id.encode("utf-8"))

        # Decrypt session data
        aes_data = AESGCM(k_session)
        plain_bytes = aes_data.decrypt(sess_entry["iv_data"], sess_entry["enc_blob"], session_id.encode("utf-8"))

        return json.loads(plain_bytes.decode("utf-8"))

    def wipe_session(self, session_id: str):
        """Immediately removes and wipes session from memory."""
        if session_id in self.encrypted_sessions:
            del self.encrypted_sessions[session_id]
            logger.info(f"Session {session_id[:8]} wiped from encrypted memory.")

    # ---------- ML-DSA-65 Result Integrity Signing ----------
    def sign_result(self, session_id: str, data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Signs clinical result payload with server ML-DSA-65 key.
        Returns signature bundle for client badge verification and offline verification.
        """
        canonical_json = json.dumps(data, sort_keys=True, separators=(",", ":")).encode("utf-8")
        data_digest = hashlib.sha256(canonical_json).hexdigest()
        timestamp = datetime.now(timezone.utc).isoformat()

        # Binding signature covers session_id + timestamp + data_digest
        commitment = f"HC-VERIFY-V1|{session_id}|{timestamp}|{data_digest}".encode("utf-8")
        sig = self.provider.sign(self.key_manager.sig_sk, commitment)

        return {
            "signature": base64.b64encode(sig).decode("ascii"),
            "sig_alg": self.provider.sig_alg,
            "signer_fingerprint": self.key_manager.signing_fingerprint,
            "timestamp": timestamp,
            "data_digest": data_digest,
            "session_id": session_id,
        }
