from app.crypto.x25519_curve import x25519_exchange
from app.crypto.pqc import pqc_kem_encapsulate, pqc_kem_decapsulate
from app.crypto.classical import rsa_encrypt_session_key, rsa_decrypt_session_key
from app.crypto.key_derivation import derive_hkdf_key

def derive_hybrid_key(classical_secret: bytes, pqc_secret: bytes) -> bytes:
    """
    Combines classical secret (X25519 or RSA) and PQC ML-KEM-768 secret using HKDF-SHA-384.
    Returns a 32-byte (256-bit) shared symmetric key.
    """
    combined_secrets = classical_secret + pqc_secret
    return derive_hkdf_key(combined_secrets, length=32, info=b"pqc-secure-platform-hybrid-v1")

def hybrid_x25519_mlkem_encapsulate(
    ephemeral_x25519_priv: bytes,
    peer_x25519_pub: bytes,
    peer_kem_pub: bytes,
    kem_alg: str = None
) -> tuple[bytes, bytes]:
    """
    Standards-aligned Hybrid Key Establishment:
    1. Classical X25519 ECDH exchange -> classical_secret
    2. Post-Quantum ML-KEM encapsulation (Level 1, 3, or 5) -> (kem_ciphertext, kem_secret)
    3. HKDF-SHA-384(classical_secret + kem_secret) -> symmetric_key
    Returns (kem_ciphertext, derived_symmetric_key).
    """
    x25519_secret = x25519_exchange(ephemeral_x25519_priv, peer_x25519_pub)
    kem_ciphertext, kem_secret = pqc_kem_encapsulate(peer_kem_pub, alg=kem_alg)
    derived_key = derive_hybrid_key(x25519_secret, kem_secret)
    return kem_ciphertext, derived_key

def hybrid_x25519_mlkem_decapsulate(
    ephemeral_x25519_priv: bytes,
    peer_x25519_pub: bytes,
    kem_ciphertext: bytes,
    kem_secret_key: bytes,
    kem_alg: str = None
) -> bytes:
    """
    Standards-aligned Hybrid Key Decapsulation:
    1. Classical X25519 ECDH exchange -> classical_secret
    2. Post-Quantum ML-KEM decapsulation (Level 1, 3, or 5) -> kem_secret
    3. HKDF-SHA-384(classical_secret + kem_secret) -> symmetric_key
    Returns derived_symmetric_key.
    """
    x25519_secret = x25519_exchange(ephemeral_x25519_priv, peer_x25519_pub)
    kem_secret = pqc_kem_decapsulate(kem_ciphertext, kem_secret_key, alg=kem_alg)
    return derive_hybrid_key(x25519_secret, kem_secret)

def hybrid_encapsulate(rsa_public_pem: bytes, kem_public_key: bytes) -> tuple[bytes, bytes, bytes]:
    """Legacy RSA + ML-KEM encapsulation helper for RSA mode compatibility."""
    rsa_ciphertext, rsa_secret = rsa_encrypt_session_key(rsa_public_pem)
    kem_ciphertext, kem_secret = pqc_kem_encapsulate(kem_public_key)
    derived_key = derive_hybrid_key(rsa_secret, kem_secret)
    return rsa_ciphertext, kem_ciphertext, derived_key

def hybrid_decapsulate(
    rsa_ciphertext: bytes, 
    rsa_private_pem: bytes, 
    kem_ciphertext: bytes, 
    kem_secret_key: bytes
) -> bytes:
    """Legacy RSA + ML-KEM decapsulation helper for RSA mode compatibility."""
    rsa_secret = rsa_decrypt_session_key(rsa_private_pem, rsa_ciphertext)
    kem_secret = pqc_kem_decapsulate(kem_ciphertext, kem_secret_key)
    return derive_hybrid_key(rsa_secret, kem_secret)

