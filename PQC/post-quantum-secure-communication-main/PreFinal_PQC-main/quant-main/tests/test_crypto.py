import os
import sys
import unittest

# Ensure the project root is in the python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

# Configure OQS DLL path environment variables before importing
OQS_BIN_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '../app/crypto/bin'))
os.environ["OQS_INSTALL_PATH"] = os.path.abspath(os.path.join(os.path.dirname(__file__), '../app/crypto'))
os.environ["PATH"] = OQS_BIN_DIR + os.pathsep + os.environ.get("PATH", "")

from app.crypto.symmetric import (
    encrypt_aes_gcm, decrypt_aes_gcm, encrypt_chacha20_poly1305, decrypt_chacha20_poly1305,
    sha3_256_hash, sha3_384_hash, sha3_512_hash, shake_256_hash,
    encrypt_ascon_128a, decrypt_ascon_128a, generate_file_encryption_key
)
from app.crypto.classical import (
    generate_rsa_keys, rsa_encrypt_session_key, rsa_decrypt_session_key,
    rsa_sign, rsa_verify
)
from app.crypto.x25519_curve import generate_x25519_keypair, x25519_exchange
from app.crypto.pqc import (
    generate_pqc_kem_keypair, pqc_kem_encapsulate, pqc_kem_decapsulate,
    generate_pqc_sig_keypair, pqc_sig_sign, pqc_sig_verify,
    generate_slh_dsa_keypair, slh_dsa_sign, slh_dsa_verify
)
from app.crypto.hybrid import (
    hybrid_x25519_mlkem_encapsulate, hybrid_x25519_mlkem_decapsulate,
    hybrid_encapsulate, hybrid_decapsulate, derive_hybrid_key
)
from app.crypto.key_derivation import derive_hkdf_key

