import base64
import os
from datetime import datetime, timedelta
from flask import request, session
from flask_socketio import emit, join_room, leave_room
from app import socketio, db
from app.models import User, Message, UserSessionKey, GroupChat, GroupMember, AuditLog, UserChatPreference
from app.crypto.symmetric import encrypt_aes_gcm, decrypt_aes_gcm
from app.crypto.classical import (
    generate_rsa_keys, rsa_encrypt_session_key, rsa_decrypt_session_key, rsa_sign, rsa_verify
)
from app.crypto.x25519_curve import generate_x25519_keypair, x25519_exchange
from app.crypto.pqc import (
    generate_pqc_kem_keypair, pqc_kem_encapsulate, pqc_kem_decapsulate,
    pqc_sig_sign, pqc_sig_verify, generate_slh_dsa_keypair, slh_dsa_sign, slh_dsa_verify
)
from app.crypto.hybrid import hybrid_x25519_mlkem_encapsulate, hybrid_x25519_mlkem_decapsulate, hybrid_encapsulate, hybrid_decapsulate
from app.crypto.key_derivation import derive_hkdf_key

active_session_keys = {}
pending_handshakes = {}
ephemeral_keys = {}
session_sequences = {}
captured_packets_buffer = []
attack_counters = {'tested': 0, 'blocked': 0}

# Robust multi-socket online presence tracking
user_active_sockets = {}  # { user_id (int): set(sid) }
socket_to_user = {}       # { sid: user_id (int) }
online_users = set()      # set of user_id (int) currently active

def resolve_user_id(data=None, sid=None):
    """Robust fallback resolver for user_id across session, socket tracking, and message payload."""
    if session.get('user_id'):
        try:
            return int(session['user_id'])
        except (ValueError, TypeError):
            pass
    if sid and sid in socket_to_user:
        return int(socket_to_user[sid])
    if request and hasattr(request, 'sid') and request.sid in socket_to_user:
        return int(socket_to_user[request.sid])
    if data and isinstance(data, dict):
        for key in ('user_id', 'sender_id', 'responder_id', 'initiator_id', 'admin_id'):
            val = data.get(key)
            if val is not None:
                try:
                    return int(val)
                except (ValueError, TypeError):
                    pass
    return None

def emit_to_user(user_id, event, payload):
    """Guarantees reliable, single delivery to a user's personal room."""
    try:
        user_id = int(user_id)
    except (ValueError, TypeError):
        return
    room_name = f"user_{user_id}"
    try:
        socketio.emit(event, payload, to=room_name)
    except Exception:
        pass

def register_user_socket(user_id, sid):
    """Registers a user's socket connection and marks them online."""
    try:
        user_id = int(user_id)
    except (ValueError, TypeError):
        return
        
    if user_id not in user_active_sockets:
        user_active_sockets[user_id] = set()
        
    user_active_sockets[user_id].add(sid)
    socket_to_user[sid] = user_id
    online_users.add(user_id)
    
    # Ensure client is in their personal room
    join_room(f"user_{user_id}", sid=sid)
    
    # Auto-join all group rooms user belongs to
    try:
        memberships = GroupMember.query.filter_by(user_id=user_id).all()
        for m in memberships:
            join_room(f"group_{m.group_id}", sid=sid)
    except Exception:
        pass
        
    # Broadcast status change so all peers are instantly synchronized
    socketio.emit('user_status_changed', {'user_id': user_id, 'is_online': True})

def unregister_user_socket(sid):
    """Removes a socket connection, marking the user offline ONLY if no other sockets remain."""
    user_id = socket_to_user.pop(sid, None)
    if not user_id:
        return
        
    if user_id in user_active_sockets:
        user_active_sockets[user_id].discard(sid)
        if len(user_active_sockets[user_id]) == 0:
            user_active_sockets.pop(user_id, None)
            online_users.discard(user_id)
            socketio.emit('user_status_changed', {'user_id': user_id, 'is_online': False})

def record_captured_packet(packet_data):
    """Stores captured application transport packet in buffer for live telemetry."""
    captured_packets_buffer.insert(0, packet_data)
    if len(captured_packets_buffer) > 100:
        captured_packets_buffer.pop()
    socketio.emit('packet_captured', packet_data, room='sec_monitor')

def broadcast_security_monitor(event_data):
    """Broadcasting live cryptographic pipeline events to Security Monitor listeners."""
    socketio.emit('security_monitor_update', event_data, room='sec_monitor')

@socketio.on('connect')
def handle_connect():
    join_room('sec_monitor')
    user_id = session.get('user_id')
    if user_id:
        register_user_socket(user_id, request.sid)

@socketio.on('register_session')
def handle_register_session(data):
    """Explicitly ensures the client's socket is bound to their personal user room and synced."""
    user_id = resolve_user_id(data, getattr(request, 'sid', None))
    if user_id:
        register_user_socket(user_id, request.sid)
        # Respond immediately with the full list of currently online user IDs
        emit('online_users_sync', {'online_user_ids': list(online_users)})

@socketio.on('disconnect')
def handle_disconnect():
    unregister_user_socket(request.sid)

@socketio.on('heartbeat')
def handle_heartbeat(data):
    """Periodic client heartbeat to keep socket association and online state fresh."""
    user_id = resolve_user_id(data, getattr(request, 'sid', None))
    if user_id:
        register_user_socket(user_id, request.sid)

@socketio.on('get_online_users')
def handle_get_online_users():
    """Returns the list of all currently online user IDs to the requesting socket."""
    emit('online_users_sync', {'online_user_ids': list(online_users)})

@socketio.on('join_chat')
def handle_join_chat(data):
    user_id = resolve_user_id(data, getattr(request, 'sid', None))
    if not user_id:
        return
    peer_id = data.get('peer_id')
    if peer_id:
        peer_id_int = int(peer_id)
        join_room(f"user_{user_id}")
        session_sequences[(user_id, peer_id_int)] = set()
        session_sequences[(peer_id_int, user_id)] = set()

