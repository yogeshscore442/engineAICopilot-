import pytest
import json
from app import create_app, db
from app.models import User, Message, GroupChat, GroupMember

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

def test_password_register_and_login(client):
    r1 = register_user(client, 'alice')
    assert r1.status_code == 201
    
    r2 = login_user(client, 'alice')
    assert r2.status_code == 200
    assert r2.get_json()['user']['username'] == 'alice'

def test_group_chat_creation_and_listing(client):
    register_user(client, 'alice')
    register_user(client, 'bob')
    register_user(client, 'charlie')
    
    login_user(client, 'alice')
    
    users_resp = client.get('/api/users')
    assert users_resp.status_code == 200
    users = users_resp.get_json()
    bob_id = next(u['id'] for u in users if u['username'] == 'bob')
    charlie_id = next(u['id'] for u in users if u['username'] == 'charlie')
    
    create_resp = client.post('/api/groups', json={
        'name': 'Quantum SecOps',
        'members': [bob_id, charlie_id]
    })
    assert create_resp.status_code == 201
    group_data = create_resp.get_json()
    group_id = group_data['id']
    assert group_data['name'] == 'Quantum SecOps'
    assert group_data['admin'] == 'alice'
    
    groups_resp = client.get('/api/groups')
    assert groups_resp.status_code == 200
    groups = groups_resp.get_json()
    assert len(groups) == 1
    assert groups[0]['id'] == group_id
    assert groups[0]['is_admin'] is True
    assert groups[0]['member_count'] == 3
    
    login_user(client, 'bob')
    bob_groups_resp = client.get('/api/groups')
    assert bob_groups_resp.status_code == 200
    bob_groups = bob_groups_resp.get_json()
    assert len(bob_groups) == 1
    assert bob_groups[0]['id'] == group_id
    assert bob_groups[0]['is_admin'] is False

def test_chat_history_and_deletion(client):
    register_user(client, 'alice')
    register_user(client, 'bob')
    
    login_user(client, 'alice')
    me_resp = client.get('/auth/me')
    alice_id = me_resp.get_json()['user']['id']
    
    login_user(client, 'bob')
    me_resp_bob = client.get('/auth/me')
    bob_id = me_resp_bob.get_json()['user']['id']
    
    msg = Message(
        sender_id=alice_id,
        receiver_id=bob_id,
        encrypted_payload="dGVzdA==",
        iv="iv123",
        auth_tag="tag123",
        signature="sig123",
        signature_type="ML-DSA",
        mode="Hybrid",
        sequence_number=1
    )
    db.session.add(msg)
    db.session.commit()
    msg_id = msg.id
    
    login_user(client, 'alice')
    hist_resp = client.get(f'/api/chat/history?peer_id={bob_id}')
    assert hist_resp.status_code == 200
    history = hist_resp.get_json()
    assert len(history) == 1
    assert history[0]['id'] == msg_id
    
    del_msg_resp = client.delete(f'/api/chat/message/{msg_id}')
    assert del_msg_resp.status_code == 200
    
    hist_resp2 = client.get(f'/api/chat/history?peer_id={bob_id}')
    assert len(hist_resp2.get_json()) == 0
    
    m1 = Message(sender_id=alice_id, receiver_id=bob_id, encrypted_payload="p1", iv="iv", auth_tag="at", signature="s", signature_type="ML-DSA", mode="Hybrid", sequence_number=2)
    m2 = Message(sender_id=bob_id, receiver_id=alice_id, encrypted_payload="p2", iv="iv", auth_tag="at", signature="s", signature_type="ML-DSA", mode="Hybrid", sequence_number=3)
    db.session.add_all([m1, m2])
    db.session.commit()
    
    del_hist_resp = client.delete(f'/api/chat/history?peer_id={bob_id}')
    assert del_hist_resp.status_code == 200
    assert del_hist_resp.get_json()['deleted_count'] == 2
    
    hist_resp3 = client.get(f'/api/chat/history?peer_id={bob_id}')
    assert len(hist_resp3.get_json()) == 0

def test_group_deletion(client):
    register_user(client, 'alice')
    register_user(client, 'bob')
    
    login_user(client, 'alice')
    create_resp = client.post('/api/groups', json={'name': 'To Delete Group', 'members': []})
    group_id = create_resp.get_json()['id']
    
    del_resp = client.delete(f'/api/groups/{group_id}')
    assert del_resp.status_code == 200
    
    groups = client.get('/api/groups').get_json()
    assert len(groups) == 0
