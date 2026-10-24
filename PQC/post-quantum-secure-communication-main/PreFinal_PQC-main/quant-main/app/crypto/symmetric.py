import base64
import os
from cryptography.hazmat.primitives.ciphers.aead import AESGCM, ChaCha20Poly1305
from cryptography.hazmat.primitives import hashes

def generate_file_encryption_key() -> bytes:
    """Generates a secure 32-byte (256-bit) random key for per-file AES-GCM encryption."""
    return os.urandom(32)

def encrypt_aes_gcm(key: bytes, plaintext: bytes, associated_data: bytes = None) -> tuple[str, str, str]:
    """
    Encrypts plaintext using AES-256-GCM.
    Returns (ciphertext_b64, iv_b64, tag_b64).
    """
    if len(key) != 32:
        raise ValueError("AES-256 key must be exactly 32 bytes.")
        
    iv = os.urandom(12)  # Generates standard 12-byte IV
    aesgcm = AESGCM(key)
    
    # Encrypt returns ciphertext + 16-byte tag appended
    ciphertext_with_tag = aesgcm.encrypt(iv, plaintext, associated_data)
    
    ciphertext = ciphertext_with_tag[:-16]
    tag = ciphertext_with_tag[-16:]
    
    return (
        base64.b64encode(ciphertext).decode('utf-8'),
        base64.b64encode(iv).decode('utf-8'),
        base64.b64encode(tag).decode('utf-8')
    )

def decrypt_aes_gcm(key: bytes, ciphertext_b64: str, iv_b64: str, tag_b64: str, associated_data: bytes = None) -> bytes:
    """
    Decrypts AES-256-GCM ciphertext.
    Raises InvalidTag exception if the ciphertext or tag has been tampered with.
    """
    if len(key) != 32:
        raise ValueError("AES-256 key must be exactly 32 bytes.")
        
    ciphertext = base64.b64decode(ciphertext_b64)
    iv = base64.b64decode(iv_b64)
    tag = base64.b64decode(tag_b64)
    
    aesgcm = AESGCM(key)
    
    # Reassemble ciphertext + tag for cryptography AEAD decrypt
    ciphertext_with_tag = ciphertext + tag
    
    return aesgcm.decrypt(iv, ciphertext_with_tag, associated_data)

def encrypt_chacha20_poly1305(key: bytes, plaintext: bytes, associated_data: bytes = None) -> tuple[str, str, str]:
    """
    Encrypts plaintext using ChaCha20-Poly1305.
    Returns (ciphertext_b64, nonce_b64, tag_b64).
    """
    if len(key) != 32:
        raise ValueError("ChaCha20-Poly1305 key must be exactly 32 bytes.")
        
    nonce = os.urandom(12)
    chacha = ChaCha20Poly1305(key)
    
    ciphertext_with_tag = chacha.encrypt(nonce, plaintext, associated_data)
    ciphertext = ciphertext_with_tag[:-16]
    tag = ciphertext_with_tag[-16:]
    
    return (
        base64.b64encode(ciphertext).decode('utf-8'),
        base64.b64encode(nonce).decode('utf-8'),
        base64.b64encode(tag).decode('utf-8')
    )

def decrypt_chacha20_poly1305(key: bytes, ciphertext_b64: str, nonce_b64: str, tag_b64: str, associated_data: bytes = None) -> bytes:
    """
    Decrypts ChaCha20-Poly1305 ciphertext.
    """
    if len(key) != 32:
        raise ValueError("ChaCha20-Poly1305 key must be exactly 32 bytes.")
        
    ciphertext = base64.b64decode(ciphertext_b64)
    nonce = base64.b64decode(nonce_b64)
    tag = base64.b64decode(tag_b64)
    
    chacha = ChaCha20Poly1305(key)
    return chacha.decrypt(nonce, ciphertext + tag, associated_data)

def sha3_256_hash(data: bytes) -> str:
    """Computes SHA3-256 hex digest of data."""
    digest = hashes.Hash(hashes.SHA3_256())
    digest.update(data)
    return digest.finalize().hex()

def sha3_384_hash(data: bytes) -> str:
    """Computes SHA3-384 hex digest of data."""
    digest = hashes.Hash(hashes.SHA3_384())
    digest.update(data)
    return digest.finalize().hex()

def sha3_512_hash(data: bytes) -> str:
    """Computes SHA3-512 hex digest of data (512-bit Quantum-Proof Integrity)."""
    digest = hashes.Hash(hashes.SHA3_512())
    digest.update(data)
    return digest.finalize().hex()

def shake_256_hash(data: bytes, length: int = 64) -> str:
    """Computes SHAKE-256 extendable output hex digest (default 64 bytes = 512 bits)."""
    import hashlib
    return hashlib.shake_256(data).hexdigest(length)

def encrypt_ascon_128a(key: bytes, plaintext: bytes, associated_data: bytes = None) -> tuple[str, str, str]:
    """
    Encrypts plaintext using Ascon-128a (NIST SP 800-232 Lightweight AEAD Standard).
    Returns (ciphertext_b64, nonce_b64, tag_b64).
    """
    import ascon
    if len(key) != 16:
        raise ValueError("Ascon-128a key must be exactly 16 bytes (128 bits).")
    nonce = os.urandom(16)
    ad = associated_data or b""
    ciphertext_with_tag = ascon.encrypt(key, nonce, ad, plaintext, variant="Ascon-128a")
    ciphertext = ciphertext_with_tag[:-16]
    tag = ciphertext_with_tag[-16:]
    return (
        base64.b64encode(ciphertext).decode('utf-8'),
        base64.b64encode(nonce).decode('utf-8'),
        base64.b64encode(tag).decode('utf-8')
    )

def decrypt_ascon_128a(key: bytes, ciphertext_b64: str, nonce_b64: str, tag_b64: str, associated_data: bytes = None) -> bytes:
    """
    Decrypts Ascon-128a ciphertext and verifies 128-bit authentication tag.
    """
    import ascon
    if len(key) != 16:
        raise ValueError("Ascon-128a key must be exactly 16 bytes (128 bits).")
    ciphertext = base64.b64decode(ciphertext_b64)
    nonce = base64.b64decode(nonce_b64)
    tag = base64.b64decode(tag_b64)
    ad = associated_data or b""
    ciphertext_with_tag = ciphertext + tag
    plaintext = ascon.decrypt(key, nonce, ad, ciphertext_with_tag, variant="Ascon-128a")
    if plaintext is None:
        raise ValueError("Ascon-128a authentication tag verification failed. Ciphertext or tag tampered.")
    return plaintext