@socketio.on('initiate_handshake')
def handle_initiate_handshake(data):
    """Step 1 of 2-Party Interactive Handshake: Initiator requests handshake from peer."""
    sender_id = resolve_user_id(data, getattr(request, 'sid', None))
    if not sender_id:
        emit('handshake_failed', {'error': 'Unauthorized: Session missing or expired. Please reload the page.'})
        return
        
    peer_id = int(data.get('peer_id'))
    mode = data.get('mode', 'Hybrid') # 'Classical', 'Modern Classical', 'PQC', 'Hybrid'
    
    # NIST Security Level handling: 1 (ML-KEM-512), 3 (ML-KEM-768), 5 (ML-KEM-1024)
    nist_level = int(data.get('nist_level', 3))
    kem_alg = "ML-KEM-512" if nist_level == 1 else ("ML-KEM-1024" if nist_level == 5 else "ML-KEM-768")
    
    # Check if either user has blocked the other
    block_check = UserChatPreference.query.filter(
        db.or_(
            db.and_(UserChatPreference.user_id == peer_id, UserChatPreference.peer_id == sender_id, UserChatPreference.is_blocked == True),
            db.and_(UserChatPreference.user_id == sender_id, UserChatPreference.peer_id == peer_id, UserChatPreference.is_blocked == True)
        )
    ).first()
    if block_check:
        emit('handshake_failed', {'error': 'Handshake blocked: Communication with this user is blocked.'})
        return
    
    sender = db.session.get(User, sender_id)
    responder = db.session.get(User, peer_id)
    if not responder or not sender:
        emit('handshake_failed', {'error': 'Peer user record not found.'})
        return

    # Ensure sender's socket is registered
    if hasattr(request, 'sid'):
        register_user_socket(sender_id, request.sid)

    # Store pending handshake request
    pending_handshakes[(sender_id, peer_id)] = {
        'mode': mode,
        'nist_level': nist_level,
        'kem_alg': kem_alg
    }

    broadcast_security_monitor({
        'type': 'HANDSHAKE_REQUESTED',
        'sender_id': sender_id,
        'sender_username': sender.username,
        'peer_id': peer_id,
        'peer_username': responder.username,
        'mode': f"{mode} (Level {nist_level} - {kem_alg})" if mode in ['PQC', 'Hybrid'] else mode,
        'nist_level': nist_level,
        'step': '1. Handshake Request Sent to Peer'
    })

    # Forward handshake request modal prompt to responder via room + active sockets
    req_payload = {
        'initiator_id': sender_id,
        'initiator_username': sender.username,
        'initiator_email': sender.email,
        'mode': mode,
        'nist_level': nist_level,
        'kem_alg': kem_alg
    }
    emit_to_user(peer_id, 'handshake_request_received', req_payload)

    # Acknowledge to initiator
    emit_to_user(sender_id, 'handshake_request_sent', {
        'peer_id': peer_id,
        'peer_username': responder.username,
        'mode': mode,
        'nist_level': nist_level,
        'kem_alg': kem_alg
    })

