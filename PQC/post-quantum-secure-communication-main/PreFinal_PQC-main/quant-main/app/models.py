from datetime import datetime
from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()

class User(db.Model):
    __tablename__ = 'users'
    
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    
    # Static identity key pairs for signing/verification
    rsa_private_pem = db.Column(db.Text, nullable=False)
    rsa_public_pem = db.Column(db.Text, nullable=False)
    mldsa_private_b64 = db.Column(db.Text, nullable=False)
    mldsa_public_b64 = db.Column(db.Text, nullable=False)
    
    # X25519 static keypair
    x25519_private_b64 = db.Column(db.Text, nullable=True)
    x25519_public_b64 = db.Column(db.Text, nullable=True)
    
    # SLH-DSA static keypair
    slhdsa_private_b64 = db.Column(db.Text, nullable=True)
    slhdsa_public_b64 = db.Column(db.Text, nullable=True)
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def __repr__(self):
        return f"<User {self.username} ({self.email})>"

class Message(db.Model):
    __tablename__ = 'messages'
    
    id = db.Column(db.Integer, primary_key=True)
    sender_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    receiver_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    group_id = db.Column(db.Integer, db.ForeignKey('group_chats.id'), nullable=True)
    
    # Store ciphertext only - NEVER plaintext
    encrypted_payload = db.Column(db.Text, nullable=False)
    iv = db.Column(db.String(100), nullable=False)
    auth_tag = db.Column(db.String(100), nullable=False)
    
    signature = db.Column(db.Text, nullable=False)
    signature_type = db.Column(db.String(20), nullable=False) # 'RSA', 'ML-DSA', 'SLH-DSA'
    
    mode = db.Column(db.String(30), nullable=False) # 'Classical', 'Modern Classical', 'PQC', 'Hybrid'
    sequence_number = db.Column(db.Integer, nullable=False)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)

    sender = db.relationship('User', foreign_keys=[sender_id])
    receiver = db.relationship('User', foreign_keys=[receiver_id])

    def to_dict(self):
        return {
            'id': self.id,
            'sender': self.sender.username if self.sender else 'System',
            'receiver': self.receiver.username if self.receiver else None,
            'group_id': self.group_id,
            'encrypted_payload': self.encrypted_payload,
            'iv': self.iv,
            'auth_tag': self.auth_tag,
            'signature': self.signature,
            'signature_type': self.signature_type,
            'mode': self.mode,
            'sequence_number': self.sequence_number,
            'timestamp': self.timestamp.isoformat()
        }

class Email(db.Model):
    __tablename__ = 'emails'
    
    id = db.Column(db.Integer, primary_key=True)
    sender_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    receiver_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    
    subject = db.Column(db.String(255), nullable=False)
    encrypted_body = db.Column(db.Text, nullable=False)
    iv = db.Column(db.String(100), nullable=False)
    auth_tag = db.Column(db.String(100), nullable=False)
    
    signature = db.Column(db.Text, nullable=False)
    signature_type = db.Column(db.String(20), nullable=False)
    mode = db.Column(db.String(30), nullable=False)
    
    is_draft = db.Column(db.Boolean, default=False)
    is_read = db.Column(db.Boolean, default=False)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)

    sender = db.relationship('User', foreign_keys=[sender_id])
    receiver = db.relationship('User', foreign_keys=[receiver_id])
    attachments = db.relationship('Attachment', backref='email', lazy=True)

    def to_dict(self):
        return {
            'id': self.id,
            'sender': self.sender.username,
            'sender_email': self.sender.email,
            'receiver': self.receiver.username,
            'receiver_email': self.receiver.email,
            'subject': self.subject,
            'encrypted_body': self.encrypted_body,
            'iv': self.iv,
            'auth_tag': self.auth_tag,
            'signature': self.signature,
            'signature_type': self.signature_type,
            'mode': self.mode,
            'is_draft': self.is_draft,
            'is_read': self.is_read,
            'timestamp': self.timestamp.isoformat(),
            'attachments': [a.to_dict() for a in self.attachments]
        }

