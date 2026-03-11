from unittest.mock import patch

from freezegun import freeze_time

from ccbenefits.scheduler import get_users_for_notification_hour


def test_get_users_for_notification_hour(db_session):
    """Users whose notification_hour matches the current UTC-mapped hour are returned."""
    from ccbenefits.auth import hash_password
    from ccbenefits.models import User

    u1 = User(
        email="u1@test.com",
        hashed_password=hash_password("pass"),
        display_name="U1",
        notification_preferences={
            "email": {"expiring_credits": True},
            "push": {},
            "notification_hour": 9,
        },
        timezone="UTC",
        is_verified=True,
        is_active=True,
    )
    u2 = User(
        email="u2@test.com",
        hashed_password=hash_password("pass"),
        display_name="U2",
        notification_preferences={
            "email": {"expiring_credits": True},
            "push": {},
            "notification_hour": 14,
        },
        timezone="UTC",
        is_verified=True,
        is_active=True,
    )
    db_session.add_all([u1, u2])
    db_session.commit()

    users = get_users_for_notification_hour(db_session, 9)
    emails = [u.email for u in users]
    assert "u1@test.com" in emails
    assert "u2@test.com" not in emails


@freeze_time("2026-03-10T14:00:00Z")
def test_get_users_for_notification_hour_with_timezone(db_session):
    """At 2026-03-10T14:00Z, New York is EDT (UTC-4), so local time = 10:00.
    A user with notification_hour=10 in America/New_York should match UTC hour 14."""
    from ccbenefits.auth import hash_password
    from ccbenefits.models import User

    u = User(
        email="ny@test.com",
        hashed_password=hash_password("pass"),
        display_name="NY",
        notification_preferences={
            "email": {"expiring_credits": True},
            "push": {},
            "notification_hour": 10,
        },
        timezone="America/New_York",
        is_verified=True,
        is_active=True,
    )
    db_session.add(u)
    db_session.commit()

    users = get_users_for_notification_hour(db_session, 14)
    emails = [u.email for u in users]
    assert "ny@test.com" in emails

    users = get_users_for_notification_hour(db_session, 13)
    emails = [u.email for u in users]
    assert "ny@test.com" not in emails


def test_scheduler_does_not_start_when_disabled():
    """Scheduler should not start when SCHEDULER_ENABLED is False."""
    from ccbenefits.scheduler import scheduler, start_scheduler

    with patch("ccbenefits.scheduler.config") as mock_config:
        mock_config.SCHEDULER_ENABLED = False
        start_scheduler()
        assert not scheduler.running
