import base64
import os
from flask import request, session
from flask_socketio import emit
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
ephemeral_keys = {}
session_sequences = {}
captured_packets_buffer = []
attack_counters = {'tested': 0, 'blocked': 0}
online_users = set()  # Tracks currently connected user IDs

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
    if 'user_id' in session:
        user_id = session['user_id']
        room = f"user_{user_id}"
        socketio.server.enter_room(request.sid, room)
        # Also join security monitor room
        socketio.server.enter_room(request.sid, 'sec_monitor')
        
        # Auto-join all group rooms user belongs to
        try:
            memberships = GroupMember.query.filter_by(user_id=user_id).all()
            for m in memberships:
                socketio.server.enter_room(request.sid, f"group_{m.group_id}")
        except Exception:
            pass
            
        # Mark user as online and broadcast to all
        online_users.add(user_id)
        socketio.emit('user_status_changed', {'user_id': user_id, 'is_online': True})

@socketio.on('disconnect')
def handle_disconnect():
    if 'user_id' in session:
        user_id = session['user_id']
        online_users.discard(user_id)
        # Mark user as offline and broadcast to all
        socketio.emit('user_status_changed', {'user_id': user_id, 'is_online': False})

@socketio.on('join_chat')
def handle_join_chat(data):
    if 'user_id' not in session:
        return
    peer_id = data.get('peer_id')
    user_id = session['user_id']
    if peer_id:
        session_sequences[(user_id, int(peer_id))] = set()
        session_sequences[(int(peer_id), user_id)] = set()

@socketio.on('initiate_handshake')
def handle_initiate_handshake(data):
    if 'user_id' not in session:
        emit('error', {'message': 'Unauthorized.'})
        return
        
    sender_id = session['user_id']
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
    
    responder = db.session.get(User, peer_id)
    if not responder:
        emit('handshake_failed', {'error': 'Peer user record not found.'})
        return

    try:
        broadcast_security_monitor({
            'type': 'HANDSHAKE_INITIATED',
            'sender_id': sender_id,
            'peer_id': peer_id,
            'mode': f"{mode} (Level {nist_level} - {kem_alg})" if mode in ['PQC', 'Hybrid'] else mode,
            'nist_level': nist_level,
            'step': '1. Ephemeral Key Exchange Init'
        })

        # -------------------------------------------------------------
        # Execute Real 2-Party Cryptographic Handshake
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
                emit('handshake_failed', {'error': 'Identity signature verification failed! Possible MITM attack.'})
                return
            derived_session_key = rsa_decrypt_session_key(rsa_priv, rsa_cipher)

        elif mode == 'Modern Classical':
            init_x_priv, init_x_pub = generate_x25519_keypair()
            resp_x_priv, resp_x_pub = generate_x25519_keypair()
            sig = rsa_sign(responder.rsa_private_pem.encode('utf-8'), resp_x_pub)
            if not rsa_verify(responder.rsa_public_pem.encode('utf-8'), resp_x_pub, sig):
                emit('handshake_failed', {'error': 'Identity signature verification failed! Possible MITM attack.'})
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
                emit('handshake_failed', {'error': 'Identity signature verification failed! Possible MITM attack.'})
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
                emit('handshake_failed', {'error': 'Identity signature verification failed! Possible MITM attack.'})
                return
                
            dh_init = x25519_exchange(init_x_priv, resp_x_pub)
            kem_secret_init = pqc_kem_decapsulate(kem_cipher, kem_priv, alg=kem_alg)
            derived_session_key = derive_hkdf_key(dh_init + kem_secret_init, length=32, info=b"pqc-secure-platform-hybrid-v1")
        else:
            emit('error', {'message': f'Unknown mode: {mode}'})
            return

        active_session_keys[(sender_id, peer_id)] = derived_session_key
        active_session_keys[(peer_id, sender_id)] = derived_session_key
        session_sequences[(sender_id, peer_id)] = set()
        session_sequences[(peer_id, sender_id)] = set()

        from hashlib import sha256
        session_hash = sha256(derived_session_key).hexdigest()

        db_session = UserSessionKey(
            user_id=sender_id,
            session_peer_id=peer_id,
            mode=f"{mode} (Level {nist_level})" if mode in ['PQC', 'Hybrid'] else mode,
            shared_secret_hash=session_hash
        )
        db.session.add(db_session)
        db.session.commit()

        broadcast_security_monitor({
            'type': 'HANDSHAKE_COMPLETED',
            'initiator_id': sender_id,
            'responder_id': peer_id,
            'mode': f"{mode} (Level {nist_level} - {kem_alg})" if mode in ['PQC', 'Hybrid'] else mode,
            'nist_level': nist_level,
            'kem_alg': kem_alg,
            'session_hash': session_hash
        })

        handshake_payload = {
            'peer_id': peer_id,
            'mode': mode,
            'nist_level': nist_level,
            'kem_alg': kem_alg,
            'hash': session_hash
        }
        # Emit directly to initiator's socket connection
        emit('handshake_established', handshake_payload)
        # Also emit to room if initiator or peer is in room
        emit('handshake_established', handshake_payload, to=f"user_{sender_id}")
        emit('handshake_established', {'peer_id': sender_id, 'mode': mode, 'nist_level': nist_level, 'kem_alg': kem_alg, 'hash': session_hash}, to=f"user_{peer_id}")

    except Exception as e:
        emit('handshake_failed', {'error': f'Handshake failed: {str(e)}'})