class TestCryptographyEngine(unittest.TestCase):

    def test_aes_gcm_symmetric(self):
        """Test AES-256-GCM encryption, decryption, and integrity tag check."""
        key = os.urandom(32)
        plaintext = b"Highly confidential quantum secure message."
        assoc_data = b"metadata-context-binding-123"
        
        ciphertext_b64, iv_b64, tag_b64 = encrypt_aes_gcm(key, plaintext, assoc_data)
        decrypted = decrypt_aes_gcm(key, ciphertext_b64, iv_b64, tag_b64, assoc_data)
        self.assertEqual(decrypted, plaintext)
        
        import base64
        corrupted = bytearray(base64.b64decode(ciphertext_b64))
        corrupted[0] ^= 0xFF
        with self.assertRaises(Exception):
            decrypt_aes_gcm(key, base64.b64encode(corrupted).decode('utf-8'), iv_b64, tag_b64, assoc_data)

    def test_chacha20_poly1305(self):
        """Test ChaCha20-Poly1305 AEAD cipher."""
        key = os.urandom(32)
        plaintext = b"Alternative AEAD cipher payload test."
        c, n, t = encrypt_chacha20_poly1305(key, plaintext, b"chacha-context")
        dec = decrypt_chacha20_poly1305(key, c, n, t, b"chacha-context")
        self.assertEqual(dec, plaintext)

    def test_sha3_and_hkdf(self):
        """Test SHA3-256, SHA3-384, and HKDF-SHA-384 key derivation."""
        data = b"Hash integrity and KDF derivation input."
        h256 = sha3_256_hash(data)
        h384 = sha3_384_hash(data)
        self.assertEqual(len(h256), 64)
        self.assertEqual(len(h384), 96)
        
        derived_key = derive_hkdf_key(data, length=32, info=b"hkdf-test")
        self.assertEqual(len(derived_key), 32)

    def test_x25519(self):
        """Test X25519 Diffie-Hellman key exchange."""
        alice_priv, alice_pub = generate_x25519_keypair()
        bob_priv, bob_pub = generate_x25519_keypair()
        
        secret_alice = x25519_exchange(alice_priv, bob_pub)
        secret_bob = x25519_exchange(bob_priv, alice_pub)
        self.assertEqual(secret_alice, secret_bob)

    def test_rsa_classical(self):
        """Test RSA-2048 key exchange (OAEP) and signatures (PSS)."""
        priv_pem, pub_pem = generate_rsa_keys()
        ciphertext, secret_sender = rsa_encrypt_session_key(pub_pem)
        secret_receiver = rsa_decrypt_session_key(priv_pem, ciphertext)
        self.assertEqual(secret_sender, secret_receiver)
        
        signature = rsa_sign(priv_pem, b"audit payload")
        self.assertTrue(rsa_verify(pub_pem, b"audit payload", signature))

    def test_pqc_oqs_ml_kem_and_dsa(self):
        """Test ML-KEM-768 and ML-DSA-65 wrappers using liboqs."""
        kem_pub, kem_priv = generate_pqc_kem_keypair()
        kem_cipher, secret_sender = pqc_kem_encapsulate(kem_pub)
        secret_receiver = pqc_kem_decapsulate(kem_cipher, kem_priv)
        self.assertEqual(secret_sender, secret_receiver)
        
        sig_pub, sig_priv = generate_pqc_sig_keypair()
        signature = pqc_sig_sign(sig_priv, b"PQC message")
        self.assertTrue(pqc_sig_verify(sig_pub, b"PQC message", signature))

    def test_slh_dsa(self):
        """Test SLH-DSA (Sphincs+) signatures."""
        slh_pub, slh_priv = generate_slh_dsa_keypair()
        sig = slh_dsa_sign(slh_priv, b"Stateless hash signature test")
        self.assertTrue(slh_dsa_verify(slh_pub, b"Stateless hash signature test", sig))

    def test_hybrid_x25519_mlkem(self):
        """Test standards-aligned X25519 + ML-KEM-768 Hybrid key exchange."""
        alice_x_priv, alice_x_pub = generate_x25519_keypair()
        bob_x_priv, bob_x_pub = generate_x25519_keypair()
        bob_kem_pub, bob_kem_priv = generate_pqc_kem_keypair()
        
        kem_cipher, alice_key = hybrid_x25519_mlkem_encapsulate(alice_x_priv, bob_x_pub, bob_kem_pub)
        bob_key = hybrid_x25519_mlkem_decapsulate(bob_x_priv, alice_x_pub, kem_cipher, bob_kem_priv)
        self.assertEqual(alice_key, bob_key)

    def test_nist_security_levels(self):
        """Test ML-KEM and ML-DSA across NIST Levels 1, 3, and 5."""
        levels = [
            (1, "ML-KEM-512", "ML-DSA-44"),
            (3, "ML-KEM-768", "ML-DSA-65"),
            (5, "ML-KEM-1024", "ML-DSA-87"),
        ]
        for level, kem_name, sig_name in levels:
            # Test KEM for this level
            pub, priv = generate_pqc_kem_keypair(alg=kem_name)
            cipher, sec_enc = pqc_kem_encapsulate(pub, alg=kem_name)
            sec_dec = pqc_kem_decapsulate(cipher, priv, alg=kem_name)
            self.assertEqual(sec_enc, sec_dec, f"KEM failed for {kem_name}")

            # Test Hybrid for this level
            a_x_priv, a_x_pub = generate_x25519_keypair()
            b_x_priv, b_x_pub = generate_x25519_keypair()
            b_k_pub, b_k_priv = generate_pqc_kem_keypair(alg=kem_name)
            h_cipher, a_k = hybrid_x25519_mlkem_encapsulate(a_x_priv, b_x_pub, b_k_pub, kem_alg=kem_name)
            b_k = hybrid_x25519_mlkem_decapsulate(b_x_priv, a_x_pub, h_cipher, b_k_priv, kem_alg=kem_name)
            self.assertEqual(a_k, b_k, f"Hybrid failed for {kem_name}")

            # Test Signature for this level
            s_pub, s_priv = generate_pqc_sig_keypair(alg=sig_name)
            sig = pqc_sig_sign(s_priv, b"NIST Level test message", alg=sig_name)
            self.assertTrue(pqc_sig_verify(s_pub, b"NIST Level test message", sig, alg=sig_name))

    def test_ascon_128a(self):
        """Test Ascon-128a AEAD encryption, decryption, and integrity verification."""
        key = os.urandom(16)
        plaintext = b"Ascon-128a lightweight IoT authenticated payload."
        ad = b"header-metadata-999"

        c_b64, n_b64, t_b64 = encrypt_ascon_128a(key, plaintext, ad)
        decrypted = decrypt_ascon_128a(key, c_b64, n_b64, t_b64, ad)
        self.assertEqual(decrypted, plaintext)

        # Tampering check
        import base64
        corrupted = bytearray(base64.b64decode(c_b64))
        corrupted[0] ^= 0x01
        corrupted_b64 = base64.b64encode(corrupted).decode('utf-8')
        with self.assertRaises(Exception):
            decrypt_ascon_128a(key, corrupted_b64, n_b64, t_b64, ad)

    def test_sha3_512_and_shake256(self):
        """Test SHA3-512 and SHAKE-256 quantum-proof integrity hash engines."""
        data = b"Post-quantum 512-bit integrity payload."
        h512 = sha3_512_hash(data)
        self.assertEqual(len(h512), 128) # 512 bits = 128 hex chars

        shake = shake_256_hash(data, length=64)
        self.assertEqual(len(shake), 128) # 64 bytes = 128 hex chars

if __name__ == '__main__':
    unittest.main()
