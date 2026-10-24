import base64
from flask import Blueprint, jsonify, session, request
from app.models import db, User, UserSessionKey, AuditLog
from app.crypto.classical import generate_rsa_keys
from app.crypto.pqc import generate_pqc_sig_keypair, generate_slh_dsa_keypair
from app.crypto.x25519_curve import generate_x25519_keypair

key_bp = Blueprint('keys', __name__)

@key_bp.route('/directory', methods=['GET'])
def get_key_directory():
    """Returns directory of public keys and algorithm capabilities across all users."""
    if 'user_id' not in session:
        return jsonify({'error': 'Unauthorized.'}), 401
        
    users = User.query.all()
    key_list = []
    for u in users:
        key_list.append({
            'user_id': u.id,
            'username': u.username,
            'email': u.email,
            'rsa_public_preview': u.rsa_public_pem[:60] + '...',
            'mldsa_public_preview': (u.mldsa_public_b64[:40] + '...') if u.mldsa_public_b64 else 'N/A',
            'slhdsa_public_preview': (u.slhdsa_public_b64[:40] + '...') if u.slhdsa_public_b64 else 'N/A',
            'x25519_public_preview': (u.x25519_public_b64[:40] + '...') if u.x25519_public_b64 else 'N/A',
            'created_at': u.created_at.isoformat()
        })
    return jsonify(key_list), 200

@key_bp.route('/rotate', methods=['POST'])
def rotate_keys():
    """Rotates identity key suite for the current user."""
    if 'user_id' not in session:
        return jsonify({'error': 'Unauthorized.'}), 401
        
    user_id = session['user_id']
    user = User.query.get(user_id)
    if not user:
        return jsonify({'error': 'User not found.'}), 404
        
    try:
        rsa_priv, rsa_pub = generate_rsa_keys()
        mldsa_pub, mldsa_priv = generate_pqc_sig_keypair()
        slhdsa_pub, slhdsa_priv = generate_slh_dsa_keypair()
        x25519_priv, x25519_pub = generate_x25519_keypair()
        
        user.rsa_private_pem = rsa_priv.decode('utf-8')
        user.rsa_public_pem = rsa_pub.decode('utf-8')
        user.mldsa_private_b64 = base64.b64encode(mldsa_priv).decode('utf-8')
        user.mldsa_public_b64 = base64.b64encode(mldsa_pub).decode('utf-8')
        user.slhdsa_private_b64 = base64.b64encode(slhdsa_priv).decode('utf-8')
        user.slhdsa_public_b64 = base64.b64encode(slhdsa_pub).decode('utf-8')
        user.x25519_private_b64 = base64.b64encode(x25519_priv).decode('utf-8')
        user.x25519_public_b64 = base64.b64encode(x25519_pub).decode('utf-8')
        
        # Revoke existing sessions
        UserSessionKey.query.filter_by(user_id=user_id).update({'status': 'REVOKED'})
        
        audit = AuditLog(
            user_id=user_id,
            action="KEY_ROTATION",
            algorithm="RSA / ML-DSA / SLH-DSA / X25519",
            mode="SYSTEM",
            result="SUCCESS",
            risk_level="MEDIUM",
            details=f"User {user.username} rotated identity key suite and revoked past session secrets.",
            ip_address=request.remote_addr
        )
        db.session.add(audit)
        db.session.commit()
        
        return jsonify({'message': 'Identity key suite rotated successfully. All prior active session keys revoked.'}), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Key rotation failed: {str(e)}'}), 500

@key_bp.route('/sessions', methods=['GET'])
def get_sessions():
    """Lists recorded active and revoked session keys."""
    if 'user_id' not in session:
        return jsonify({'error': 'Unauthorized.'}), 401
    sessions = UserSessionKey.query.filter_by(user_id=session['user_id']).order_by(UserSessionKey.created_at.desc()).all()
    return jsonify([
        {
            'id': s.id,
            'peer': s.peer.username if s.peer else 'Unknown',
            'mode': s.mode,
            'shared_secret_hash': s.shared_secret_hash,
            'status': s.status,
            'created_at': s.created_at.isoformat()
        } for s in sessions
    ]), 200
