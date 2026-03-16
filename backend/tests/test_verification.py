from datetime import datetime, timedelta
from datetime import timezone as dt_timezone
from unittest.mock import patch

from ccbenefits.auth import create_opaque_token, hash_opaque_token
from ccbenefits.models import User


def _auth(client, email="user@test.com") -> dict:
    client.post("/api/auth/register", json={
        "email": email, "password": "password123", "display_name": "T",
    })
    resp = client.post("/api/auth/login", json={
        "email": email, "password": "password123",
    })
    return {"Authorization": f"Bearer {resp.json()['access_token']}"}


def test_register_returns_is_verified_false(client):
    resp = client.post("/api/auth/register", json={
        "email": "new@test.com", "password": "password123", "display_name": "N",
    })
    assert resp.status_code == 201
    assert resp.json()["user"]["is_verified"] is False


def test_register_creates_verification_token(client, db_session):
    client.post("/api/auth/register", json={
        "email": "verify@test.com", "password": "password123", "display_name": "V",
    })
    user = db_session.query(User).filter(User.email == "verify@test.com").first()
    assert user is not None
    assert user.is_verified is False
    assert user.verification_token is not None
    assert user.verification_token_expires is not None


def test_verify_email_valid_token(client, db_session):
    client.post("/api/auth/register", json={
        "email": "valid@test.com", "password": "password123", "display_name": "V",
    })
    user = db_session.query(User).filter(User.email == "valid@test.com").first()

    # Create a known token and set it on the user
    raw_token = create_opaque_token()
    user.verification_token = hash_opaque_token(raw_token)
    user.verification_token_expires = datetime.now(dt_timezone.utc).replace(tzinfo=None) + timedelta(hours=24)
    db_session.commit()

    resp = client.post("/api/auth/verify-email", json={"token": raw_token})
    assert resp.status_code == 200
    assert resp.json()["message"] == "Email verified successfully"

    db_session.refresh(user)
    assert user.is_verified is True
    assert user.verification_token is None


def test_verify_email_invalid_token(client):
    resp = client.post("/api/auth/verify-email", json={"token": "invalid-token"})
    assert resp.status_code == 400


def test_verify_email_expired_token(client, db_session):
    client.post("/api/auth/register", json={
        "email": "expired@test.com", "password": "password123", "display_name": "E",
    })
    user = db_session.query(User).filter(User.email == "expired@test.com").first()

    raw_token = create_opaque_token()
    user.verification_token = hash_opaque_token(raw_token)
    user.verification_token_expires = datetime.now(dt_timezone.utc).replace(tzinfo=None) - timedelta(hours=1)
    db_session.commit()

    resp = client.post("/api/auth/verify-email", json={"token": raw_token})
    assert resp.status_code == 400
    assert "expired" in resp.json()["detail"].lower()


def test_verify_email_single_use(client, db_session):
    client.post("/api/auth/register", json={
        "email": "single@test.com", "password": "password123", "display_name": "S",
    })
    user = db_session.query(User).filter(User.email == "single@test.com").first()

    raw_token = create_opaque_token()
    user.verification_token = hash_opaque_token(raw_token)
    user.verification_token_expires = datetime.now(dt_timezone.utc).replace(tzinfo=None) + timedelta(hours=24)
    db_session.commit()

    # First use succeeds
    resp = client.post("/api/auth/verify-email", json={"token": raw_token})
    assert resp.status_code == 200

    # Second use fails
    resp = client.post("/api/auth/verify-email", json={"token": raw_token})
    assert resp.status_code == 400


def test_resend_verification_unverified(client, db_session):
    headers = _auth(client, "unverified@test.com")
    user = db_session.query(User).filter(User.email == "unverified@test.com").first()

    # Clear token to simulate expired state
    user.verification_token = None
    user.verification_token_expires = None
    db_session.commit()

    resp = client.post("/api/auth/resend-verification", headers=headers)
    assert resp.status_code == 200

    db_session.refresh(user)
    assert user.verification_token is not None
    assert user.verification_token_expires is not None


def test_resend_verification_already_verified(client, db_session):
    headers = _auth(client, "verified@test.com")
    user = db_session.query(User).filter(User.email == "verified@test.com").first()
    user.is_verified = True
    db_session.commit()

    resp = client.post("/api/auth/resend-verification", headers=headers)
    assert resp.status_code == 400
    assert "already verified" in resp.json()["detail"].lower()


def test_resend_verification_rate_limited(client, db_session):
    headers = _auth(client, "ratelimit@test.com")
    # Token was just created during register — should be rate limited
    resp = client.post("/api/auth/resend-verification", headers=headers)
    assert resp.status_code == 429


@patch("ccbenefits.routers.auth.send_verification_email")
def test_register_sends_verification_email(mock_send, client):
    resp = client.post("/api/auth/register", json={
        "email": "emailsend@test.com", "password": "password123", "display_name": "E",
    })
    assert resp.status_code == 201
    mock_send.assert_called_once()
    call_args = mock_send.call_args
    assert call_args[0][1] == "emailsend@test.com"  # to
    assert len(call_args[0][2]) == 64  # raw token (32 bytes hex)
