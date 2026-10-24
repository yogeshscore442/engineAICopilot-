import os
import base64
from werkzeug.utils import secure_filename
from flask import Blueprint, request, jsonify, session, send_file, current_app
from app.models import db, User, Attachment, AuditLog
from app.crypto.symmetric import (
    encrypt_aes_gcm, decrypt_aes_gcm, generate_file_encryption_key,
    sha3_256_hash, sha3_512_hash, shake_256_hash
)
from app.crypto.key_derivation import derive_hkdf_key

files_bp = Blueprint('files', __name__)

ALLOWED_EXTENSIONS = {'pdf', 'docx', 'xlsx', 'pptx', 'txt', 'png', 'jpg', 'jpeg', 'gif', 'zip'}
MAX_FILE_SIZE = 25 * 1024 * 1024  # 25 MB

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def get_vault_file_master():
    """Derives a platform-wide shared file vault key for authenticated repository downloads."""
    secret = current_app.config.get('SECRET_KEY', 'pqc-platform-file-vault-master-secret')
    vault_seed = f"platform-vault-{secret}".encode('utf-8')
    return derive_hkdf_key(vault_seed, length=32, info=b"pqc-file-key-wrap")

@files_bp.route('/upload', methods=['POST'])
def upload_file():
    if 'user_id' not in session:
        return jsonify({'error': 'Unauthorized.'}), 401
        
    user_id = session['user_id']
    if 'file' not in request.files:
        return jsonify({'error': 'No file provided in request.'}), 400
        
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No file selected.'}), 400
        
    if not allowed_file(file.filename):
        return jsonify({'error': f'File extension not allowed. Supported formats: {", ".join(ALLOWED_EXTENSIONS)}'}), 400
        
    filename = secure_filename(file.filename)
    raw_bytes = file.read()
    
    if len(raw_bytes) > MAX_FILE_SIZE:
        return jsonify({'error': f'File exceeds maximum size limit of {MAX_FILE_SIZE // (1024*1024)} MB.'}), 400
        
    # Generate per-file encryption key
    file_key = generate_file_encryption_key()

    hash_algo = request.form.get('hash_algo', 'sha3_256').lower().strip()
    if hash_algo in ['sha3_512', 'sha3-512', '512']:
        sha3_digest = f"SHA3-512:{sha3_512_hash(raw_bytes)}"
        algo_name = "AES-256-GCM / SHA3-512 (512-bit Quantum-Proof)"
    elif hash_algo in ['shake_256', 'shake-256', 'shake']:
        sha3_digest = f"SHAKE-256:{shake_256_hash(raw_bytes, 64)}"
        algo_name = "AES-256-GCM / SHAKE-256 (512-bit XOF)"
    else:
        sha3_digest = sha3_256_hash(raw_bytes)
        algo_name = "AES-256-GCM / SHA3-256"
    
    # Encrypt file payload with AES-256-GCM
    assoc_data = f"file-{filename}-{sha3_digest[:16]}".encode('utf-8')
    ciphertext_b64, iv_b64, tag_b64 = encrypt_aes_gcm(file_key, raw_bytes, assoc_data)
    
    # Save encrypted payload to disk inside instance/uploads
    uploads_dir = os.path.join(os.getcwd(), 'instance', 'uploads')
    os.makedirs(uploads_dir, exist_ok=True)
    
    storage_path = os.path.join(uploads_dir, f"{user_id}_{sha3_digest[-12:]}_{filename}.enc")
    with open(storage_path, 'wb') as f:
        f.write(base64.b64decode(ciphertext_b64))
        
    # Encrypt per-file key for database record using platform vault master key
    vault_file_master = get_vault_file_master()
    fk_enc, fk_iv, fk_tag = encrypt_aes_gcm(vault_file_master, file_key, b"file-key-wrap")
    wrapped_file_key = f"{fk_enc}:{fk_iv}:{fk_tag}"
    
    attachment = Attachment(
        filename=filename,
        file_type=file.content_type or 'application/octet-stream',
        file_size=len(raw_bytes),
        storage_path=storage_path,
        encrypted_file_key=wrapped_file_key,
        iv=iv_b64,
        auth_tag=tag_b64,
        sha3_digest=sha3_digest
    )
    db.session.add(attachment)
    
    audit = AuditLog(
        user_id=user_id,
        action="FILE_ENCRYPT_UPLOAD",
        algorithm=algo_name,
        mode="HYBRID",
        result="SUCCESS",
        risk_level="LOW",
        details=f"File '{filename}' ({len(raw_bytes)} bytes) uploaded and encrypted with per-file AES-GCM key and {algo_name} integrity.",
        ip_address=request.remote_addr
    )
    db.session.add(audit)
    db.session.commit()
    
    return jsonify({
        'message': 'File uploaded and encrypted successfully.',
        'attachment': attachment.to_dict()
    }), 201

