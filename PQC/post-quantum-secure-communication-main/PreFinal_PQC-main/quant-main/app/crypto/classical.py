import os
from cryptography.hazmat.primitives.asymmetric import rsa, padding
from cryptography.hazmat.primitives import serialization, hashes

def generate_rsa_keys() -> tuple[bytes, bytes]:
    """
    Generates a 2048-bit RSA private and public key pair.
    Returns (private_pem, public_pem) in PEM bytes format.
    """
    private_key = rsa.generate_private_key(
        public_exponent=65537,
        key_size=2048
    )
    
    private_pem = private_key.private_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PrivateFormat.PKCS8,
        encryption_algorithm=serialization.NoEncryption()
    )
    
    public_pem = private_key.public_key().public_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PublicFormat.SubjectPublicKeyInfo
    )
    
    return private_pem, public_pem

def rsa_encrypt_session_key(public_pem: bytes) -> tuple[bytes, bytes]:
    """
    Encrypts/encapsulates a new random 256-bit session key using RSA-OAEP.
    Returns (ciphertext, session_key).
    """
    public_key = serialization.load_pem_public_key(public_pem)
    session_key = os.urandom(32)  # Generate 32 bytes (256-bit)
    
    ciphertext = public_key.encrypt(
        session_key,
        padding.OAEP(
            mgf=padding.MGF1(algorithm=hashes.SHA256()),
            algorithm=hashes.SHA256(),
            label=None
        )
    )
    return ciphertext, session_key

def rsa_decrypt_session_key(private_pem: bytes, ciphertext: bytes) -> bytes:
    """
    Decrypts/decapsulates a session key using RSA-OAEP.
    Returns the session key.
    """
    private_key = serialization.load_pem_private_key(private_pem, password=None)
    
    session_key = private_key.decrypt(
        ciphertext,
        padding.OAEP(
            mgf=padding.MGF1(algorithm=hashes.SHA256()),
            algorithm=hashes.SHA256(),
            label=None
        )
    )
    return session_key

def rsa_sign(private_pem: bytes, data: bytes) -> bytes:
    """
    Signs data using RSA-PSS.
    Returns signature bytes.
    """
    private_key = serialization.load_pem_private_key(private_pem, password=None)
    
    signature = private_key.sign(
        data,
        padding.PSS(
            mgf=padding.MGF1(hashes.SHA256()),
            salt_length=padding.PSS.MAX_LENGTH
        ),
        hashes.SHA256()
    )
    return signature

def rsa_verify(public_pem: bytes, data: bytes, signature: bytes) -> bool:
    """
    Verifies an RSA-PSS signature.
    Returns True if valid, False otherwise.
    """
    try:
        public_key = serialization.load_pem_public_key(public_pem)
        public_key.verify(
            signature,
            data,
            padding.PSS(
                mgf=padding.MGF1(hashes.SHA256()),
                salt_length=padding.PSS.MAX_LENGTH
            ),
            hashes.SHA256()
        )
        return True
    except Exception:
        return False