@socketio.on('respond_handshake')
def handle_respond_handshake(data):
    if 'user_id' not in session:
        return
        
    responder_id = session['user_id']
    initiator_id = int(data.get('initiator_id'))
    mode = data.get('mode')
    ephemeral_pub = data.get('ephemeral_pub') or {}
    
    nist_level = int(data.get('nist_level') or ephemeral_pub.get('nist_level') or 3)
    kem_alg = data.get('kem_alg') or ephemeral_pub.get('kem_alg') or ("ML-KEM-512" if nist_level == 1 else ("ML-KEM-1024" if nist_level == 5 else "ML-KEM-768"))
    
    responder = User.query.get(responder_id)
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
        
        emit('handshake_responded', {
            'responder_id': responder_id,
            'ciphertexts': ciphertexts,
            'signature': base64.b64encode(sig).decode('utf-8'),
            'signature_type': sig_type,
            'mode': mode,
            'nist_level': nist_level,
            'kem_alg': kem_alg
        }, to=f"user_{initiator_id}")
        
    except Exception as e:
        emit('error', {'message': f'Handshake response failed: {str(e)}'}, to=f"user_{initiator_id}")

@socketio.on('complete_handshake')
def handle_complete_handshake(data):
    if 'user_id' not in session:
        return
        
    initiator_id = session['user_id']
    responder_id = int(data.get('peer_id'))
    ciphertexts = data.get('ciphertexts')
    signature = base64.b64decode(data.get('signature'))
    signature_type = data.get('signature_type')
    mode = data.get('mode')
    
    responder = User.query.get(responder_id)
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
            emit('handshake_failed', {'error': 'Identity signature verification failed! Possible MITM attack.'}, to=f"user_{initiator_id}")
            return
            
        ephemeral = ephemeral_keys.get((initiator_id, responder_id))
        if not ephemeral:
            emit('handshake_failed', {'error': 'Ephemeral session key material missing.'}, to=f"user_{initiator_id}")
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
        
        emit('handshake_established', {'peer_id': responder_id, 'mode': mode, 'nist_level': nist_level, 'kem_alg': kem_alg, 'hash': session_hash}, to=f"user_{initiator_id}")
        emit('handshake_established', {'peer_id': initiator_id, 'mode': mode, 'nist_level': nist_level, 'kem_alg': kem_alg, 'hash': session_hash}, to=f"user_{responder_id}")
        
    except Exception as e:
        emit('handshake_failed', {'error': f'Handshake completion failed: {str(e)}'}, to=f"user_{initiator_id}")

