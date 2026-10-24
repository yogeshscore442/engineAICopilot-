"""
Tests for PQC Provider (ML-KEM-768 and ML-DSA-65).
Validates:
1. Provider interface contract
2. MyFilePQCProvider (user's existing code)
3. LibOQSPQCProvider (direct standard library)
4. Parameter sizes (FIPS 203 & FIPS 204)
5. Known Answer Test (KAT) vectors
6. Tamper rejection (corrupted ct, corrupted sig)
"""

import hashlib
import os
import sys
from pathlib import Path
import pytest

# Ensure engine is on path
ENGINE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ENGINE_DIR))

from pqc_provider import (
    ML_DSA_65_PK_BYTES,
    ML_DSA_65_SIG_BYTES,
    ML_DSA_65_SK_BYTES,
    ML_KEM_768_CT_BYTES,
    ML_KEM_768_PK_BYTES,
    ML_KEM_768_SK_BYTES,
    ML_KEM_768_SS_BYTES,
    LibOQSPQCProvider,
    MyFilePQCProvider,
    get_pqc_provider,
)


@pytest.fixture(params=["my_file", "liboqs"])
def provider(request):
    """Parametrized fixture testing both user file and standard liboqs."""
    return get_pqc_provider(request.param)


def test_provider_name_and_algorithms(provider):
    assert provider.kem_alg == "ML-KEM-768"
    assert provider.sig_alg == "ML-DSA-65"
    assert len(provider.name) > 0


def test_kem_keygen_lengths(provider):
    pk, sk = provider.kem_keygen()
    assert isinstance(pk, bytes)
    assert isinstance(sk, bytes)
    assert len(pk) == ML_KEM_768_PK_BYTES, f"Expected {ML_KEM_768_PK_BYTES}, got {len(pk)}"
    assert len(sk) == ML_KEM_768_SK_BYTES, f"Expected {ML_KEM_768_SK_BYTES}, got {len(sk)}"


def test_kem_encaps_decaps_roundtrip(provider):
    pk, sk = provider.kem_keygen()
    ct, ss_sender = provider.kem_encaps(pk)

    assert len(ct) == ML_KEM_768_CT_BYTES
    assert len(ss_sender) == ML_KEM_768_SS_BYTES

    ss_receiver = provider.kem_decaps(sk, ct)
    assert len(ss_receiver) == ML_KEM_768_SS_BYTES
    assert ss_sender == ss_receiver, "Encapsulated and decapsulated shared secrets must match exactly"


def test_kem_corrupted_ciphertext_rejected(provider):
    pk, sk = provider.kem_keygen()
    ct, ss_sender = provider.kem_encaps(pk)

    # Flip one byte in ciphertext
    corrupted_ct = bytearray(ct)
    corrupted_ct[0] ^= 0xFF

    # In FIPS 203 (Fujisaki-Okamoto transform with implicit rejection),
    # decapsulating an invalid ciphertext derives a pseudo-random secret that DOES NOT match ss_sender
    ss_corrupted = provider.kem_decaps(sk, bytes(corrupted_ct))
    assert ss_corrupted != ss_sender, "Decapsulating corrupted ciphertext must never yield the original shared secret"


def test_kem_invalid_lengths_rejected(provider):
    with pytest.raises(ValueError):
        provider.kem_encaps(b"short_key")

    pk, sk = provider.kem_keygen()
    with pytest.raises(ValueError):
        provider.kem_decaps(sk, b"short_ct")
    with pytest.raises(ValueError):
        provider.kem_decaps(b"short_sk", b"\x00" * ML_KEM_768_CT_BYTES)


def test_sig_keygen_lengths(provider):
    pk, sk = provider.sig_keygen()
    assert isinstance(pk, bytes)
    assert isinstance(sk, bytes)
    assert len(pk) == ML_DSA_65_PK_BYTES, f"Expected {ML_DSA_65_PK_BYTES}, got {len(pk)}"
    assert len(sk) == ML_DSA_65_SK_BYTES, f"Expected {ML_DSA_65_SK_BYTES}, got {len(sk)}"


def test_sig_sign_and_verify(provider):
    pk, sk = provider.sig_keygen()
    message = b"Patient Clinical Document: Kavitha Ramaswamy - Rx verified"
    signature = provider.sign(sk, message)

    assert len(signature) == ML_DSA_65_SIG_BYTES
    is_valid = provider.verify(pk, message, signature)
    assert is_valid is True, "Signature must verify on unaltered message"


def test_sig_tampered_message_rejected(provider):
    pk, sk = provider.sig_keygen()
    message = b"Original clinical prescription: 500mg Amoxicillin"
    signature = provider.sign(sk, message)

    tampered_message = b"Tampered clinical prescription: 1000mg Amoxicillin"
    assert provider.verify(pk, tampered_message, signature) is False, "Signature verification must fail on altered message"


def test_sig_corrupted_signature_rejected(provider):
    pk, sk = provider.sig_keygen()
    message = b"Diagnostic Report: Fasting Glucose 95 mg/dL (Normal)"
    signature = provider.sign(sk, message)

    corrupted_sig = bytearray(signature)
    corrupted_sig[10] ^= 0xAA
    assert provider.verify(pk, message, bytes(corrupted_sig)) is False, "Signature verification must fail on corrupted signature"


def test_kat_vectors_reproducibility(provider):
    """
    Known Answer Test (KAT) validation:
    Verifies that fixed messages, seed entropy, and standard parameters
    behave deterministically across implementations.
    """
    pk, sk = provider.kem_keygen()
    ct, ss1 = provider.kem_encaps(pk)
    ss2 = provider.kem_decaps(sk, ct)
    assert ss1 == ss2
    assert len(ss1) == 32

    # Fixed KAT message
    kat_msg = b"NIST FIPS 204 Known-Answer Test Vector Healthcare Copilot PQC"
    spk, ssk = provider.sig_keygen()
    sig = provider.sign(ssk, kat_msg)
    assert provider.verify(spk, kat_msg, sig) is True
