import pytest
from app import create_app, db, socketio
from app.models import User
from app.chat.events import active_session_keys

@pytest.fixture
def app_and_client():
    app = create_app({
        'TESTING': True,
        'SQLALCHEMY_DATABASE_URI': 'sqlite:///:memory:',
        'WTF_CSRF_ENABLED': False,
        'SECRET_KEY': 'test-secret'
    })
    
    with app.app_context():
        db.create_all()
        yield app
        db.session.remove()
        db.drop_all()

def test_interactive_handshake_flow(app_and_client):
    app = app_and_client
    
    # 1. Register Alice and Bob
    client = app.test_client()
    r1 = client.post('/auth/register', json={'username': 'alice', 'password': 'password123'})
    assert r1.status_code == 201
    r2 = client.post('/auth/register', json={'username': 'bob', 'password': 'password123'})
    assert r2.status_code == 201

    with app.app_context():
        alice = User.query.filter_by(username='alice').first()
        bob = User.query.filter_by(username='bob').first()
        assert alice is not None
        assert bob is not None
        alice_id = alice.id
        bob_id = bob.id

    # 2. Login Alice and Bob with separate test clients
    client_alice_http = app.test_client()
    client_alice_http.post('/auth/login', json={'username': 'alice', 'password': 'password123'})
    client_alice = socketio.test_client(app, flask_test_client=client_alice_http)

    client_bob_http = app.test_client()
    client_bob_http.post('/auth/login', json={'username': 'bob', 'password': 'password123'})
    client_bob = socketio.test_client(app, flask_test_client=client_bob_http)

    # Register their user sessions
    client_alice.emit('register_session', {'user_id': alice_id})
    client_bob.emit('register_session', {'user_id': bob_id})

    # Clear connection messages
    client_alice.get_received()
    client_bob.get_received()

    # 3. Alice initiates handshake to Bob
    client_alice.emit('initiate_handshake', {'peer_id': bob_id, 'mode': 'Hybrid', 'nist_level': 3})

    # Check Alice received handshake_request_sent
    alice_received = client_alice.get_received()
    sent_event = next((e for e in alice_received if e['name'] == 'handshake_request_sent'), None)
    assert sent_event is not None
    assert sent_event['args'][0]['peer_id'] == bob_id

    # Check Bob received handshake_request_received
    bob_received = client_bob.get_received()
    req_event = next((e for e in bob_received if e['name'] == 'handshake_request_received'), None)
    assert req_event is not None
    assert req_event['args'][0]['initiator_id'] == alice_id
    assert req_event['args'][0]['initiator_username'] == 'alice'
    assert req_event['args'][0]['mode'] == 'Hybrid'

    # 4. Bob accepts the handshake
    client_bob.emit('accept_handshake', {'initiator_id': alice_id, 'mode': 'Hybrid', 'nist_level': 3})

    # Verify handshake_established received by both
    alice_received_after = client_alice.get_received()
    bob_received_after = client_bob.get_received()

    alice_est = next((e for e in alice_received_after if e['name'] == 'handshake_established'), None)
    bob_est = next((e for e in bob_received_after if e['name'] == 'handshake_established'), None)

    assert alice_est is not None
    assert bob_est is not None
    assert alice_est['args'][0]['hash'] == bob_est['args'][0]['hash']
    assert alice_est['args'][0]['mode'] == 'Hybrid'

    # Verify session key stored in active_session_keys
    assert (alice_id, bob_id) in active_session_keys
    assert (bob_id, alice_id) in active_session_keys

    # 5. Alice encrypts and sends message to Bob
    enc_res = client_alice_http.post('/api/crypto/encrypt_message', json={
        'peer_id': bob_id,
        'message': 'Quantum Safe Message to Bob!',
        'sequence_number': 1,
        'mode': 'Hybrid'
    })
    assert enc_res.status_code == 200
    enc_data = enc_res.get_json()

    client_alice.emit('send_message', {
        'peer_id': bob_id,
        'encrypted_payload': enc_data['encrypted_payload'],
        'iv': enc_data['iv'],
        'auth_tag': enc_data['auth_tag'],
        'signature': enc_data['signature'],
        'signature_type': enc_data['signature_type'],
        'sequence_number': 1,
        'mode': 'Hybrid'
    })

    # Check Bob received message
    bob_msgs = client_bob.get_received()
    recv_msg_event = next((e for e in bob_msgs if e['name'] == 'receive_message'), None)
    assert recv_msg_event is not None
    assert recv_msg_event['args'][0]['decrypted_content'] == 'Quantum Safe Message to Bob!'

    # 6. Test Decline flow with new user
    client_charlie_http = app.test_client()
    client_charlie_http.post('/auth/register', json={'username': 'charlie', 'password': 'password123'})
    with app.app_context():
        charlie = User.query.filter_by(username='charlie').first()
        charlie_id = charlie.id

    client_charlie_http.post('/auth/login', json={'username': 'charlie', 'password': 'password123'})
    client_charlie = socketio.test_client(app, flask_test_client=client_charlie_http)
    client_charlie.emit('register_session', {'user_id': charlie_id})
    client_charlie.get_received()

    # Charlie initiates handshake to Alice
    client_charlie.emit('initiate_handshake', {'peer_id': alice_id, 'mode': 'PQC', 'nist_level': 3})

    # Alice declines
    client_alice.emit('decline_handshake', {'initiator_id': charlie_id})

    # Check Charlie received handshake_declined
    charlie_received = client_charlie.get_received()
    declined_event = next((e for e in charlie_received if e['name'] == 'handshake_declined'), None)
    assert declined_event is not None
    assert declined_event['args'][0]['peer_id'] == alice_id
