import oqs

# Algorithms specified in requirements
KEM_ALG = "ML-KEM-768"
SIG_ALG = "ML-DSA-65"
SLH_DSA_ALG = "SLH_DSA_PURE_SHA2_128S"

NIST_KEM_LEVELS = {
    1: "ML-KEM-512",
    3: "ML-KEM-768",
    5: "ML-KEM-1024",
    "1": "ML-KEM-512",
    "3": "ML-KEM-768",
    "5": "ML-KEM-1024",
    "level1": "ML-KEM-512",
    "level3": "ML-KEM-768",
    "level5": "ML-KEM-1024",
    "ML-KEM-512": "ML-KEM-512",
    "ML-KEM-768": "ML-KEM-768",
    "ML-KEM-1024": "ML-KEM-1024"
}

NIST_SIG_LEVELS = {
    1: "ML-DSA-44",
    3: "ML-DSA-65",
    5: "ML-DSA-87",
    "1": "ML-DSA-44",
    "3": "ML-DSA-65",
    "5": "ML-DSA-87",
    "level1": "ML-DSA-44",
    "level3": "ML-DSA-65",
    "level5": "ML-DSA-87",
    "ML-DSA-44": "ML-DSA-44",
    "ML-DSA-65": "ML-DSA-65",
    "ML-DSA-87": "ML-DSA-87"
}

def resolve_kem_alg(alg_or_level=None) -> str:
    """Resolves NIST level or algorithm name to valid KEM algorithm string."""
    if alg_or_level is None:
        return KEM_ALG
    return NIST_KEM_LEVELS.get(alg_or_level, str(alg_or_level))

def resolve_sig_alg(alg_or_level=None) -> str:
    """Resolves NIST level or algorithm name to valid Signature algorithm string."""
    if alg_or_level is None:
        return SIG_ALG
    return NIST_SIG_LEVELS.get(alg_or_level, str(alg_or_level))

def generate_pqc_kem_keypair(alg: str = None) -> tuple[bytes, bytes]:
    """
    Generates an ML-KEM key pair (Level 1: 512, Level 3: 768, Level 5: 1024).
    Returns (public_key_bytes, secret_key_bytes).
    """
    target_alg = resolve_kem_alg(alg)
    with oqs.KeyEncapsulation(target_alg) as kem:
        public_key = kem.generate_keypair()
        secret_key = bytes(kem.secret_key)
        return public_key, secret_key

def pqc_kem_encapsulate(public_key: bytes, alg: str = None) -> tuple[bytes, bytes]:
    """
    Encapsulates a shared secret using the recipient's ML-KEM public key.
    Returns (ciphertext_bytes, shared_secret_bytes).
    """
    target_alg = resolve_kem_alg(alg)
    with oqs.KeyEncapsulation(target_alg) as kem:
        ciphertext, shared_secret = kem.encap_secret(public_key)
        return ciphertext, shared_secret

def pqc_kem_decapsulate(ciphertext: bytes, secret_key: bytes, alg: str = None) -> bytes:
    """
    Decapsulates the ciphertext using the recipient's ML-KEM secret key.
    Returns shared_secret_bytes.
    """
    target_alg = resolve_kem_alg(alg)
    with oqs.KeyEncapsulation(target_alg, secret_key=secret_key) as kem:
        shared_secret = kem.decap_secret(ciphertext)
        return shared_secret

def generate_pqc_sig_keypair(alg: str = None) -> tuple[bytes, bytes]:
    """
    Generates an ML-DSA key pair (Level 1: 44, Level 3: 65, Level 5: 87).
    Returns (public_key_bytes, secret_key_bytes).
    """
    target_alg = resolve_sig_alg(alg)
    with oqs.Signature(target_alg) as sig:
        public_key = sig.generate_keypair()
        secret_key = bytes(sig.secret_key)
        return public_key, secret_key

def pqc_sig_sign(secret_key: bytes, message: bytes, alg: str = None) -> bytes:
    """
    Signs a message using the sender's ML-DSA secret key.
    Returns signature bytes.
    """
    target_alg = resolve_sig_alg(alg)
    with oqs.Signature(target_alg, secret_key=secret_key) as sig:
        signature = sig.sign(message)
        return signature

def pqc_sig_verify(public_key: bytes, message: bytes, signature: bytes, alg: str = None) -> bool:
    """
    Verifies an ML-DSA signature.
    Returns True if valid, False otherwise.
    """
    target_alg = resolve_sig_alg(alg)
    try:
        with oqs.Signature(target_alg) as sig:
            return sig.verify(message, signature, public_key)
    except Exception:
        return False

def generate_slh_dsa_keypair() -> tuple[bytes, bytes]:
    """
    Generates an SLH-DSA (Sphincs+) key pair.
    Returns (public_key_bytes, secret_key_bytes).
    """
    with oqs.Signature(SLH_DSA_ALG) as sig:
        public_key = sig.generate_keypair()
        secret_key = bytes(sig.secret_key)
        return public_key, secret_key

def slh_dsa_sign(secret_key: bytes, message: bytes) -> bytes:
    """
    Signs a message using SLH-DSA secret key.
    """
    with oqs.Signature(SLH_DSA_ALG, secret_key=secret_key) as sig:
        return sig.sign(message)

def slh_dsa_verify(public_key: bytes, message: bytes, signature: bytes) -> bool:
    """
    Verifies an SLH-DSA signature.
    """
    try:
        with oqs.Signature(SLH_DSA_ALG) as sig:
            return sig.verify(message, signature, public_key)
    except Exception:
        return False