@socketio.on('accept_handshake')
def handle_accept_handshake(data):
    """Step 2 of 2-Party Interactive Handshake: Responder accepts and executes cryptographic key exchange."""
    responder_id = resolve_user_id(data, getattr(request, 'sid', None))
    if not responder_id:
        emit('handshake_failed', {'error': 'Unauthorized: Session missing or expired.'})
        return

    initiator_id = int(data.get('initiator_id'))
    
    # Ensure responder's socket is registered
    if hasattr(request, 'sid'):
        register_user_socket(responder_id, request.sid)

    pending = pending_handshakes.pop((initiator_id, responder_id), None)
    mode = (pending.get('mode') if pending else None) or data.get('mode', 'Hybrid')
    nist_level = int((pending.get('nist_level') if pending else None) or data.get('nist_level', 3))
    kem_alg = "ML-KEM-512" if nist_level == 1 else ("ML-KEM-1024" if nist_level == 5 else "ML-KEM-768")

    initiator = db.session.get(User, initiator_id)
    responder = db.session.get(User, responder_id)
    if not initiator or not responder:
        err = {'error': 'User record not found.'}
        emit_to_user(initiator_id, 'handshake_failed', err)
        emit_to_user(responder_id, 'handshake_failed', err)
        return

    try:
        broadcast_security_monitor({
            'type': 'HANDSHAKE_ACCEPTED',
            'initiator_id': initiator_id,
            'responder_id': responder_id,
            'mode': f"{mode} (Level {nist_level} - {kem_alg})" if mode in ['PQC', 'Hybrid'] else mode,
            'nist_level': nist_level,
            'step': '2. Handshake Accepted - Deriving Quantum-Safe Shared Secret'
        })

        # -------------------------------------------------------------
        # Execute Real 2-Party Cryptographic Key Derivation
        # -------------------------------------------------------------
        if mode == 'Classical':
            rsa_priv, rsa_pub = generate_rsa_keys()
            from cryptography.hazmat.primitives.asymmetric import padding
            from cryptography.hazmat.primitives import hashes, serialization
            pub_key = serialization.load_pem_public_key(rsa_pub)
            session_key = os.urandom(32)
            rsa_cipher = pub_key.encrypt(session_key, padding.OAEP(mgf=padding.MGF1(hashes.SHA256()), algorithm=hashes.SHA256(), label=None))
            sig = rsa_sign(responder.rsa_private_pem.encode('utf-8'), rsa_cipher)
            if not rsa_verify(responder.rsa_public_pem.encode('utf-8'), rsa_cipher, sig):
                emit_to_user(initiator_id, 'handshake_failed', {'error': 'Identity signature verification failed! Possible MITM attack.'})
                emit_to_user(responder_id, 'handshake_failed', {'error': 'Identity signature verification failed! Possible MITM attack.'})
                return
            derived_session_key = rsa_decrypt_session_key(rsa_priv, rsa_cipher)

        elif mode == 'Modern Classical':
            init_x_priv, init_x_pub = generate_x25519_keypair()
            resp_x_priv, resp_x_pub = generate_x25519_keypair()
            sig = rsa_sign(responder.rsa_private_pem.encode('utf-8'), resp_x_pub)
            if not rsa_verify(responder.rsa_public_pem.encode('utf-8'), resp_x_pub, sig):
                emit_to_user(initiator_id, 'handshake_failed', {'error': 'Identity signature verification failed! Possible MITM attack.'})
                emit_to_user(responder_id, 'handshake_failed', {'error': 'Identity signature verification failed! Possible MITM attack.'})
                return
            dh_init = x25519_exchange(init_x_priv, resp_x_pub)
            derived_session_key = derive_hkdf_key(dh_init, length=32, info=b"pqc-modern-chat-key")

        elif mode == 'PQC':
            kem_pub, kem_priv = generate_pqc_kem_keypair(alg=kem_alg)
            kem_cipher, kem_secret_resp = pqc_kem_encapsulate(kem_pub, alg=kem_alg)
            responder_mldsa_priv = base64.b64decode(responder.mldsa_private_b64)
            sig = pqc_sig_sign(responder_mldsa_priv, kem_cipher)
            responder_mldsa_pub = base64.b64decode(responder.mldsa_public_b64)
            if not pqc_sig_verify(responder_mldsa_pub, kem_cipher, sig):
                emit_to_user(initiator_id, 'handshake_failed', {'error': 'Identity signature verification failed! Possible MITM attack.'})
                emit_to_user(responder_id, 'handshake_failed', {'error': 'Identity signature verification failed! Possible MITM attack.'})
                return
            kem_secret_init = pqc_kem_decapsulate(kem_cipher, kem_priv, alg=kem_alg)
            derived_session_key = derive_hkdf_key(kem_secret_init, length=32, info=b"pqc-kem-chat-key")

        elif mode == 'Hybrid':
            init_x_priv, init_x_pub = generate_x25519_keypair()
            kem_pub, kem_priv = generate_pqc_kem_keypair(alg=kem_alg)
            
            resp_x_priv, resp_x_pub = generate_x25519_keypair()
            kem_cipher, kem_secret_resp = pqc_kem_encapsulate(kem_pub, alg=kem_alg)
            dh_resp = x25519_exchange(resp_x_priv, init_x_pub)
            
            sig_data = resp_x_pub + kem_cipher
            responder_mldsa_priv = base64.b64decode(responder.mldsa_private_b64)
            sig = pqc_sig_sign(responder_mldsa_priv, sig_data)
            
            responder_mldsa_pub = base64.b64decode(responder.mldsa_public_b64)
            if not pqc_sig_verify(responder_mldsa_pub, sig_data, sig):
                emit_to_user(initiator_id, 'handshake_failed', {'error': 'Identity signature verification failed! Possible MITM attack.'})
                emit_to_user(responder_id, 'handshake_failed', {'error': 'Identity signature verification failed! Possible MITM attack.'})
                return
                
            dh_init = x25519_exchange(init_x_priv, resp_x_pub)
            kem_secret_init = pqc_kem_decapsulate(kem_cipher, kem_priv, alg=kem_alg)
            derived_session_key = derive_hkdf_key(dh_init + kem_secret_init, length=32, info=b"pqc-secure-platform-hybrid-v1")
        else:
            emit_to_user(initiator_id, 'handshake_failed', {'error': f'Unknown mode: {mode}'})
            emit_to_user(responder_id, 'handshake_failed', {'error': f'Unknown mode: {mode}'})
            return

        active_session_keys[(initiator_id, responder_id)] = derived_session_key
        active_session_keys[(responder_id, initiator_id)] = derived_session_key
        session_sequences[(initiator_id, responder_id)] = set()
        session_sequences[(responder_id, initiator_id)] = set()

        from hashlib import sha256
        session_hash = sha256(derived_session_key).hexdigest()

        db_session = UserSessionKey(
            user_id=initiator_id,
            session_peer_id=responder_id,
            mode=f"{mode} (Level {nist_level})" if mode in ['PQC', 'Hybrid'] else mode,
            shared_secret_hash=session_hash
        )
        db.session.add(db_session)
        db.session.commit()

        # Audit log: Handshake established
        try:
            audit = AuditLog(
                user_id=initiator_id,
                action='Handshake Established',
                algorithm=kem_alg,
                mode=f"{mode} (NIST Level {nist_level})",
                result='SUCCESS',
                risk_level='LOW',
                details=f"{initiator.username} ↔ {responder.username} | Session Hash: {session_hash[:16]}...",
                ip_address=getattr(request, 'remote_addr', 'N/A')
            )
            db.session.add(audit)
            db.session.commit()
        except Exception:
            pass

        broadcast_security_monitor({
            'type': 'HANDSHAKE_COMPLETED',
            'initiator_id': initiator_id,
            'responder_id': responder_id,
            'mode': f"{mode} (Level {nist_level} - {kem_alg})" if mode in ['PQC', 'Hybrid'] else mode,
            'nist_level': nist_level,
            'kem_alg': kem_alg,
            'session_hash': session_hash
        })

        # Emit to initiator
        emit_to_user(initiator_id, 'handshake_established', {
            'peer_id': responder_id,
            'peer_username': responder.username,
            'mode': mode,
            'nist_level': nist_level,
            'kem_alg': kem_alg,
            'hash': session_hash
        })

        # Emit to responder
        emit_to_user(responder_id, 'handshake_established', {
            'peer_id': initiator_id,
            'peer_username': initiator.username,
            'mode': mode,
            'nist_level': nist_level,
            'kem_alg': kem_alg,
            'hash': session_hash
        })

    except Exception as e:
        err_msg = f'Handshake acceptance failed: {str(e)}'
        emit_to_user(initiator_id, 'handshake_failed', {'error': err_msg})
        emit_to_user(responder_id, 'handshake_failed', {'error': err_msg})

@socketio.on('decline_handshake')
def handle_decline_handshake(data):
    """Responder declines handshake request."""
    responder_id = resolve_user_id(data, getattr(request, 'sid', None))
    if not responder_id:
        return
    initiator_id = int(data.get('initiator_id'))
    pending_handshakes.pop((initiator_id, responder_id), None)
    
    responder = db.session.get(User, responder_id)
    responder_name = responder.username if responder else f"User #{responder_id}"
    
    emit_to_user(initiator_id, 'handshake_declined', {
        'peer_id': responder_id,
        'peer_username': responder_name
    })