class Attachment(db.Model):
    __tablename__ = 'attachments'
    
    id = db.Column(db.Integer, primary_key=True)
    email_id = db.Column(db.Integer, db.ForeignKey('emails.id'), nullable=True)
    message_id = db.Column(db.Integer, db.ForeignKey('messages.id'), nullable=True)
    
    filename = db.Column(db.String(255), nullable=False)
    file_type = db.Column(db.String(100), nullable=False)
    file_size = db.Column(db.Integer, nullable=False)
    
    storage_path = db.Column(db.String(500), nullable=False)
    encrypted_file_key = db.Column(db.Text, nullable=False) # File key encrypted via session/recipient key
    iv = db.Column(db.String(100), nullable=False)
    auth_tag = db.Column(db.String(100), nullable=False)
    
    sha3_digest = db.Column(db.String(255), nullable=False)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'filename': self.filename,
            'file_type': self.file_type,
            'file_size': self.file_size,
            'iv': self.iv,
            'auth_tag': self.auth_tag,
            'sha3_digest': self.sha3_digest,
            'timestamp': self.timestamp.isoformat()
        }

class GroupChat(db.Model):
    __tablename__ = 'group_chats'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    admin_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    admin = db.relationship('User', foreign_keys=[admin_id])
    members = db.relationship('GroupMember', backref='group', lazy=True)

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'admin': self.admin.username,
            'member_count': len(self.members),
            'created_at': self.created_at.isoformat()
        }

class GroupMember(db.Model):
    __tablename__ = 'group_members'
    
    id = db.Column(db.Integer, primary_key=True)
    group_id = db.Column(db.Integer, db.ForeignKey('group_chats.id'), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    joined_at = db.Column(db.DateTime, default=datetime.utcnow)

    user = db.relationship('User', foreign_keys=[user_id])

class AuditLog(db.Model):
    __tablename__ = 'audit_logs'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    action = db.Column(db.String(100), nullable=False)
    algorithm = db.Column(db.String(50), nullable=False)
    mode = db.Column(db.String(30), nullable=False)
    result = db.Column(db.String(20), nullable=False) # 'SUCCESS', 'FAILED', 'BLOCKED'
    risk_level = db.Column(db.String(20), nullable=False) # 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'
    details = db.Column(db.Text, nullable=True)
    ip_address = db.Column(db.String(50), nullable=True)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)

    user = db.relationship('User', foreign_keys=[user_id])

    def to_dict(self):
        return {
            'id': self.id,
            'user': self.user.username if self.user else 'Anonymous/System',
            'action': self.action,
            'algorithm': self.algorithm,
            'mode': self.mode,
            'result': self.result,
            'risk_level': self.risk_level,
            'details': self.details,
            'ip_address': self.ip_address,
            'timestamp': self.timestamp.isoformat()
        }

class BenchmarkResult(db.Model):
    __tablename__ = 'benchmark_results'
    
    id = db.Column(db.Integer, primary_key=True)
    mode = db.Column(db.String(30), nullable=False)
    operation = db.Column(db.String(50), nullable=False)
    time_taken_ms = db.Column(db.Float, nullable=False)
    size_bytes = db.Column(db.Integer, nullable=False)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'mode': self.mode,
            'operation': self.operation,
            'time_taken_ms': self.time_taken_ms,
            'size_bytes': self.size_bytes,
            'timestamp': self.timestamp.isoformat()
        }

class UserSessionKey(db.Model):
    __tablename__ = 'user_session_keys'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    session_peer_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    
    mode = db.Column(db.String(30), nullable=False)
    shared_secret_hash = db.Column(db.String(64), nullable=False)
    status = db.Column(db.String(20), default='ACTIVE') # 'ACTIVE', 'REVOKED', 'EXPIRED'
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    user = db.relationship('User', foreign_keys=[user_id])
    peer = db.relationship('User', foreign_keys=[session_peer_id])

class UserChatPreference(db.Model):
    __tablename__ = 'user_chat_preferences'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    peer_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    group_id = db.Column(db.Integer, db.ForeignKey('group_chats.id'), nullable=True)
    
    is_pinned = db.Column(db.Boolean, default=False)
    is_archived = db.Column(db.Boolean, default=False)
    is_blocked = db.Column(db.Boolean, default=False)
    is_locked = db.Column(db.Boolean, default=False)
    lock_pin_hash = db.Column(db.String(255), nullable=True)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow)

    user = db.relationship('User', foreign_keys=[user_id])
    peer = db.relationship('User', foreign_keys=[peer_id])
    group = db.relationship('GroupChat', foreign_keys=[group_id])

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'peer_id': self.peer_id,
            'group_id': self.group_id,
            'is_pinned': self.is_pinned,
            'is_archived': self.is_archived,
            'is_blocked': self.is_blocked,
            'is_locked': self.is_locked,
            'has_pin': bool(self.lock_pin_hash),
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }
