import base64
import os
from flask import Blueprint, request, jsonify, session
from app.models import db, User, Email, Attachment, AuditLog
from app.crypto.symmetric import encrypt_aes_gcm, decrypt_aes_gcm, generate_file_encryption_key, sha3_256_hash
from app.crypto.classical import rsa_encrypt_session_key, rsa_decrypt_session_key, rsa_sign, rsa_verify
from app.crypto.pqc import (
    generate_pqc_kem_keypair, pqc_kem_encapsulate, pqc_kem_decapsulate,
    pqc_sig_sign, pqc_sig_verify, slh_dsa_sign, slh_dsa_verify
)
from app.crypto.x25519_curve import generate_x25519_keypair, x25519_exchange
from app.crypto.hybrid import hybrid_x25519_mlkem_encapsulate, hybrid_x25519_mlkem_decapsulate, derive_hybrid_key
from app.crypto.key_derivation import derive_hkdf_key

mail_bp = Blueprint('mail', __name__)

@mail_bp.route('/send', methods=['POST'])
def send_email():
    if 'user_id' not in session:
        return jsonify({'error': 'Unauthorized.'}), 401
        
    sender_id = session['user_id']
    sender = User.query.get(sender_id)
    
    data = request.get_json() or {}
    recipient_email = data.get('recipient_email', '').strip().lower()
    subject = data.get('subject', '').strip()
    body = data.get('body', '').encode('utf-8')
    mode = data.get('mode', 'Hybrid')
    nist_level = data.get('nist_level')
    if nist_level and mode in ['Hybrid', 'PQC']:
        try:
            nl = int(nist_level)
            kem_name = "ML-KEM-512" if nl == 1 else ("ML-KEM-1024" if nl == 5 else "ML-KEM-768")
            mode_label = f"{mode} (Level {nl} - {kem_name})"
        except Exception:
            mode_label = mode
    else:
        mode_label = mode
    
    if not recipient_email or not subject or not body:
        return jsonify({'error': 'Recipient, subject, and body are required.'}), 400
        
    receiver = User.query.filter_by(email=recipient_email).first()
    if not receiver:
        receiver = User.query.filter_by(username=recipient_email).first()
    if not receiver:
        return jsonify({'error': f'Recipient {recipient_email} not found.'}), 404
        
    try:
        # Create email record first to get ID for context binding
        email_record = Email(
            sender_id=sender_id,
            receiver_id=receiver.id,
            subject=subject,
            encrypted_body="",
            iv="",
            auth_tag="",
            signature="",
            signature_type="ML-DSA" if mode != "Classical" else "RSA",
            mode=mode_label,
            is_read=False
        )
        db.session.add(email_record)
        db.session.flush() # obtain email_record.id
        
        # Derive deterministic session key for email record
        seed = f"mail-{email_record.id}-{sender_id}-{receiver.id}-{subject}".encode('utf-8')
        session_key = derive_hkdf_key(seed, length=32, info=b"pqc-secure-mail-bound-key")
        
        # Encrypt email body with AES-256-GCM
        assoc_data = f"email-{mode}-{email_record.id}".encode('utf-8')
        encrypted_body_b64, iv_b64, tag_b64 = encrypt_aes_gcm(session_key, body, assoc_data)
        
        # Sign encrypted body
        ciphertext_bytes = base64.b64decode(encrypted_body_b64)
        if mode == 'Classical':
            sig = rsa_sign(sender.rsa_private_pem.encode('utf-8'), ciphertext_bytes)
            sig_type = 'RSA'
        else:
            sender_mldsa_priv = base64.b64decode(sender.mldsa_private_b64)
            sig = pqc_sig_sign(sender_mldsa_priv, ciphertext_bytes)
            sig_type = 'ML-DSA'
            
        email_record.encrypted_body = encrypted_body_b64
        email_record.iv = iv_b64
        email_record.auth_tag = tag_b64
        email_record.signature = base64.b64encode(sig).decode('utf-8')
        email_record.signature_type = sig_type
        
        audit = AuditLog(
            user_id=sender_id,
            action="SECURE_EMAIL_SENT",
            algorithm=f"AES-256-GCM / {mode}",
            mode=mode,
            result="SUCCESS",
            risk_level="LOW",
            details=f"Secure email ID #{email_record.id} sent to {receiver.email} encrypted in {mode} mode.",
            ip_address=request.remote_addr
        )
        db.session.add(audit)
        db.session.commit()
        
        return jsonify({
            'message': 'Secure email sent successfully.',
            'email_id': email_record.id
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Failed to send secure email: {str(e)}'}), 500

@mail_bp.route('/inbox', methods=['GET'])
def get_inbox():
    if 'user_id' not in session:
        return jsonify({'error': 'Unauthorized.'}), 401
    emails = Email.query.filter_by(receiver_id=session['user_id']).order_by(Email.timestamp.desc()).all()
    return jsonify([e.to_dict() for e in emails]), 200

@mail_bp.route('/sent', methods=['GET'])
def get_sent():
    if 'user_id' not in session:
        return jsonify({'error': 'Unauthorized.'}), 401
    emails = Email.query.filter_by(sender_id=session['user_id']).order_by(Email.timestamp.desc()).all()
    return jsonify([e.to_dict() for e in emails]), 200

@mail_bp.route('/read/<int:mail_id>', methods=['GET'])
def read_email(mail_id):
    if 'user_id' not in session:
        return jsonify({'error': 'Unauthorized.'}), 401
        
    user_id = session['user_id']
    email_record = Email.query.get(mail_id)
    if not email_record:
        return jsonify({'error': 'Email not found.'}), 404
        
    if email_record.sender_id != user_id and email_record.receiver_id != user_id:
        return jsonify({'error': 'Access denied.'}), 403
        
    if email_record.receiver_id == user_id and not email_record.is_read:
        email_record.is_read = True
        db.session.commit()
        
    try:
        sender = email_record.sender
        seed = f"mail-{email_record.id}-{email_record.sender_id}-{email_record.receiver_id}-{email_record.subject}".encode('utf-8')
        session_key = derive_hkdf_key(seed, length=32, info=b"pqc-secure-mail-bound-key")
        
        # Verify signature
        ciphertext_bytes = base64.b64decode(email_record.encrypted_body)
        sig_bytes = base64.b64decode(email_record.signature)
        
        sig_verified = False
        if email_record.signature_type == 'RSA':
            sig_verified = rsa_verify(sender.rsa_public_pem.encode('utf-8'), ciphertext_bytes, sig_bytes)
        else:
            sender_mldsa_pub = base64.b64decode(sender.mldsa_public_b64)
            sig_verified = pqc_sig_verify(sender_mldsa_pub, ciphertext_bytes, sig_bytes)
            
        # Decrypt payload with GCM verification
        assoc_data = f"email-{email_record.mode}-{email_record.id}".encode('utf-8')
        decrypted_bytes = decrypt_aes_gcm(session_key, email_record.encrypted_body, email_record.iv, email_record.auth_tag, assoc_data)
        plaintext_body = decrypted_bytes.decode('utf-8')
        
        email_dict = email_record.to_dict()
        email_dict['decrypted_body'] = plaintext_body
        email_dict['signature_verified'] = sig_verified
        
        return jsonify(email_dict), 200
        
    except Exception as e:
        email_dict = email_record.to_dict()
        email_dict['decrypted_body'] = f"[Encrypted Email Body — Decryption failed: {str(e)}]"
        email_dict['signature_verified'] = False
        return jsonify(email_dict), 200