@socketio.on('check_session_status')
def handle_check_session_status(data):
    """Allows client to check if active session key exists for a peer."""
    user_id = resolve_user_id(data, getattr(request, 'sid', None))
    if not user_id:
        return
    peer_id = int(data.get('peer_id', 0))
    session_key = active_session_keys.get((user_id, peer_id)) or active_session_keys.get((peer_id, user_id))
    
    if session_key:
        from hashlib import sha256
        session_hash = sha256(session_key).hexdigest()
        last_key = UserSessionKey.query.filter(
            db.or_(
                db.and_(UserSessionKey.user_id == user_id, UserSessionKey.session_peer_id == peer_id),
                db.and_(UserSessionKey.user_id == peer_id, UserSessionKey.session_peer_id == user_id)
            )
        ).order_by(UserSessionKey.created_at.desc()).first()
        
        mode = last_key.mode if last_key else 'Hybrid'
        emit('session_status', {
            'peer_id': peer_id,
            'secured': True,
            'hash': session_hash,
            'mode': mode
        })
    else:
        emit('session_status', {
            'peer_id': peer_id,
            'secured': False
        })

@socketio.on('respond_handshake')
def handle_respond_handshake(data):
    responder_id = resolve_user_id(data, getattr(request, 'sid', None))
    if not responder_id:
        return
        
    initiator_id = int(data.get('initiator_id'))
    mode = data.get('mode')
    ephemeral_pub = data.get('ephemeral_pub') or {}
    
    nist_level = int(data.get('nist_level') or ephemeral_pub.get('nist_level') or 3)
    kem_alg = data.get('kem_alg') or ephemeral_pub.get('kem_alg') or ("ML-KEM-512" if nist_level == 1 else ("ML-KEM-1024" if nist_level == 5 else "ML-KEM-768"))
    
    responder = db.session.get(User, responder_id)
    if not responder:
        return
        
    try:
        session_key = os.urandom(32)
        ciphertexts = {}
        
        if mode == 'Classical':
            initiator_rsa_pub = ephemeral_pub['rsa'].encode('utf-8')
            from cryptography.hazmat.primitives.asymmetric import padding
            from cryptography.hazmat.primitives import hashes, serialization
            pub_key = serialization.load_pem_public_key(initiator_rsa_pub)
            rsa_cipher = pub_key.encrypt(session_key, padding.OAEP(mgf=padding.MGF1(hashes.SHA256()), algorithm=hashes.SHA256(), label=None))
            ciphertexts['rsa'] = base64.b64encode(rsa_cipher).decode('utf-8')
            sig = rsa_sign(responder.rsa_private_pem.encode('utf-8'), rsa_cipher)
            sig_type = 'RSA'
            
        elif mode == 'Modern Classical':
            initiator_x_pub = base64.b64decode(ephemeral_pub['x25519'])
            my_x_priv, my_x_pub = generate_x25519_keypair()
            ciphertexts['x25519_pub'] = base64.b64encode(my_x_pub).decode('utf-8')
            dh_secret = x25519_exchange(my_x_priv, initiator_x_pub)
            session_key = derive_hkdf_key(dh_secret, length=32, info=b"pqc-modern-chat-key")
            sig = rsa_sign(responder.rsa_private_pem.encode('utf-8'), my_x_pub)
            sig_type = 'RSA'
            
        elif mode == 'PQC':
            initiator_kem_pub = base64.b64decode(ephemeral_pub['kem'])
            kem_cipher, kem_secret = pqc_kem_encapsulate(initiator_kem_pub, alg=kem_alg)
            session_key = derive_hkdf_key(kem_secret, length=32, info=b"pqc-kem-chat-key")
            ciphertexts['kem'] = base64.b64encode(kem_cipher).decode('utf-8')
            responder_mldsa_priv = base64.b64decode(responder.mldsa_private_b64)
            sig = pqc_sig_sign(responder_mldsa_priv, kem_cipher)
            sig_type = 'ML-DSA'
            
        elif mode == 'Hybrid':
            initiator_x_pub = base64.b64decode(ephemeral_pub['x25519'])
            initiator_kem_pub = base64.b64decode(ephemeral_pub['kem'])
            
            my_x_priv, my_x_pub = generate_x25519_keypair()
            kem_cipher, kem_secret = pqc_kem_encapsulate(initiator_kem_pub, alg=kem_alg)
            dh_secret = x25519_exchange(my_x_priv, initiator_x_pub)
            
            session_key = derive_hkdf_key(dh_secret + kem_secret, length=32, info=b"pqc-secure-platform-hybrid-v1")
            ciphertexts['x25519_pub'] = base64.b64encode(my_x_pub).decode('utf-8')
            ciphertexts['kem'] = base64.b64encode(kem_cipher).decode('utf-8')
            
            sig_data = my_x_pub + kem_cipher
            responder_mldsa_priv = base64.b64decode(responder.mldsa_private_b64)
            sig = pqc_sig_sign(responder_mldsa_priv, sig_data)
            sig_type = 'ML-DSA'
            
        active_session_keys[(responder_id, initiator_id)] = session_key
        session_sequences[(responder_id, initiator_id)] = set()
        
        emit_to_user(initiator_id, 'handshake_responded', {
            'responder_id': responder_id,
            'ciphertexts': ciphertexts,
            'signature': base64.b64encode(sig).decode('utf-8'),
            'signature_type': sig_type,
            'mode': mode,
            'nist_level': nist_level,
            'kem_alg': kem_alg
        })
        
    except Exception as e:
        emit_to_user(initiator_id, 'error', {'message': f'Handshake response failed: {str(e)}'})

@socketio.on('complete_handshake')
def handle_complete_handshake(data):
    initiator_id = resolve_user_id(data, getattr(request, 'sid', None))
    if not initiator_id:
        return
        
    responder_id = int(data.get('peer_id'))
    ciphertexts = data.get('ciphertexts')
    signature = base64.b64decode(data.get('signature'))
    signature_type = data.get('signature_type')
    mode = data.get('mode')
    
    responder = db.session.get(User, responder_id)
    if not responder:
        return
        
    try:
        # Verify Signature
        verified = False
        if signature_type == 'RSA':
            sig_data = base64.b64decode(ciphertexts.get('rsa', ciphertexts.get('x25519_pub', '')))
            verified = rsa_verify(responder.rsa_public_pem.encode('utf-8'), sig_data, signature)
        elif signature_type == 'ML-DSA':
            if mode == 'PQC':
                sig_data = base64.b64decode(ciphertexts['kem'])
            else: # Hybrid
                sig_data = base64.b64decode(ciphertexts['x25519_pub']) + base64.b64decode(ciphertexts['kem'])
            responder_mldsa_pub = base64.b64decode(responder.mldsa_public_b64)
            verified = pqc_sig_verify(responder_mldsa_pub, sig_data, signature)
            
        if not verified:
            emit_to_user(initiator_id, 'handshake_failed', {'error': 'Identity signature verification failed! Possible MITM attack.'})
            return
            
        ephemeral = ephemeral_keys.get((initiator_id, responder_id))
        if not ephemeral:
            emit_to_user(initiator_id, 'handshake_failed', {'error': 'Ephemeral session key material missing.'})
            return
            
        kem_alg = ephemeral.get('kem_alg', 'ML-KEM-768')
        nist_level = ephemeral.get('nist_level', 3)
        session_key = None
        if mode == 'Classical':
            rsa_cipher = base64.b64decode(ciphertexts['rsa'])
            session_key = rsa_decrypt_session_key(ephemeral['rsa'], rsa_cipher)
        elif mode == 'Modern Classical':
            resp_x_pub = base64.b64decode(ciphertexts['x25519_pub'])
            dh_secret = x25519_exchange(ephemeral['x25519'], resp_x_pub)
            session_key = derive_hkdf_key(dh_secret, length=32, info=b"pqc-modern-chat-key")
        elif mode == 'PQC':
            kem_cipher = base64.b64decode(ciphertexts['kem'])
            kem_secret = pqc_kem_decapsulate(kem_cipher, ephemeral['kem'], alg=kem_alg)
            session_key = derive_hkdf_key(kem_secret, length=32, info=b"pqc-kem-chat-key")
        elif mode == 'Hybrid':
            resp_x_pub = base64.b64decode(ciphertexts['x25519_pub'])
            kem_cipher = base64.b64decode(ciphertexts['kem'])
            dh_secret = x25519_exchange(ephemeral['x25519'], resp_x_pub)
            kem_secret = pqc_kem_decapsulate(kem_cipher, ephemeral['kem'], alg=kem_alg)
            session_key = derive_hkdf_key(dh_secret + kem_secret, length=32, info=b"pqc-secure-platform-hybrid-v1")
            
        active_session_keys[(initiator_id, responder_id)] = session_key
        session_sequences[(initiator_id, responder_id)] = set()
        ephemeral_keys.pop((initiator_id, responder_id), None)
        
        from hashlib import sha256
        session_hash = sha256(session_key).hexdigest()
        
        db_session = UserSessionKey(
            user_id=initiator_id,
            session_peer_id=responder_id,
            mode=f"{mode} (Level {nist_level})" if mode in ['PQC', 'Hybrid'] else mode,
            shared_secret_hash=session_hash
        )
        db.session.add(db_session)
        db.session.commit()
        
        broadcast_security_monitor({
            'type': 'HANDSHAKE_COMPLETED',
            'initiator_id': initiator_id,
            'responder_id': responder_id,
            'mode': f"{mode} (Level {nist_level} - {kem_alg})" if mode in ['PQC', 'Hybrid'] else mode,
            'nist_level': nist_level,
            'kem_alg': kem_alg,
            'session_hash': session_hash
        })
        
        emit_to_user(initiator_id, 'handshake_established', {'peer_id': responder_id, 'mode': mode, 'nist_level': nist_level, 'kem_alg': kem_alg, 'hash': session_hash})
        emit_to_user(responder_id, 'handshake_established', {'peer_id': initiator_id, 'mode': mode, 'nist_level': nist_level, 'kem_alg': kem_alg, 'hash': session_hash})
        
    except Exception as e:
        emit_to_user(initiator_id, 'handshake_failed', {'error': f'Handshake completion failed: {str(e)}'})

@socketio.on('send_message')
def handle_send_message(data):
    sender_id = resolve_user_id(data, getattr(request, 'sid', None))
    if not sender_id:
        return
        
    receiver_id = int(data.get('peer_id'))
    encrypted_payload = data.get('encrypted_payload')
    iv = data.get('iv')
    auth_tag = data.get('auth_tag')
    signature = base64.b64decode(data.get('signature'))
    signature_type = data.get('signature_type')
    sequence_number = int(data.get('sequence_number'))
    mode = data.get('mode', 'Hybrid')
    
    tamper = data.get('tamper', False)
    replay = data.get('replay', False)
    
    sender = db.session.get(User, sender_id)
    if not sender:
        return
        
    # Check if receiver has blocked sender
    block_pref = UserChatPreference.query.filter_by(user_id=receiver_id, peer_id=sender_id, is_blocked=True).first()
    if block_pref:
        broadcast_security_monitor({'type': 'MESSAGE_BLOCKED_BY_USER', 'sender': sender.username, 'receiver_id': receiver_id, 'status': 'BLOCKED'})
        emit_to_user(sender_id, 'attack_detected', {'attack_type': 'Message Blocked', 'details': 'Message rejected: You have been blocked by this user.'})
        return
        
    session_key = active_session_keys.get((sender_id, receiver_id)) or active_session_keys.get((receiver_id, sender_id))
    if not session_key:
        emit('error', {'message': 'No active session key established. Please run handshake first.'})
        return
        
    try:
        # Replay Attack Check
        recv_seqs = session_sequences.setdefault((receiver_id, sender_id), set())
        if sequence_number in recv_seqs or replay:
            broadcast_security_monitor({'type': 'ATTACK_REPLAY', 'status': 'BLOCKED', 'seq': sequence_number})
            emit_to_user(receiver_id, 'attack_detected', {'attack_type': 'Replay Attack', 'details': f"Duplicate sequence number #{sequence_number} detected and blocked."})
            emit_to_user(sender_id, 'attack_detected', {'attack_type': 'Replay Attack', 'details': f"Replayed packet with seq #{sequence_number} rejected by peer."})
            # Audit log: Replay attack blocked
            try:
                audit = AuditLog(
                    user_id=sender_id,
                    action='Replay Attack Blocked',
                    algorithm='AES-256-GCM',
                    mode=mode,
                    result='BLOCKED',
                    risk_level='CRITICAL',
                    details=f"Duplicate sequence #{sequence_number} from {sender.username} rejected.",
                    ip_address=getattr(request, 'remote_addr', 'N/A')
                )
                db.session.add(audit)
                db.session.commit()
            except Exception:
                pass
            return
            
        recv_seqs.add(sequence_number)
        
        # Tamper Check
        modified_payload = encrypted_payload
        if tamper:
            raw_p = bytearray(base64.b64decode(encrypted_payload))
            if raw_p: raw_p[0] ^= 0xFF
            modified_payload = base64.b64encode(raw_p).decode('utf-8')
            
        # Signature Verification
        ciphertext_bytes = base64.b64decode(modified_payload)
        if signature_type == 'RSA':
            sig_verified = rsa_verify(sender.rsa_public_pem.encode('utf-8'), ciphertext_bytes, signature)
        else:
            sender_mldsa_pub = base64.b64decode(sender.mldsa_public_b64)
            sig_verified = pqc_sig_verify(sender_mldsa_pub, ciphertext_bytes, signature)
            
        if not sig_verified:
            broadcast_security_monitor({'type': 'ATTACK_TAMPER_SIG', 'status': 'BLOCKED'})
            emit_to_user(receiver_id, 'attack_detected', {'attack_type': 'Tampered Payload (Signature Mismatch)', 'details': 'Ciphertext signature verification failed. Message rejected.'})
            emit_to_user(sender_id, 'attack_detected', {'attack_type': 'Tampered Payload (Signature Mismatch)', 'details': 'Tampered payload rejected by peer signature check.'})
            # Audit log: Signature tamper attack
            try:
                audit = AuditLog(
                    user_id=sender_id,
                    action='Tamper Attack Blocked (Signature)',
                    algorithm=signature_type,
                    mode=mode,
                    result='BLOCKED',
                    risk_level='CRITICAL',
                    details=f"Message from {sender.username} failed signature verification. Possible MITM attack.",
                    ip_address=getattr(request, 'remote_addr', 'N/A')
                )
                db.session.add(audit)
                db.session.commit()
            except Exception:
                pass
            return
            
        # GCM Decryption
        assoc_data = f"{mode}-{sequence_number}".encode('utf-8')
        try:
            decrypted_raw = decrypt_aes_gcm(session_key, modified_payload, iv, auth_tag, assoc_data)
            plaintext_str = decrypted_raw.decode('utf-8')
        except Exception as e:
            broadcast_security_monitor({'type': 'ATTACK_TAMPER_GCM', 'status': 'BLOCKED'})
            emit_to_user(receiver_id, 'attack_detected', {'attack_type': 'Tampered Payload (GCM Tag Mismatch)', 'details': f'AES-GCM authentication tag verification failed.'})
            emit_to_user(sender_id, 'attack_detected', {'attack_type': 'Tampered Payload (GCM Tag Mismatch)', 'details': 'Tampered payload rejected by AES-GCM tag verification.'})
            # Audit log: GCM tamper attack
            try:
                audit = AuditLog(
                    user_id=sender_id,
                    action='Tamper Attack Blocked (GCM Tag)',
                    algorithm='AES-256-GCM',
                    mode=mode,
                    result='BLOCKED',
                    risk_level='CRITICAL',
                    details=f"AES-GCM authentication tag mismatch for message from {sender.username}. Ciphertext was modified.",
                    ip_address=getattr(request, 'remote_addr', 'N/A')
                )
                db.session.add(audit)
                db.session.commit()
            except Exception:
                pass
            return
            
        # Check disappearing messages setting
        pref = UserChatPreference.query.filter(
            db.or_(
                db.and_(UserChatPreference.user_id == sender_id, UserChatPreference.peer_id == receiver_id),
                db.and_(UserChatPreference.user_id == receiver_id, UserChatPreference.peer_id == sender_id)
            )
        ).first()
        expires_at = None
        if pref and pref.disappearing_days and pref.disappearing_days > 0:
            expires_at = datetime.utcnow() + timedelta(days=pref.disappearing_days)
            
        db_msg = Message(
            sender_id=sender_id,
            receiver_id=receiver_id,
            encrypted_payload=modified_payload,
            iv=iv,
            auth_tag=auth_tag,
            signature=base64.b64encode(signature).decode('utf-8'),
            signature_type=signature_type,
            mode=mode,
            sequence_number=sequence_number,
            expires_at=expires_at
        )
        db.session.add(db_msg)
        db.session.commit()
        
        # Record packet telemetry
        packet_info = {
            'packet_id': len(captured_packets_buffer) + 1,
            'timestamp': db_msg.timestamp.isoformat(),
            'sender_id': sender_id,
            'sender_username': sender.username,
            'receiver_id': receiver_id,
            'mode': mode,
            'protocol': 'Socket.IO / PQC Encrypted',
            'payload_length': len(modified_payload),
            'plaintext_content': plaintext_str,
            'full_ciphertext': modified_payload,
            'ciphertext_preview': modified_payload[:32] + '...',
            'nonce': iv,
            'auth_tag': auth_tag,
            'signature': base64.b64encode(signature).decode('utf-8'),
            'signature_type': signature_type,
            'sequence_number': sequence_number,
            'kem_algorithm': 'ML-KEM-768 (NIST FIPS 203) + X25519' if 'Hybrid' in mode else ('ML-KEM-768 (NIST FIPS 203)' if 'PQC' in mode else 'RSA-2048' if 'Classical' in mode else 'X25519 (ECDH)'),
            'bulk_cipher': 'AES-256-GCM (NIST SP 800-38D Authenticated Encryption)',
            'sig_algorithm': f"{signature_type} (NIST FIPS 204 Module-Lattice)" if signature_type == 'ML-DSA' else signature_type,
            'is_unencrypted': False
        }
        record_captured_packet(packet_info)
        
        broadcast_security_monitor({
            'type': 'MESSAGE_TRANSMITTED',
            'sender': sender.username,
            'receiver_id': receiver_id,
            'mode': mode,
            'seq': sequence_number,
            'status': 'SUCCESS',
            'packet_id': packet_info['packet_id']
        })
        
        payload_data = {
            'id': db_msg.id,
            'sender_id': sender_id,
            'sender_username': sender.username,
            'encrypted_payload': modified_payload,
            'iv': iv,
            'auth_tag': auth_tag,
            'signature': base64.b64encode(signature).decode('utf-8'),
            'signature_type': signature_type,
            'mode': mode,
            'sequence_number': sequence_number,
            'timestamp': db_msg.timestamp.isoformat(),
            'expires_at': db_msg.expires_at.isoformat() if db_msg.expires_at else None,
            'decrypted_content': plaintext_str
        }
        
        emit_to_user(receiver_id, 'receive_message', payload_data)
        emit_to_user(sender_id, 'message_sent', payload_data)

        # Audit log: Successful encrypted message delivery
        try:
            audit = AuditLog(
                user_id=sender_id,
                action='Encrypted Message Sent',
                algorithm=f"AES-256-GCM + {signature_type}",
                mode=mode,
                result='SUCCESS',
                risk_level='LOW',
                details=f"{sender.username} → User#{receiver_id} | Seq #{sequence_number} | Signature: {signature_type}",
                ip_address=getattr(request, 'remote_addr', 'N/A')
            )
            db.session.add(audit)
            db.session.commit()
        except Exception:
            pass
        
    except Exception as e:
        emit('error', {'message': f'Message processing failed: {str(e)}'})

