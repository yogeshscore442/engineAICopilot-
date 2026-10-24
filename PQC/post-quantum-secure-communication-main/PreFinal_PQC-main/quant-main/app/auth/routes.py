import bcrypt
import base64
from flask import Blueprint, request, jsonify, session
from app.models import db, User, AuditLog
from app.crypto.classical import generate_rsa_keys
from app.crypto.pqc import generate_pqc_sig_keypair, generate_slh_dsa_keypair
from app.crypto.x25519_curve import generate_x25519_keypair

auth_bp = Blueprint('auth', __name__)

@auth_bp.route('/register', methods=['POST'])
def register():
    data = request.get_json() or {}
    username = data.get('username', '').strip().lower()
    password = data.get('password', '')
    
    if not username or not password:
        return jsonify({'error': 'Username and password are required.'}), 400
        
    if len(password) < 6:
        return jsonify({'error': 'Password must be at least 6 characters.'}), 400
        
    # Check if user already exists
    existing_user = User.query.filter_by(username=username).first()
    if existing_user:
        return jsonify({'error': 'Username is already taken.'}), 400
        
    email = f"{username}@pqc.local"
    
    # Hash password with bcrypt
    salt = bcrypt.gensalt()
    password_hash = bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')
    
    # Generate cryptographic identity key suite
    try:
        rsa_priv, rsa_pub = generate_rsa_keys()
        mldsa_pub, mldsa_priv = generate_pqc_sig_keypair()
        slhdsa_pub, slhdsa_priv = generate_slh_dsa_keypair()
        x25519_priv, x25519_pub = generate_x25519_keypair()
        
        rsa_private_pem = rsa_priv.decode('utf-8')
        rsa_public_pem = rsa_pub.decode('utf-8')
        mldsa_private_b64 = base64.b64encode(mldsa_priv).decode('utf-8')
        mldsa_public_b64 = base64.b64encode(mldsa_pub).decode('utf-8')
        slhdsa_private_b64 = base64.b64encode(slhdsa_priv).decode('utf-8')
        slhdsa_public_b64 = base64.b64encode(slhdsa_pub).decode('utf-8')
        x25519_private_b64 = base64.b64encode(x25519_priv).decode('utf-8')
        x25519_public_b64 = base64.b64encode(x25519_pub).decode('utf-8')
    except Exception as e:
        return jsonify({'error': f'Failed to generate cryptographic identity key suite: {e}'}), 500
    
    # Create and save user
    new_user = User(
        username=username,
        email=email,
        password_hash=password_hash,
        rsa_private_pem=rsa_private_pem,
        rsa_public_pem=rsa_public_pem,
        mldsa_private_b64=mldsa_private_b64,
        mldsa_public_b64=mldsa_public_b64,
        slhdsa_private_b64=slhdsa_private_b64,
        slhdsa_public_b64=slhdsa_public_b64,
        x25519_private_b64=x25519_private_b64,
        x25519_public_b64=x25519_public_b64
    )
    db.session.add(new_user)
    
    audit = AuditLog(
        action="USER_REGISTRATION",
        algorithm="RSA-2048 / ML-DSA-65 / SLH-DSA / X25519",
        mode="SYSTEM",
        result="SUCCESS",
        risk_level="LOW",
        details=f"User {username} registered with email {email} and identity key suite.",
        ip_address=request.remote_addr
    )
    db.session.add(audit)
    
    try:
        db.session.commit()
        return jsonify({'message': f'Registration successful! Your PQC email is {email}.'}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Database error occurred during registration: {e}'}), 500

@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json() or {}
    username = data.get('username', '').strip().lower()
    password = data.get('password', '')
    
    if not username or not password:
        return jsonify({'error': 'Username and password are required.'}), 400
        
    user = User.query.filter_by(username=username).first()
    if not user or not bcrypt.checkpw(password.encode('utf-8'), user.password_hash.encode('utf-8')):
        audit = AuditLog(
            action="USER_LOGIN_FAILED",
            algorithm="Bcrypt",
            mode="SYSTEM",
            result="FAILED",
            risk_level="HIGH",
            details=f"Failed login attempt for username '{username}'.",
            ip_address=request.remote_addr
        )
        db.session.add(audit)
        db.session.commit()
        return jsonify({'error': 'Invalid username or password.'}), 401
        
    # Set session values
    session['user_id'] = user.id
    session['username'] = user.username
    session['email'] = user.email
    
    audit = AuditLog(
        user_id=user.id,
        action="USER_LOGIN_SUCCESS",
        algorithm="Bcrypt",
        mode="SYSTEM",
        result="SUCCESS",
        risk_level="LOW",
        details=f"User {user.username} logged in successfully.",
        ip_address=request.remote_addr
    )
    db.session.add(audit)
    db.session.commit()
    
    return jsonify({
        'message': 'Login successful.',
        'user': {
            'id': user.id,
            'username': user.username,
            'email': user.email
        }
    }), 200

@auth_bp.route('/logout', methods=['POST', 'GET'])
def logout():
    user_id = session.get('user_id')
    if user_id:
        audit = AuditLog(
            user_id=user_id,
            action="USER_LOGOUT",
            algorithm="N/A",
            mode="SYSTEM",
            result="SUCCESS",
            risk_level="LOW",
            details=f"User {session.get('username')} logged out.",
            ip_address=request.remote_addr
        )
        db.session.add(audit)
        db.session.commit()
    session.clear()
    return jsonify({'message': 'Logged out successfully.'}), 200

@auth_bp.route('/me', methods=['GET'])
def get_me():
    if 'user_id' not in session:
        return jsonify({'authenticated': False}), 401
        
    user = User.query.get(session['user_id'])
    if not user:
        session.clear()
        return jsonify({'authenticated': False}), 401

    mldsa_pub_preview = user.mldsa_public_b64[:32] + '...' if user.mldsa_public_b64 else 'ML-DSA-65-READY'
    x25519_pub_preview = user.x25519_public_b64[:32] + '...' if user.x25519_public_b64 else 'X25519-READY'

    return jsonify({
        'authenticated': True,
        'user': {
            'id': user.id,
            'username': user.username,
            'email': user.email,
            'created_at': user.created_at.strftime('%B %Y') if user.created_at else 'Active',
            'mldsa_public_b64': user.mldsa_public_b64,
            'mldsa_fingerprint': mldsa_pub_preview,
            'x25519_public_b64': user.x25519_public_b64,
            'x25519_fingerprint': x25519_pub_preview,
            'slhdsa_public_b64': user.slhdsa_public_b64
        }
    }), 200

@auth_bp.route('/profile', methods=['POST'])
def update_profile():
    if 'user_id' not in session:
        return jsonify({'error': 'Unauthorized'}), 401
    
    user = User.query.get(session['user_id'])
    if not user:
        return jsonify({'error': 'User not found'}), 404
        
    data = request.get_json() or {}
    new_email = data.get('email')
    if new_email and '@' in new_email:
        user.email = new_email.strip().lower()
        db.session.commit()
        session['email'] = user.email
        
    return jsonify({
        'message': 'Profile synchronized successfully.',
        'user': {
            'id': user.id,
            'username': user.username,
            'email': user.email
        }
    }), 200

