from flask import Blueprint, jsonify, session, request
from app.models import AuditLog

audit_bp = Blueprint('audit', __name__)

@audit_bp.route('/logs', methods=['GET'])
def get_audit_logs():
    """Fetches recent security audit logs."""
    if 'user_id' not in session:
        return jsonify({'error': 'Unauthorized.'}), 401
    logs = AuditLog.query.order_by(AuditLog.timestamp.desc()).limit(150).all()
    return jsonify([l.to_dict() for l in logs]), 200
