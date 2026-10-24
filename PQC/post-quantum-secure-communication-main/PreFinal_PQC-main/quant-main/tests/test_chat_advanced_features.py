import pytest
import json
from app import create_app, db
from app.models import User, GroupChat, GroupMember, UserChatPreference, AuditLog

@pytest.fixture
def client():
    app = create_app({
        'TESTING': True,
        'SQLALCHEMY_DATABASE_URI': 'sqlite:///:memory:',
        'WTF_CSRF_ENABLED': False,
        'SECRET_KEY': 'test-secret'
    })
    
    with app.test_client() as client:
        with app.app_context():
            db.create_all()
            yield client
            db.session.remove()
            db.drop_all()

def register_user(client, username, password="password123"):
    return client.post('/auth/register', json={'username': username, 'password': password})

def login_user(client, username, password="password123"):
    return client.post('/auth/login', json={'username': username, 'password': password})

def test_pin_and_archive_preferences(client):
    register_user(client, 'alice')
    register_user(client, 'bob')
    
    login_user(client, 'alice')
    users = client.get('/api/users').get_json()
    bob_id = next(u['id'] for u in users if u['username'] == 'bob')
    
    # 1. Toggle Pin on Bob
    r1 = client.post('/api/chat/preferences/pin', json={'peer_id': bob_id})
    assert r1.status_code == 200
    assert r1.get_json()['is_pinned'] is True
    
    # Toggle Pin again -> False
    r2 = client.post('/api/chat/preferences/pin', json={'peer_id': bob_id})
    assert r2.status_code == 200
    assert r2.get_json()['is_pinned'] is False
    
    # 2. Toggle Archive on Bob
    r3 = client.post('/api/chat/preferences/archive', json={'peer_id': bob_id})
    assert r3.status_code == 200
    assert r3.get_json()['is_archived'] is True
    
    # Check preferences listing
    prefs_resp = client.get('/api/chat/preferences')
    assert prefs_resp.status_code == 200
    prefs = prefs_resp.get_json()
    assert len(prefs) == 1
    assert prefs[0]['peer_id'] == bob_id
    assert prefs[0]['is_archived'] is True

def test_block_user_and_audit(client):
    register_user(client, 'alice')
    register_user(client, 'bob')
    
    login_user(client, 'alice')
    users = client.get('/api/users').get_json()
    bob_id = next(u['id'] for u in users if u['username'] == 'bob')
    
    # Block Bob
    r_block = client.post('/api/chat/preferences/block', json={'peer_id': bob_id})
    assert r_block.status_code == 200
    assert r_block.get_json()['is_blocked'] is True
    
    # Check Audit Log
    logs = AuditLog.query.filter_by(action='USER_BLOCKED').all()
    assert len(logs) == 1
    assert "bob" in logs[0].details.lower()
    
    # Unblock Bob
    r_unblock = client.post('/api/chat/preferences/block', json={'peer_id': bob_id})
    assert r_unblock.status_code == 200
    assert r_unblock.get_json()['is_blocked'] is False

def test_chat_lock_and_unlock_verify(client):
    register_user(client, 'alice')
    register_user(client, 'bob')
    
    login_user(client, 'alice')
    users = client.get('/api/users').get_json()
    bob_id = next(u['id'] for u in users if u['username'] == 'bob')
    
    # Set PIN lock with invalid short PIN
    r_fail = client.post('/api/chat/preferences/lock', json={'peer_id': bob_id, 'pin': '12', 'enable': True})
    assert r_fail.status_code == 400
    
    # Set valid 4-digit PIN lock
    r_lock = client.post('/api/chat/preferences/lock', json={'peer_id': bob_id, 'pin': '9876', 'enable': True})
    assert r_lock.status_code == 200
    assert r_lock.get_json()['is_locked'] is True
    
    # Verify with wrong PIN
    r_wrong = client.post('/api/chat/preferences/unlock_verify', json={'peer_id': bob_id, 'pin': '1111'})
    assert r_wrong.status_code == 400
    assert 'incorrect' in r_wrong.get_json()['error'].lower()
    
    # Verify with correct PIN
    r_correct = client.post('/api/chat/preferences/unlock_verify', json={'peer_id': bob_id, 'pin': '9876'})
    assert r_correct.status_code == 200
    assert r_correct.get_json()['unlocked'] is True
    
    # Disable PIN lock
    r_unlock = client.post('/api/chat/preferences/lock', json={'peer_id': bob_id, 'enable': False})
    assert r_unlock.status_code == 200
    assert r_unlock.get_json()['is_locked'] is False

def test_chat_info_endpoint(client):
    register_user(client, 'alice')
    register_user(client, 'bob')
    
    login_user(client, 'alice')
    users = client.get('/api/users').get_json()
    bob_id = next(u['id'] for u in users if u['username'] == 'bob')
    
    # Fetch Peer Info
    info_peer = client.get(f'/api/chat/info?peer_id={bob_id}')
    assert info_peer.status_code == 200
    p_data = info_peer.get_json()
    assert p_data['type'] == 'peer'
    assert p_data['username'] == 'bob'
    assert 'rsa_2048' in p_data['keys']
    assert 'mldsa_65' in p_data['keys']
    assert 'x25519' in p_data['keys']
    
    # Create group and fetch Group Info
    create_group = client.post('/api/groups', json={'name': 'Quantum Fortress', 'members': [bob_id]})
    group_id = create_group.get_json()['id']
    
    info_group = client.get(f'/api/chat/info?group_id={group_id}')
    assert info_group.status_code == 200
    g_data = info_group.get_json()
    assert g_data['type'] == 'group'
    assert g_data['name'] == 'Quantum Fortress'
    assert g_data['member_count'] == 2
    assert g_data['is_admin'] is True