@files_bp.route('/list', methods=['GET'])
def list_files():
    if 'user_id' not in session:
        return jsonify({'error': 'Unauthorized.'}), 401
    attachments = Attachment.query.order_by(Attachment.timestamp.desc()).all()
    return jsonify([a.to_dict() for a in attachments]), 200

@files_bp.route('/download/<int:file_id>', methods=['GET'])
def download_file(file_id):
    if 'user_id' not in session:
        return jsonify({'error': 'Unauthorized.'}), 401
        
    user_id = session['user_id']
    attachment = Attachment.query.get(file_id)
    if not attachment or not os.path.exists(attachment.storage_path):
        return jsonify({'error': 'File not found or storage path invalid.'}), 404
        
    try:
        with open(attachment.storage_path, 'rb') as f:
            encrypted_payload_bytes = f.read()
            
        ciphertext_b64 = base64.b64encode(encrypted_payload_bytes).decode('utf-8')
        
        if ':' in attachment.encrypted_file_key:
            fk_enc, fk_iv, fk_tag = attachment.encrypted_file_key.split(':')
        else:
            fk_enc = attachment.encrypted_file_key
            fk_iv = attachment.iv
            fk_tag = attachment.auth_tag

        file_key = None

        # 1. Unwrap using Platform File Vault Master Key
        try:
            vault_file_master = get_vault_file_master()
            file_key = decrypt_aes_gcm(vault_file_master, fk_enc, fk_iv, fk_tag, b"file-key-wrap")
        except Exception:
            pass

        # 2. Fallback for legacy files wrapped with uploader-specific HKDF keys
        if file_key is None:
            candidate_uids = [user_id]
            base_name = os.path.basename(attachment.storage_path)
            parts = base_name.split('_')
            if len(parts) >= 3 and parts[0].isdigit():
                uploader_id = int(parts[0])
                if uploader_id not in candidate_uids:
                    candidate_uids.insert(0, uploader_id)

            for uid in candidate_uids:
                try:
                    legacy_seed = f"user-{uid}-file-master".encode('utf-8')
                    legacy_file_master = derive_hkdf_key(legacy_seed, length=32, info=b"pqc-file-key-wrap")
                    file_key = decrypt_aes_gcm(legacy_file_master, fk_enc, fk_iv, fk_tag, b"file-key-wrap")
                    if file_key:
                        break
                except Exception:
                    continue

        if not file_key:
            return jsonify({'error': 'Failed to unwrap file encryption key.'}), 500
        
        # Decrypt payload
        assoc_data = f"file-{attachment.filename}-{attachment.sha3_digest[:16]}".encode('utf-8')
        decrypted_raw = decrypt_aes_gcm(file_key, ciphertext_b64, attachment.iv, attachment.auth_tag, assoc_data)
        
        # Verify SHA3 / SHAKE digest integrity
        if attachment.sha3_digest.startswith('SHA3-512:'):
            expected_hash = attachment.sha3_digest.split(':', 1)[1]
            actual_hash = sha3_512_hash(decrypted_raw)
            if actual_hash != expected_hash:
                return jsonify({'error': 'SHA3-512 quantum integrity check failed! File corrupted or tampered.'}), 400
        elif attachment.sha3_digest.startswith('SHAKE-256:'):
            expected_hash = attachment.sha3_digest.split(':', 1)[1]
            actual_hash = shake_256_hash(decrypted_raw, 64)
            if actual_hash != expected_hash:
                return jsonify({'error': 'SHAKE-256 quantum integrity check failed! File corrupted or tampered.'}), 400
        else:
            decrypted_sha3 = sha3_256_hash(decrypted_raw)
            if decrypted_sha3 != attachment.sha3_digest:
                return jsonify({'error': 'SHA3-256 digest integrity check failed! File corrupted or tampered.'}), 400
            
        temp_dir = os.path.join(os.getcwd(), 'instance', 'temp_downloads')
        os.makedirs(temp_dir, exist_ok=True)
        out_path = os.path.join(temp_dir, attachment.filename)
        with open(out_path, 'wb') as f:
            f.write(decrypted_raw)
            
        return send_file(out_path, as_attachment=True, download_name=attachment.filename)
        
    except Exception as e:
        return jsonify({'error': f'Failed to decrypt and download file: {str(e)}'}), 500

