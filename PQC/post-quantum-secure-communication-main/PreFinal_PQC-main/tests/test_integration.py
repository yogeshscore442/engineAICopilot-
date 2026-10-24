import os
import sys
import unittest
import io

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app import create_app, db
from app.models import User, Email, Attachment, AuditLog

class TestPlatformIntegration(unittest.TestCase):

    def setUp(self):
        self.app = create_app({
            'SQLALCHEMY_DATABASE_URI': 'sqlite:///:memory:',
            'TESTING': True
        })
        self.client = self.app.test_client()



    def test_full_platform_flow(self):
        """Test complete user registration, authentication, mail encryption, file upload, benchmarks, and attack lab."""
        
        # 1. Register Alice and Bob
        res = self.client.post('/auth/register', json={'username': 'alice', 'password': 'password123'})
        print("REGISTER RESPONSE:", res.json)
        self.assertEqual(res.status_code, 201)

        
        res = self.client.post('/auth/register', json={'username': 'bob', 'password': 'password123'})
        self.assertEqual(res.status_code, 201)
        
        # 2. Login as Alice
        res = self.client.post('/auth/login', json={'username': 'alice', 'password': 'password123'})
        self.assertEqual(res.status_code, 200)
        self.assertIn('user', res.json)
        
        # 3. Send PQC Secure Email from Alice to bob@pqc.local
        mail_payload = {
            'recipient_email': 'bob@pqc.local',
            'subject': 'Quantum Defense Strategy 2026',
            'body': 'This is an end-to-end encrypted post-quantum email body test.',
            'mode': 'Hybrid'
        }
        res = self.client.post('/api/mail/send', json=mail_payload)
        self.assertEqual(res.status_code, 201)
        mail_id = res.json['email_id']
        
        # 4. Read Email as Alice
        res = self.client.get(f'/api/mail/read/{mail_id}')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json['decrypted_body'], mail_payload['body'])
        self.assertTrue(res.json['signature_verified'])
        
        # 5. File Upload & Encryption
        test_file_content = b"Confidential dataset stream for AES-GCM per-file key test."
        file_data = {
            'file': (io.BytesIO(test_file_content), 'test_report.pdf')
        }
        res = self.client.post('/api/files/upload', data=file_data, content_type='multipart/form-data')
        self.assertEqual(res.status_code, 201)
        file_id = res.json['attachment']['id']
        
        # 6. File Download & Decryption Integrity
        res = self.client.get(f'/api/files/download/{file_id}')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data, test_file_content)
        
        # 7. Crypto Primitives Matrix API
        res = self.client.get('/api/crypto/primitives')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(len(res.json), 15)
        ascon_p = next(p for p in res.json if p['name'] == 'Ascon-128a')
        self.assertEqual(ascon_p['status'], 'SUPPORTED / ACTIVE')

        # 7b. Quantum Effort Estimator API
        res = self.client.get('/api/crypto/quantum-effort')
        self.assertEqual(res.status_code, 200)
        self.assertIn('ML-KEM-768', res.json)
        self.assertIn('RSA-2048', res.json)
        self.assertIn('Ascon-128a', res.json)
        self.assertTrue(res.json['ML-KEM-768']['pqc_safe'])
        self.assertFalse(res.json['RSA-2048']['pqc_safe'])
        
        # 8. Attack Lab Executions
        res = self.client.post('/api/attack/wrong_key')
        self.assertEqual(res.status_code, 200)
        self.assertTrue(res.json['blocked'])
        
        res = self.client.post('/api/attack/tamper')
        self.assertEqual(res.status_code, 200)
        self.assertTrue(res.json['blocked'])
        
        res = self.client.post('/api/attack/replay')
        self.assertEqual(res.status_code, 200)
        self.assertTrue(res.json['blocked'])
        
        res = self.client.post('/api/attack/mitm')
        self.assertEqual(res.status_code, 200)
        self.assertTrue(res.json['blocked'])
        
        # 9. Benchmarks Run
        res = self.client.post('/api/benchmarks/run')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json['status'], 'success')

if __name__ == '__main__':
    unittest.main()
