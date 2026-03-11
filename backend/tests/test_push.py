"""Tests for the Expo Push notification sender."""

from unittest.mock import MagicMock, patch

import pytest

from ccbenefits.auth import hash_password
from ccbenefits.models import PushToken, User
from ccbenefits.push import send_push_notifications


@pytest.fixture()
def user(db_session):
    u = User(
        email="push@test.com",
        hashed_password=hash_password("pass"),
        display_name="Push User",
    )
    db_session.add(u)
    db_session.commit()
    db_session.refresh(u)
    return u


def test_send_push_success():
    """Mock httpx, verify returns correct count for successful sends."""
    mock_response = MagicMock()
    mock_response.json.return_value = {
        "data": [
            {"status": "ok", "id": "ticket-1"},
            {"status": "ok", "id": "ticket-2"},
        ]
    }

    with patch("ccbenefits.push.httpx.Client") as mock_client_cls:
        mock_client = MagicMock()
        mock_client.post.return_value = mock_response
        mock_client_cls.return_value.__enter__ = MagicMock(return_value=mock_client)
        mock_client_cls.return_value.__exit__ = MagicMock(return_value=False)

        count = send_push_notifications(
            tokens=["ExponentPushToken[aaa]", "ExponentPushToken[bbb]"],
            title="Test",
            body="Hello",
        )

    assert count == 2
    mock_client.post.assert_called_once()


def test_send_push_empty_tokens():
    """Empty token list returns 0 without making any HTTP calls."""
    count = send_push_notifications(tokens=[], title="Test", body="Hello")
    assert count == 0


def test_send_push_batch_stale_cleanup(db_session, user):
    """Create 3 PushToken records, mock DeviceNotRegistered for all, verify all deleted."""
    tokens = []
    for i in range(3):
        pt = PushToken(user_id=user.id, token=f"ExponentPushToken[stale{i}]")
        db_session.add(pt)
        tokens.append(pt.token)
    db_session.commit()

    # Verify tokens exist
    assert db_session.query(PushToken).filter_by(user_id=user.id).count() == 3

    mock_response = MagicMock()
    mock_response.json.return_value = {
        "data": [
            {
                "status": "error",
                "message": "device not registered",
                "details": {"error": "DeviceNotRegistered"},
            }
            for _ in range(3)
        ]
    }

    with patch("ccbenefits.push.httpx.Client") as mock_client_cls:
        mock_client = MagicMock()
        mock_client.post.return_value = mock_response
        mock_client_cls.return_value.__enter__ = MagicMock(return_value=mock_client)
        mock_client_cls.return_value.__exit__ = MagicMock(return_value=False)

        count = send_push_notifications(
            tokens=tokens,
            title="Test",
            body="Hello",
            db=db_session,
            notification_type="expiring_credits",
        )

    assert count == 0
    # All stale tokens should be purged
    assert db_session.query(PushToken).filter_by(user_id=user.id).count() == 0


def test_send_push_mixed_results():
    """Mix of ok and error tickets returns correct count."""
    mock_response = MagicMock()
    mock_response.json.return_value = {
        "data": [
            {"status": "ok", "id": "ticket-1"},
            {
                "status": "error",
                "message": "device not registered",
                "details": {"error": "DeviceNotRegistered"},
            },
        ]
    }

    with patch("ccbenefits.push.httpx.Client") as mock_client_cls:
        mock_client = MagicMock()
        mock_client.post.return_value = mock_response
        mock_client_cls.return_value.__enter__ = MagicMock(return_value=mock_client)
        mock_client_cls.return_value.__exit__ = MagicMock(return_value=False)

        count = send_push_notifications(
            tokens=["ExponentPushToken[aaa]", "ExponentPushToken[bbb]"],
            title="Test",
            body="Hello",
        )

    assert count == 1


def test_send_push_exception_returns_zero():
    """Network error returns 0 without raising."""
    with patch("ccbenefits.push.httpx.Client") as mock_client_cls:
        mock_client_cls.return_value.__enter__ = MagicMock(
            side_effect=Exception("Connection failed")
        )
        mock_client_cls.return_value.__exit__ = MagicMock(return_value=False)

        count = send_push_notifications(
            tokens=["ExponentPushToken[aaa]"],
            title="Test",
            body="Hello",
        )

    assert count == 0