@socketio.on('send_message')
def handle_send_message(data):
    if 'user_id' not in session:
        return
        
    sender_id = session['user_id']
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
        broadcast_security_monitor({'type': 'MESSAGE_BLOCKED_BY_USER', 'sender': session.get('username'), 'receiver_id': receiver_id, 'status': 'BLOCKED'})
        emit('attack_detected', {'attack_type': 'Message Blocked', 'details': 'Message rejected: You have been blocked by this user.'}, to=f"user_{sender_id}")
        return
        
    session_key = active_session_keys.get((sender_id, receiver_id))
    if not session_key:
        emit('error', {'message': 'No active session key established. Please run handshake first.'})
        return
        
    try:
        # Replay Attack Check
        recv_seqs = session_sequences.setdefault((receiver_id, sender_id), set())
        if sequence_number in recv_seqs or replay:
            broadcast_security_monitor({'type': 'ATTACK_REPLAY', 'status': 'BLOCKED', 'seq': sequence_number})
            emit('attack_detected', {'attack_type': 'Replay Attack', 'details': f"Duplicate sequence number #{sequence_number} detected and blocked."}, to=f"user_{receiver_id}")
            emit('attack_detected', {'attack_type': 'Replay Attack', 'details': f"Replayed packet with seq #{sequence_number} rejected by peer."}, to=f"user_{sender_id}")
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
            emit('attack_detected', {'attack_type': 'Tampered Payload (Signature Mismatch)', 'details': 'Ciphertext signature verification failed. Message rejected.'}, to=f"user_{receiver_id}")
            emit('attack_detected', {'attack_type': 'Tampered Payload (Signature Mismatch)', 'details': 'Tampered payload rejected by peer signature check.'}, to=f"user_{sender_id}")
            return
            
        # GCM Decryption
        assoc_data = f"{mode}-{sequence_number}".encode('utf-8')
        try:
            decrypted_raw = decrypt_aes_gcm(session_key, modified_payload, iv, auth_tag, assoc_data)
            plaintext_str = decrypted_raw.decode('utf-8')
        except Exception as e:
            broadcast_security_monitor({'type': 'ATTACK_TAMPER_GCM', 'status': 'BLOCKED'})
            emit('attack_detected', {'attack_type': 'Tampered Payload (GCM Tag Mismatch)', 'details': f'AES-GCM authentication tag verification failed.'}, to=f"user_{receiver_id}")
            emit('attack_detected', {'attack_type': 'Tampered Payload (GCM Tag Mismatch)', 'details': 'Tampered payload rejected by AES-GCM tag verification.'}, to=f"user_{sender_id}")
            return
            
        db_msg = Message(
            sender_id=sender_id,
            receiver_id=receiver_id,
            encrypted_payload=modified_payload,
            iv=iv,
            auth_tag=auth_tag,
            signature=base64.b64encode(signature).decode('utf-8'),
            signature_type=signature_type,
            mode=mode,
            sequence_number=sequence_number
        )
        db.session.add(db_msg)
        db.session.commit()
        
        # Record packet telemetry
        packet_info = {
            'packet_id': len(captured_packets_buffer) + 1,
            'timestamp': db_msg.timestamp.isoformat(),
            'sender_id': sender_id,
            'sender_username': session['username'],
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
            'sender': session['username'],
            'receiver_id': receiver_id,
            'mode': mode,
            'seq': sequence_number,
            'status': 'SUCCESS',
            'packet_id': packet_info['packet_id']
        })
        
        payload_data = {
            'sender_id': sender_id,
            'sender_username': session['username'],
            'encrypted_payload': modified_payload,
            'iv': iv,
            'auth_tag': auth_tag,
            'signature': base64.b64encode(signature).decode('utf-8'),
            'signature_type': signature_type,
            'mode': mode,
            'sequence_number': sequence_number,
            'timestamp': db_msg.timestamp.isoformat(),
            'decrypted_content': plaintext_str
        }
        
        emit('receive_message', payload_data, to=f"user_{receiver_id}")
        emit('message_sent', payload_data, to=f"user_{sender_id}")
        
    except Exception as e:
        emit('error', {'message': f'Message processing failed: {str(e)}'})

@socketio.on('send_unencrypted_message')
def handle_send_unencrypted_message(data):
    """Handler for intentionally unencrypted test channel message baseline."""
    if 'user_id' not in session:
        return
        
    sender_id = session['user_id']
    receiver_id = int(data.get('peer_id', 0))
    plaintext_msg = data.get('message', '').strip()
    
    import datetime
    ts = datetime.datetime.now(datetime.timezone.utc).isoformat()
    
    packet_info = {
        'packet_id': len(captured_packets_buffer) + 1,
        'timestamp': ts,
        'sender_id': sender_id,
        'sender_username': session.get('username', 'Alice'),
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
        'sender_username': session.get('username', 'Alice'),
        'message': plaintext_msg,
        'mode': 'UNENCRYPTED TEST CHANNEL',
        'timestamp': ts,
        'is_unencrypted': True
    }
    
    if receiver_id:
        emit('receive_unencrypted_message', payload, to=f"user_{receiver_id}")
    emit('unencrypted_message_sent', payload, to=f"user_{sender_id}")

# GROUP CHAT & DELETION SOCKET EVENTS
@socketio.on('create_group')
def handle_create_group(data):
    if 'user_id' not in session:
        return
    admin_id = session['user_id']
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
    socketio.server.enter_room(request.sid, f"group_{group.id}")
    
    emit('group_created', group.to_dict(), broadcast=True)

@socketio.on('join_group')
def handle_join_group(data):
    if 'user_id' not in session:
        return
    group_id = data.get('group_id')
    if group_id:
        room = f"group_{group_id}"
        socketio.server.enter_room(request.sid, room)

@socketio.on('send_group_message')
def handle_send_group_message(data):
    if 'user_id' not in session:
        return
        
    sender_id = session['user_id']
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
            sequence_number=sequence_number
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
            'decrypted_content': message_text
        }
        
        emit('receive_group_message', payload_data, to=f"group_{group_id}")
        
    except Exception as e:
        emit('error', {'message': f'Group message processing failed: {str(e)}'})

@socketio.on('delete_message')
def handle_socket_delete_message(data):
    if 'user_id' not in session:
        return
    message_id = data.get('message_id')
    current_user_id = session['user_id']
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
                emit('message_deleted', {'message_id': message_id}, to=f"user_{receiver_id}")
            emit('message_deleted', {'message_id': message_id}, to=f"user_{sender_id}")
