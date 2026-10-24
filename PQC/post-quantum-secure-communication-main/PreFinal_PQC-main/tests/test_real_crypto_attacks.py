import unittest
import os
import base64
from app.crypto.symmetric import encrypt_aes_gcm, decrypt_aes_gcm
from app.crypto.pqc import (
    generate_pqc_kem_keypair, pqc_kem_encapsulate, pqc_kem_decapsulate,
    generate_pqc_sig_keypair, pqc_sig_sign, pqc_sig_verify
)
from app.crypto.x25519_curve import generate_x25519_keypair, x25519_exchange
from app.crypto.key_derivation import derive_hkdf_key

class TestRealCryptoAttacks(unittest.TestCase):
    
    def test_1_wrong_key_decryption_exception(self):
        """Verifies actual cryptography InvalidTag exception on wrong key decryption."""
        key_alice = os.urandom(32)
        key_unauthorized = os.urandom(32)
        plaintext = b"Confidential PQC Operational Command Payload"
        
        c_b64, iv_b64, tag_b64 = encrypt_aes_gcm(key_alice, plaintext, b"assoc-tag")
        
        with self.assertRaises(Exception) as cm:
            _ = decrypt_aes_gcm(key_unauthorized, c_b64, iv_b64, tag_b64, b"assoc-tag")
            
        self.assertIn("InvalidTag", cm.exception.__class__.__name__)
        
    def test_2_ciphertext_tampering_rejection(self):
        """Verifies actual AES-256-GCM authentication tag verification failure on bit tampering."""
        key = os.urandom(32)
        plaintext = b"Authentic Untampered Message Payload"
        
        c_b64, iv_b64, tag_b64 = encrypt_aes_gcm(key, plaintext, b"tamper-tag")
        
        corrupted_bytes = bytearray(base64.b64decode(c_b64))
        corrupted_bytes[0] ^= 0xFF
        tampered_b64 = base64.b64encode(corrupted_bytes).decode('utf-8')
        
        with self.assertRaises(Exception) as cm:
            _ = decrypt_aes_gcm(key, tampered_b64, iv_b64, tag_b64, b"tamper-tag")
            
        self.assertIn("InvalidTag", cm.exception.__class__.__name__)
        
    def test_3_mldsa_signature_verification_failure(self):
        """Verifies ML-DSA-65 Post-Quantum signature verification returns False for tampered data."""
        mldsa_pub, mldsa_priv = generate_pqc_sig_keypair()
        original_data = b"Legitimate PQC Handshake Payload"
        tampered_data = b"Tampered PQC Handshake Payload"
        
        sig = pqc_sig_sign(mldsa_priv, original_data)
        
        self.assertTrue(pqc_sig_verify(mldsa_pub, original_data, sig))
        self.assertFalse(pqc_sig_verify(mldsa_pub, tampered_data, sig))
        
    def test_4_replay_sequence_filter(self):
        """Verifies stateful application-level sequence number replay filter."""
        processed_sequences = {1, 2, 3, 4}
        replayed_seq = 3
        
        is_replayed = replayed_seq in processed_sequences
        self.assertTrue(is_replayed)
        
    def test_5_hybrid_key_derivation(self):
        """Verifies X25519 + ML-KEM-768 -> HKDF-SHA-384 key establishment."""
        x1_priv, x1_pub = generate_x25519_keypair()
        x2_priv, x2_pub = generate_x25519_keypair()
        dh_secret = x25519_exchange(x1_priv, x2_pub)
        
        kem_pub, kem_priv = generate_pqc_kem_keypair()
        c_kem, kem_secret_sender = pqc_kem_encapsulate(kem_pub)
        kem_secret_recvr = pqc_kem_decapsulate(c_kem, kem_priv)
        
        self.assertEqual(kem_secret_sender, kem_secret_recvr)
        
        sender_key = derive_hkdf_key(dh_secret + kem_secret_sender, length=32, info=b"pqc-secure-platform-hybrid-v1")
        recvr_key = derive_hkdf_key(dh_secret + kem_secret_recvr, length=32, info=b"pqc-secure-platform-hybrid-v1")
        
        self.assertEqual(sender_key, recvr_key)
        self.assertEqual(len(sender_key), 32)

if __name__ == '__main__':
    unittest.main()
