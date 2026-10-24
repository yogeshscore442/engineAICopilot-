from cryptography.hazmat.primitives.asymmetric import x25519
from cryptography.hazmat.primitives import serialization

def generate_x25519_keypair() -> tuple[bytes, bytes]:
    """
    Generates an X25519 private and public key pair.
    Returns (private_raw_bytes, public_raw_bytes).
    """
    private_key = x25519.X25519PrivateKey.generate()
    public_key = private_key.public_key()
    
    private_bytes = private_key.private_bytes(
        encoding=serialization.Encoding.Raw,
        format=serialization.PrivateFormat.Raw,
        encryption_algorithm=serialization.NoEncryption()
    )
    public_bytes = public_key.public_bytes(
        encoding=serialization.Encoding.Raw,
        format=serialization.PublicFormat.Raw
    )
    return private_bytes, public_bytes

def x25519_exchange(private_key_bytes: bytes, peer_public_key_bytes: bytes) -> bytes:
    """
    Performs X25519 Diffie-Hellman scalar multiplication with a peer's public key.
    Returns 32-byte shared secret.
    """
    private_key = x25519.X25519PrivateKey.from_private_bytes(private_key_bytes)
    peer_public_key = x25519.X25519PublicKey.from_public_bytes(peer_public_key_bytes)
    shared_secret = private_key.exchange(peer_public_key)
    return shared_secret