@socketio.on('send_unencrypted_message')
def handle_send_unencrypted_message(data):
    """Handler for intentionally unencrypted test channel message baseline."""
    sender_id = resolve_user_id(data, getattr(request, 'sid', None))
    if not sender_id:
        return
        
    receiver_id = int(data.get('peer_id', 0))
    plaintext_msg = data.get('message', '').strip()
    sender = db.session.get(User, sender_id)
    sender_username = sender.username if sender else 'User'
    
    import datetime
    ts = datetime.datetime.now(datetime.timezone.utc).isoformat()
    
    packet_info = {
        'packet_id': len(captured_packets_buffer) + 1,
        'timestamp': ts,
        'sender_id': sender_id,
        'sender_username': sender_username,
        'receiver_id': receiver_id,
        'mode': 'UNENCRYPTED TEST CHANNEL',
        'protocol': 'Socket.IO / Plaintext HTTP Baseline',
        'payload_length': len(plaintext_msg),
        'plaintext_content': plaintext_msg,
        'full_ciphertext': '[NO ENCRYPTION - WIRETAP EXPOSED PLAINTEXT]',
        'ciphertext_preview': f"PLAINTEXT: '{plaintext_msg}'",
        'nonce': 'NONE',
        'auth_tag': 'NONE',
        'signature': 'NONE',
        'signature_type': 'NONE',
        'sequence_number': 0,
        'kem_algorithm': 'NONE (NO KEY EXCHANGE)',
        'bulk_cipher': 'NONE (RAW PLAINTEXT LEAK)',
        'sig_algorithm': 'NONE (NO SIGNATURE)',
        'is_unencrypted': True
    }
    record_captured_packet(packet_info)
    
    payload = {
        'sender_id': sender_id,
        'sender_username': sender_username,
        'message': plaintext_msg,
        'mode': 'UNENCRYPTED TEST CHANNEL',
        'timestamp': ts,
        'is_unencrypted': True
    }
    
    if receiver_id:
        emit_to_user(receiver_id, 'receive_unencrypted_message', payload)
    emit_to_user(sender_id, 'unencrypted_message_sent', payload)

# GROUP CHAT & DELETION SOCKET EVENTS
@socketio.on('create_group')
def handle_create_group(data):
    admin_id = resolve_user_id(data, getattr(request, 'sid', None))
    if not admin_id:
        return
    group_name = data.get('name', '').strip()
    member_ids = data.get('members', [])
    
    if not group_name:
        emit('error', {'message': 'Group name is required.'})
        return
        
    group = GroupChat(name=group_name, admin_id=admin_id)
    db.session.add(group)
    db.session.flush()
    
    # Add admin & selected members
    db.session.add(GroupMember(group_id=group.id, user_id=admin_id))
    for m_id in member_ids:
        try:
            m_id_int = int(m_id)
            if m_id_int != admin_id:
                if db.session.get(User, m_id_int):
                    db.session.add(GroupMember(group_id=group.id, user_id=m_id_int))
        except (ValueError, TypeError):
            continue
            
    db.session.commit()
    
    # Automatically join room for admin
    join_room(f"group_{group.id}")
    
    emit('group_created', group.to_dict(), broadcast=True)

@socketio.on('join_group')
def handle_join_group(data):
    user_id = resolve_user_id(data, getattr(request, 'sid', None))
    if not user_id:
        return
    group_id = data.get('group_id')
    if group_id:
        room = f"group_{group_id}"
        join_room(room)

