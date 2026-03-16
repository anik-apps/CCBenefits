"""Tests for the unsubscribe endpoint."""

from datetime import datetime, timedelta
from datetime import timezone as dt_timezone

from ccbenefits.auth import create_opaque_token, hash_opaque_token, hash_password
from ccbenefits.models import UnsubscribeToken, User


def test_unsubscribe_endpoint(client, db_session):
    """Test the full unsubscribe flow."""
    user = User(
        email="unsub@test.com",
        hashed_password=hash_password("pass"),
        display_name="Unsub",
        notification_preferences={"email": {"expiring_credits": True}, "push": {}},
    )
    db_session.add(user)
    db_session.flush()

    raw_token = create_opaque_token()
    record = UnsubscribeToken(
        user_id=user.id,
        token_hash=hash_opaque_token(raw_token),
        notification_type="expiring_credits",
        expires_at=datetime.now(dt_timezone.utc) + timedelta(days=60),
    )
    db_session.add(record)
    db_session.commit()

    resp = client.get(f"/api/notifications/unsubscribe?token={raw_token}")
    assert resp.status_code == 200
    assert "Unsubscribed" in resp.text

    # Verify preference was updated
    db_session.refresh(user)
    assert user.notification_preferences["email"]["expiring_credits"] is False

    # Verify token is marked as used
    db_session.refresh(record)
    assert record.used_at is not None


def test_unsubscribe_already_used(client, db_session):
    """Using an already-used token shows 'already unsubscribed'."""
    user = User(
        email="used@test.com",
        hashed_password=hash_password("pass"),
        display_name="Used",
        notification_preferences={"email": {"expiring_credits": True}, "push": {}},
    )
    db_session.add(user)
    db_session.flush()

    raw_token = create_opaque_token()
    record = UnsubscribeToken(
        user_id=user.id,
        token_hash=hash_opaque_token(raw_token),
        notification_type="expiring_credits",
        expires_at=datetime.now(dt_timezone.utc) + timedelta(days=60),
        used_at=datetime.now(dt_timezone.utc),
    )
    db_session.add(record)
    db_session.commit()

    resp = client.get(f"/api/notifications/unsubscribe?token={raw_token}")
    assert resp.status_code == 200
    assert "Already unsubscribed" in resp.text


def test_unsubscribe_invalid_token(client):
    """Invalid token returns 400."""
    resp = client.get("/api/notifications/unsubscribe?token=invalid123")
    assert resp.status_code == 400
    assert "Invalid" in resp.text


def test_unsubscribe_expired_token(client, db_session):
    """Expired token returns 400."""
    user = User(
        email="expired@test.com",
        hashed_password=hash_password("pass"),
        display_name="Expired",
        notification_preferences={"email": {"expiring_credits": True}, "push": {}},
    )
    db_session.add(user)
    db_session.flush()

    raw_token = create_opaque_token()
    record = UnsubscribeToken(
        user_id=user.id,
        token_hash=hash_opaque_token(raw_token),
        notification_type="expiring_credits",
        expires_at=datetime.now(dt_timezone.utc) - timedelta(days=1),
    )
    db_session.add(record)
    db_session.commit()

    resp = client.get(f"/api/notifications/unsubscribe?token={raw_token}")
    assert resp.status_code == 400
    assert "expired" in resp.text.lower()
