from cryptography.hazmat.primitives.kdf.hkdf import HKDF
from cryptography.hazmat.primitives import hashes

def derive_hkdf_key(secret_material: bytes, length: int = 32, info: bytes = b"pqc-secure-platform-hkdf-v1", salt: bytes = None) -> bytes:
    """
    Derives a symmetric key using HKDF-SHA-384.
    Defaults to 32 bytes (256-bit) output key length.
    """
    hkdf = HKDF(
        algorithm=hashes.SHA384(),
        length=length,
        salt=salt,
        info=info,
    )
    return hkdf.derive(secret_material)