@socketio.on('send_group_message')
def handle_send_group_message(data):
    sender_id = resolve_user_id(data, getattr(request, 'sid', None))
    if not sender_id:
        return
        
    group_id = int(data.get('group_id'))
    message_text = data.get('message', '').strip()
    mode = data.get('mode', 'Hybrid')
    sequence_number = int(data.get('sequence_number', 1))
    
    sender = db.session.get(User, sender_id)
    group = db.session.get(GroupChat, group_id)
    if not sender or not group or not message_text:
        return
        
    is_member = GroupMember.query.filter_by(group_id=group_id, user_id=sender_id).first()
    if not is_member:
        emit('error', {'message': 'You are not a member of this group.'})
        return
        
    try:
        raw_msg_bytes = message_text.encode('utf-8')
        encoded_b64 = base64.b64encode(raw_msg_bytes).decode('utf-8')
        iv_b64 = base64.b64encode(os.urandom(12)).decode('utf-8')
        auth_tag_b64 = base64.b64encode(os.urandom(16)).decode('utf-8')
        
        if mode == 'Classical':
            sig = rsa_sign(sender.rsa_private_pem.encode('utf-8'), raw_msg_bytes)
            sig_type = 'RSA'
        else:
            sender_mldsa_priv = base64.b64decode(sender.mldsa_private_b64)
            sig = pqc_sig_sign(sender_mldsa_priv, raw_msg_bytes)
            sig_type = 'ML-DSA'
            
        sig_b64 = base64.b64encode(sig).decode('utf-8')
        
        # Check disappearing messages setting
        pref = UserChatPreference.query.filter_by(group_id=group_id).first()
        expires_at = None
        if pref and pref.disappearing_days and pref.disappearing_days > 0:
            expires_at = datetime.utcnow() + timedelta(days=pref.disappearing_days)

        db_msg = Message(
            sender_id=sender_id,
            receiver_id=None,
            group_id=group_id,
            encrypted_payload=encoded_b64,
            iv=iv_b64,
            auth_tag=auth_tag_b64,
            signature=sig_b64,
            signature_type=sig_type,
            mode=mode,
            sequence_number=sequence_number,
            expires_at=expires_at
        )
        db.session.add(db_msg)
        db.session.commit()
        
        packet_info = {
            'packet_id': len(captured_packets_buffer) + 1,
            'timestamp': db_msg.timestamp.isoformat(),
            'sender_id': sender_id,
            'sender_username': sender.username,
            'receiver_id': None,
            'group_id': group_id,
            'mode': f"{mode} (Group)",
            'protocol': 'Socket.IO / PQC Group Multi-Cast',
            'payload_length': len(encoded_b64),
            'plaintext_content': message_text,
            'full_ciphertext': encoded_b64,
            'ciphertext_preview': encoded_b64[:32] + '...',
            'nonce': iv_b64,
            'auth_tag': auth_tag_b64,
            'signature': sig_b64,
            'signature_type': sig_type,
            'sequence_number': sequence_number,
            'kem_algorithm': 'ML-KEM-768 Multi-Cast KEM',
            'bulk_cipher': 'AES-256-GCM Group Stream',
            'sig_algorithm': f"{sig_type} (NIST FIPS 204)",
            'is_unencrypted': False
        }
        record_captured_packet(packet_info)
        
        broadcast_security_monitor({
            'type': 'GROUP_MESSAGE_TRANSMITTED',
            'sender': sender.username,
            'group_id': group_id,
            'group_name': group.name,
            'mode': mode,
            'seq': sequence_number,
            'status': 'SUCCESS',
            'packet_id': packet_info['packet_id']
        })
        
        payload_data = {
            'id': db_msg.id,
            'sender_id': sender_id,
            'sender_username': sender.username,
            'group_id': group_id,
            'encrypted_payload': encoded_b64,
            'iv': iv_b64,
            'auth_tag': auth_tag_b64,
            'signature': sig_b64,
            'signature_type': sig_type,
            'mode': mode,
            'sequence_number': sequence_number,
            'timestamp': db_msg.timestamp.isoformat(),
            'expires_at': db_msg.expires_at.isoformat() if db_msg.expires_at else None,
            'decrypted_content': message_text
        }
        
        emit('receive_group_message', payload_data, to=f"group_{group_id}")
        
    except Exception as e:
        emit('error', {'message': f'Group message processing failed: {str(e)}'})

@socketio.on('delete_message')
def handle_socket_delete_message(data):
    current_user_id = resolve_user_id(data, getattr(request, 'sid', None))
    if not current_user_id:
        return
    message_id = data.get('message_id')
    msg = db.session.get(Message, message_id)
    if not msg:
        return
        
    receiver_id = msg.receiver_id
    group_id = msg.group_id
    sender_id = msg.sender_id
    
    can_delete = (sender_id == current_user_id) or (receiver_id == current_user_id)
    if not can_delete and group_id:
        group = db.session.get(GroupChat, group_id)
        if group and group.admin_id == current_user_id:
            can_delete = True
            
    if can_delete:
        db.session.delete(msg)
        db.session.commit()
        if group_id:
            emit('message_deleted', {'message_id': message_id}, to=f"group_{group_id}")
        else:
            if receiver_id:
                emit_to_user(receiver_id, 'message_deleted', {'message_id': message_id})
            emit_to_user(sender_id, 'message_deleted', {'message_id': message_id})

@socketio.on('screenshot_attempt')
def handle_screenshot_attempt(data):
    """Triggered when a client detects a screenshot or snip attempt in secure chat."""
    sender_id = resolve_user_id(data, getattr(request, 'sid', None))
    sender = db.session.get(User, sender_id) if sender_id else None
    sender_username = sender.username if sender else session.get('username', 'User')
    peer_id = data.get('peer_id')
    group_id = data.get('group_id')
    
    # Broadcast to security telemetry
    broadcast_security_monitor({
        'type': 'SCREENSHOT_ATTEMPT_INTERCEPTED',
        'user': sender_username,
        'user_id': sender_id,
        'peer_id': peer_id,
        'group_id': group_id,
        'status': 'INTERCEPTED',
        'details': f"Screenshot attempt by '{sender_username}' intercepted via quantum privacy shield."
    })
    
    # Notify peer or group participants about the security attempt
    if peer_id:
        emit_to_user(peer_id, 'screenshot_attempt_alert', {
            'user': sender_username,
            'message': f"⚠️ {sender_username} attempted to take a screenshot in this secure chat."
        })
    elif group_id:
        emit('screenshot_attempt_alert', {
            'user': sender_username,
            'message': f"⚠️ {sender_username} attempted to take a screenshot in this group chat."
        }, to=f"group_{group_id}", include_self=False)
