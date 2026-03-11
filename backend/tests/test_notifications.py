import html

import pytest

from ccbenefits.auth import hash_password
from ccbenefits.models import NotificationLog, User
from ccbenefits.notifications import (
    get_user_pref,
    is_already_sent,
    log_notification,
    render_notification_email,
)


@pytest.fixture()
def user(db_session):
    u = User(
        email="notif@test.com",
        hashed_password=hash_password("pass"),
        display_name="Notif User",
    )
    db_session.add(u)
    db_session.commit()
    db_session.refresh(u)
    return u


def test_dedup_not_sent(db_session, user):
    assert (
        is_already_sent(
            db_session,
            user_id=user.id,
            notification_type="expiring_credits",
            reference_key="benefit:1:period:2026-03-01",
        )
        is False
    )


def test_dedup_already_sent(db_session, user):
    log = NotificationLog(
        user_id=user.id,
        notification_type="expiring_credits",
        channel="email",
        reference_key="benefit:1:period:2026-03-01",
    )
    db_session.add(log)
    db_session.commit()
    assert (
        is_already_sent(
            db_session,
            user_id=user.id,
            notification_type="expiring_credits",
            reference_key="benefit:1:period:2026-03-01",
        )
        is True
    )


def test_log_notification(db_session, user):
    log_notification(
        db_session,
        user_id=user.id,
        notification_type="period_start",
        channel="email",
        reference_key="benefit:2:period:2026-04-01",
    )
    found = (
        db_session.query(NotificationLog)
        .filter_by(user_id=user.id, notification_type="period_start")
        .first()
    )
    assert found is not None
    assert found.reference_key == "benefit:2:period:2026-04-01"


def test_render_email_escapes_html():
    result = render_notification_email(
        "expiring_credits",
        user_name="<script>alert('xss')</script>",
        items=[
            {
                "name": "Uber Credit",
                "card": "Amex Plat",
                "amount": "$15",
                "expires": "Mar 14",
            }
        ],
    )
    assert "<script>" not in result
    assert html.escape("<script>alert('xss')</script>") in result
    assert "Uber Credit" in result


def test_render_email_has_unsubscribe():
    result = render_notification_email(
        "expiring_credits",
        user_name="Test",
        items=[
            {"name": "Credit", "card": "Card", "amount": "$10", "expires": "Mar 14"}
        ],
        unsubscribe_url="https://ccb.kumaranik.com/api/notifications/unsubscribe?token=abc",
    )
    assert "unsubscribe" in result.lower()


def test_get_user_pref_defaults(db_session):
    # User with no notification_preferences
    u_none = User(
        email="nopref@test.com",
        hashed_password=hash_password("pass"),
        display_name="NoPref",
        notification_preferences=None,
    )
    db_session.add(u_none)
    db_session.flush()
    assert get_user_pref(u_none, "email", "expiring_credits") is True

    # User with explicit opt-out
    u_out = User(
        email="optout@test.com",
        hashed_password=hash_password("pass"),
        display_name="OptOut",
        notification_preferences={
            "email": {"expiring_credits": False},
            "push": {},
        },
    )
    db_session.add(u_out)
    db_session.flush()
    assert get_user_pref(u_out, "email", "expiring_credits") is False
    assert get_user_pref(u_out, "email", "fee_approaching") is True  # not set = default True
