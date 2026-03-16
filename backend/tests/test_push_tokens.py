from ccbenefits.auth import hash_password
from ccbenefits.models import PushToken, User

VALID_TOKEN = "ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]"
ENDPOINT = "/api/notifications/push-token"


def test_register_push_token(client, auth_header):
    resp = client.post(
        ENDPOINT,
        json={"token": VALID_TOKEN, "device_name": "My Phone"},
        headers=auth_header,
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["token"] == VALID_TOKEN
    assert data["device_name"] == "My Phone"


def test_register_push_token_invalid_format(client, auth_header):
    resp = client.post(
        ENDPOINT,
        json={"token": "not-a-valid-token"},
        headers=auth_header,
    )
    assert resp.status_code == 422


def test_register_push_token_duplicate(client, auth_header):
    client.post(
        ENDPOINT,
        json={"token": VALID_TOKEN, "device_name": "Phone v1"},
        headers=auth_header,
    )
    resp = client.post(
        ENDPOINT,
        json={"token": VALID_TOKEN, "device_name": "Phone v2"},
        headers=auth_header,
    )
    assert resp.status_code == 201
    assert resp.json()["device_name"] == "Phone v2"


def test_register_push_token_reassign_from_other_user(client, db_session, auth_header):
    # Create another user who owns the token
    other_user = User(
        email="other@example.com",
        display_name="Other User",
        hashed_password=hash_password("testpass123"),
    )
    db_session.add(other_user)
    db_session.commit()
    db_session.refresh(other_user)

    push_token = PushToken(
        user_id=other_user.id, token=VALID_TOKEN, device_name="Other Device"
    )
    db_session.add(push_token)
    db_session.commit()

    # Register the same token as our test user — should reassign
    resp = client.post(
        ENDPOINT,
        json={"token": VALID_TOKEN, "device_name": "My Device"},
        headers=auth_header,
    )
    assert resp.status_code == 201

    # Verify old record is gone and new one exists for our user
    records = db_session.query(PushToken).filter_by(token=VALID_TOKEN).all()
    assert len(records) == 1
    assert records[0].device_name == "My Device"


def test_register_push_token_max_cap(client, auth_header, test_user, db_session):
    # Insert 10 tokens directly
    for i in range(10):
        tok = PushToken(
            user_id=test_user.id,
            token=f"ExponentPushToken[token{i:04d}]",
            device_name=f"Device {i}",
        )
        db_session.add(tok)
    db_session.commit()

    # 11th should fail
    resp = client.post(
        ENDPOINT,
        json={"token": "ExponentPushToken[overflow_token]", "device_name": "Too many"},
        headers=auth_header,
    )
    assert resp.status_code == 400
    assert "Maximum push tokens" in resp.json()["detail"]


def test_unregister_push_token(client, auth_header):
    # Register first
    client.post(
        ENDPOINT,
        json={"token": VALID_TOKEN},
        headers=auth_header,
    )
    # Unregister
    resp = client.post(
        f"{ENDPOINT}/unregister",
        json={"token": VALID_TOKEN},
        headers=auth_header,
    )
    assert resp.status_code == 200
    assert resp.json()["status"] == "deleted"


def test_unregister_push_token_not_found(client, auth_header):
    resp = client.post(
        f"{ENDPOINT}/unregister",
        json={"token": VALID_TOKEN},
        headers=auth_header,
    )
    assert resp.status_code == 404
