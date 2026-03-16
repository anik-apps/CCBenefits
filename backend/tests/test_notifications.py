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


# --- check_expiring_credits tests ---

from freezegun import freeze_time


@freeze_time("2026-03-28T14:00:00Z")
def test_check_expiring_credits_fires_3_days_before_month_end(db_session):
    """Pin date to March 28 — 3 days before March 31 period end."""
    from unittest.mock import patch

    from ccbenefits.models import BenefitTemplate, CardTemplate, UserCard
    from ccbenefits.notifications import check_expiring_credits

    user = User(
        email="expiry@test.com",
        hashed_password=hash_password("pass"),
        display_name="Expiry",
        is_verified=True,
        notification_preferences={
            "email": {"expiring_credits": True},
            "push": {},
            "notification_hour": 9,
        },
    )
    db_session.add(user)
    db_session.flush()

    template = db_session.query(CardTemplate).first()
    card = UserCard(user_id=user.id, card_template_id=template.id)
    db_session.add(card)
    db_session.flush()

    # Get a monthly benefit
    benefit = db_session.query(BenefitTemplate).filter_by(
        card_template_id=template.id, period_type="monthly"
    ).first()

    assert benefit is not None, "Seed data missing monthly benefit"
    with patch("ccbenefits.notifications.send_notification_email") as mock_send, \
         patch("ccbenefits.notifications.send_notification_push"):
        check_expiring_credits(db_session, [user])
        # March 28 is 3 days before March 31 — should fire
        assert mock_send.called


@freeze_time("2026-03-15T14:00:00Z")
def test_check_expiring_credits_does_not_fire_far_from_end(db_session):
    """March 15 is 16 days before March 31 — should NOT fire."""
    from unittest.mock import patch

    from ccbenefits.models import CardTemplate, UserCard
    from ccbenefits.notifications import check_expiring_credits

    user = User(
        email="noexpiry@test.com",
        hashed_password=hash_password("pass"),
        display_name="NoExpiry",
        is_verified=True,
        notification_preferences={
            "email": {"expiring_credits": True},
            "push": {},
            "notification_hour": 9,
        },
    )
    db_session.add(user)
    db_session.flush()

    template = db_session.query(CardTemplate).first()
    card = UserCard(user_id=user.id, card_template_id=template.id)
    db_session.add(card)
    db_session.flush()

    with patch("ccbenefits.notifications.send_notification_email") as mock_send, \
         patch("ccbenefits.notifications.send_notification_push"):
        check_expiring_credits(db_session, [user])
        assert not mock_send.called


def test_check_expiring_credits_respects_preference(db_session):
    """User with expiring_credits=False for both channels should NOT send anything."""
    from unittest.mock import patch

    from ccbenefits.models import CardTemplate, NotificationLog, UserCard
    from ccbenefits.notifications import check_expiring_credits

    user = User(
        email="nonotif@test.com",
        hashed_password=hash_password("pass"),
        display_name="NoNotif",
        is_verified=True,
        notification_preferences={
            "email": {"expiring_credits": False},
            "push": {"expiring_credits": False},
            "notification_hour": 9,
        },
    )
    db_session.add(user)
    db_session.flush()

    template = db_session.query(CardTemplate).first()
    card = UserCard(user_id=user.id, card_template_id=template.id)
    db_session.add(card)
    db_session.flush()

    with freeze_time("2026-03-28T14:00:00Z"):
        with patch("ccbenefits.notifications.get_email_sender") as mock_get_sender:
            check_expiring_credits(db_session, [user])
            # Email sender should not be called (pref check inside send_notification_email)
            mock_get_sender.assert_not_called()

    # No notification logs should exist (both email and push prefs are off)
    assert db_session.query(NotificationLog).filter_by(user_id=user.id).count() == 0


# --- check_period_transitions tests ---


@freeze_time("2026-04-01T10:00:00Z")
def test_check_period_start_fires_on_first_day(db_session):
    """April 1 is the first day of a monthly period — should fire period_start."""
    from unittest.mock import patch

    from ccbenefits.models import BenefitTemplate, CardTemplate, UserCard
    from ccbenefits.notifications import check_period_transitions

    user = User(
        email="pstart@test.com",
        hashed_password=hash_password("pass"),
        display_name="PStart",
        is_verified=True,
        notification_preferences={
            "email": {"period_start": True, "unused_recap": False},
            "push": {},
        },
    )
    db_session.add(user)
    db_session.flush()

    template = db_session.query(CardTemplate).first()
    card = UserCard(user_id=user.id, card_template_id=template.id)
    db_session.add(card)
    db_session.flush()

    benefit = db_session.query(BenefitTemplate).filter_by(
        card_template_id=template.id, period_type="monthly"
    ).first()

    assert benefit is not None, "Seed data missing monthly benefit"
    with patch("ccbenefits.notifications.send_notification_email") as mock_send, \
         patch("ccbenefits.notifications.send_notification_push"):
        check_period_transitions(db_session, [user])
        assert mock_send.called
        # Find the period_start call among potentially multiple calls
        subjects = [c[0][4] for c in mock_send.call_args_list]
        assert "New benefit period started" in subjects


@freeze_time("2026-04-01T10:00:00Z")
def test_check_unused_recap_fires_day_after_period_end(db_session):
    """April 1 — yesterday was March 31 (end of monthly period). Unused benefits should trigger recap."""
    from unittest.mock import patch

    from ccbenefits.models import BenefitTemplate, CardTemplate, UserCard
    from ccbenefits.notifications import check_period_transitions

    user = User(
        email="recap@test.com",
        hashed_password=hash_password("pass"),
        display_name="Recap",
        is_verified=True,
        notification_preferences={
            "email": {"period_start": False, "unused_recap": True},
            "push": {},
        },
    )
    db_session.add(user)
    db_session.flush()

    template = db_session.query(CardTemplate).first()
    card = UserCard(user_id=user.id, card_template_id=template.id)
    db_session.add(card)
    db_session.flush()

    benefit = db_session.query(BenefitTemplate).filter_by(
        card_template_id=template.id, period_type="monthly"
    ).first()

    assert benefit is not None, "Seed data missing monthly benefit"
    # No usage logged for the March period — should fire unused_recap
    with patch("ccbenefits.notifications.send_notification_email") as mock_send, \
         patch("ccbenefits.notifications.send_notification_push"):
        check_period_transitions(db_session, [user])
        assert mock_send.called
        # Find the unused_recap call among potentially multiple calls
        subjects = [c[0][4] for c in mock_send.call_args_list]
        assert "Credits you missed last period" in subjects


@freeze_time("2026-04-01T10:00:00Z")
def test_check_period_start_respects_preference(db_session):
    """User with period_start=False and unused_recap=False should NOT send anything."""
    from unittest.mock import patch

    from ccbenefits.models import CardTemplate, NotificationLog, UserCard
    from ccbenefits.notifications import check_period_transitions

    user = User(
        email="nopstart@test.com",
        hashed_password=hash_password("pass"),
        display_name="NoPStart",
        is_verified=True,
        notification_preferences={
            "email": {"period_start": False, "unused_recap": False},
            "push": {"period_start": False, "unused_recap": False},
        },
    )
    db_session.add(user)
    db_session.flush()

    template = db_session.query(CardTemplate).first()
    card = UserCard(user_id=user.id, card_template_id=template.id)
    db_session.add(card)
    db_session.flush()

    with patch("ccbenefits.notifications.get_email_sender") as mock_get_sender:
        check_period_transitions(db_session, [user])
        mock_get_sender.assert_not_called()

    assert db_session.query(NotificationLog).filter_by(user_id=user.id).count() == 0


@freeze_time("2026-04-01T10:00:00Z")
def test_check_unused_recap_respects_preference(db_session):
    """User with unused_recap=False for both channels should NOT send anything."""
    from unittest.mock import patch

    from ccbenefits.models import CardTemplate, NotificationLog, UserCard
    from ccbenefits.notifications import check_period_transitions

    user = User(
        email="norecap@test.com",
        hashed_password=hash_password("pass"),
        display_name="NoRecap",
        is_verified=True,
        notification_preferences={
            "email": {"period_start": False, "unused_recap": False},
            "push": {"period_start": False, "unused_recap": False},
        },
    )
    db_session.add(user)
    db_session.flush()

    template = db_session.query(CardTemplate).first()
    card = UserCard(user_id=user.id, card_template_id=template.id)
    db_session.add(card)
    db_session.flush()

    with patch("ccbenefits.notifications.get_email_sender") as mock_get_sender:
        check_period_transitions(db_session, [user])
        mock_get_sender.assert_not_called()

    assert db_session.query(NotificationLog).filter_by(user_id=user.id).count() == 0


# --- check_fee_approaching tests ---


@freeze_time("2026-04-01T10:00:00Z")
def test_fee_approaching_fires_30_days_before(db_session):
    """Card with renewal_date 30 days from today should trigger notification."""
    from datetime import date
    from unittest.mock import patch

    from ccbenefits.models import CardTemplate, UserCard
    from ccbenefits.notifications import check_fee_approaching

    user = User(
        email="fee@test.com",
        hashed_password=hash_password("pass"),
        display_name="FeeUser",
        is_verified=True,
        notification_preferences={
            "email": {"fee_approaching": True},
            "push": {},
        },
    )
    db_session.add(user)
    db_session.flush()

    template = db_session.query(CardTemplate).first()
    renewal = date(2026, 5, 1)  # 30 days from April 1
    card = UserCard(
        user_id=user.id,
        card_template_id=template.id,
        renewal_date=renewal,
    )
    db_session.add(card)
    db_session.flush()

    with patch("ccbenefits.notifications.send_notification_email") as mock_send, \
         patch("ccbenefits.notifications.send_notification_push"):
        check_fee_approaching(db_session, [user])
        assert mock_send.called
        call_args = mock_send.call_args
        assert call_args[0][4] == "Card renewal coming up"


@freeze_time("2026-04-01T10:00:00Z")
def test_fee_approaching_skips_no_renewal_date(db_session):
    """Card without renewal_date should NOT trigger fee_approaching."""
    from unittest.mock import patch

    from ccbenefits.models import CardTemplate, UserCard
    from ccbenefits.notifications import check_fee_approaching

    user = User(
        email="nofee@test.com",
        hashed_password=hash_password("pass"),
        display_name="NoFee",
        is_verified=True,
        notification_preferences={
            "email": {"fee_approaching": True},
            "push": {},
        },
    )
    db_session.add(user)
    db_session.flush()

    template = db_session.query(CardTemplate).first()
    card = UserCard(
        user_id=user.id,
        card_template_id=template.id,
        renewal_date=None,
    )
    db_session.add(card)
    db_session.flush()

    with patch("ccbenefits.notifications.send_notification_email") as mock_send, \
         patch("ccbenefits.notifications.send_notification_push") as mock_push:
        check_fee_approaching(db_session, [user])
        assert not mock_send.called
        assert not mock_push.called


@freeze_time("2026-04-01T10:00:00Z")
def test_fee_approaching_respects_preference(db_session):
    """User with fee_approaching=False for both channels should NOT send anything."""
    from datetime import date
    from unittest.mock import patch

    from ccbenefits.models import CardTemplate, NotificationLog, UserCard
    from ccbenefits.notifications import check_fee_approaching

    user = User(
        email="nofeenotif@test.com",
        hashed_password=hash_password("pass"),
        display_name="NoFeeNotif",
        is_verified=True,
        notification_preferences={
            "email": {"fee_approaching": False},
            "push": {"fee_approaching": False},
        },
    )
    db_session.add(user)
    db_session.flush()

    template = db_session.query(CardTemplate).first()
    card = UserCard(
        user_id=user.id,
        card_template_id=template.id,
        renewal_date=date(2026, 5, 1),
    )
    db_session.add(card)
    db_session.flush()

    with patch("ccbenefits.notifications.get_email_sender") as mock_get_sender:
        check_fee_approaching(db_session, [user])
        mock_get_sender.assert_not_called()

    assert db_session.query(NotificationLog).filter_by(user_id=user.id).count() == 0


# --- send_utilization_summary tests ---


@freeze_time("2026-04-06T10:00:00Z")
def test_utilization_summary_sends_for_opted_in(db_session):
    """User with utilization_summary=True should receive summary."""
    from unittest.mock import patch

    from ccbenefits.models import CardTemplate, UserCard
    from ccbenefits.notifications import send_utilization_summary

    user = User(
        email="util@test.com",
        hashed_password=hash_password("pass"),
        display_name="UtilUser",
        is_verified=True,
        notification_preferences={
            "email": {"utilization_summary": True},
            "push": {},
        },
    )
    db_session.add(user)
    db_session.flush()

    template = db_session.query(CardTemplate).first()
    card = UserCard(user_id=user.id, card_template_id=template.id)
    db_session.add(card)
    db_session.flush()

    with patch("ccbenefits.notifications.send_notification_email") as mock_send, \
         patch("ccbenefits.notifications.send_notification_push"):
        send_utilization_summary(db_session, [user])
        assert mock_send.called
        call_args = mock_send.call_args
        assert call_args[0][4] == "Weekly benefits summary"


@freeze_time("2026-04-06T10:00:00Z")
def test_utilization_summary_skips_opted_out(db_session):
    """User with utilization_summary=False for both channels should NOT send anything."""
    from unittest.mock import patch

    from ccbenefits.models import CardTemplate, NotificationLog, UserCard
    from ccbenefits.notifications import send_utilization_summary

    user = User(
        email="noutil@test.com",
        hashed_password=hash_password("pass"),
        display_name="NoUtilUser",
        is_verified=True,
        notification_preferences={
            "email": {"utilization_summary": False},
            "push": {"utilization_summary": False},
        },
    )
    db_session.add(user)
    db_session.flush()

    template = db_session.query(CardTemplate).first()
    card = UserCard(user_id=user.id, card_template_id=template.id)
    db_session.add(card)
    db_session.flush()

    with patch("ccbenefits.notifications.get_email_sender") as mock_get_sender:
        send_utilization_summary(db_session, [user])
        mock_get_sender.assert_not_called()

    assert db_session.query(NotificationLog).filter_by(user_id=user.id).count() == 0


# --- send_notification_push tests ---


def test_send_notification_push_sends_and_logs(db_session):
    """Push notification sends and creates a log entry with channel='push'."""
    from unittest.mock import patch

    from ccbenefits.models import NotificationLog, PushToken
    from ccbenefits.notifications import send_notification_push

    user = User(
        email="pushlog@test.com",
        hashed_password=hash_password("pass"),
        display_name="PushLog",
        notification_preferences={"push": {"expiring_credits": True}},
    )
    db_session.add(user)
    db_session.flush()

    pt = PushToken(user_id=user.id, token="ExponentPushToken[push-test-1]")
    db_session.add(pt)
    db_session.commit()

    with patch("ccbenefits.push.send_push_notifications", return_value=1) as mock_push:
        result = send_notification_push(
            db_session,
            user,
            "expiring_credits",
            "benefit:1:period:2026-03-01",
            "Credits expiring",
            "1 credit(s) expiring in 3 days",
        )

    assert result is True
    mock_push.assert_called_once()

    log = (
        db_session.query(NotificationLog)
        .filter_by(
            user_id=user.id,
            notification_type="expiring_credits",
            channel="push",
            reference_key="benefit:1:period:2026-03-01",
        )
        .first()
    )
    assert log is not None


def test_send_notification_push_respects_preference(db_session):
    """User with push pref disabled should not receive push notification."""
    from unittest.mock import patch

    from ccbenefits.models import PushToken
    from ccbenefits.notifications import send_notification_push

    user = User(
        email="nopush@test.com",
        hashed_password=hash_password("pass"),
        display_name="NoPush",
        notification_preferences={"push": {"expiring_credits": False}},
    )
    db_session.add(user)
    db_session.flush()

    pt = PushToken(user_id=user.id, token="ExponentPushToken[nopush-1]")
    db_session.add(pt)
    db_session.commit()

    with patch("ccbenefits.push.send_push_notifications") as mock_push:
        result = send_notification_push(
            db_session,
            user,
            "expiring_credits",
            "benefit:1:period:2026-03-01",
            "Credits expiring",
            "1 credit(s) expiring in 3 days",
        )

    assert result is False
    mock_push.assert_not_called()


def test_is_already_sent_with_channel(db_session):
    """Email and push dedup are independent — same ref_key, different channels."""
    user = User(
        email="chantest@test.com",
        hashed_password=hash_password("pass"),
        display_name="ChanTest",
    )
    db_session.add(user)
    db_session.flush()

    # Log an email notification
    log_notification(
        db_session,
        user_id=user.id,
        notification_type="expiring_credits",
        channel="email",
        reference_key="benefit:1:period:2026-03-01",
    )

    # Email should be marked as sent
    assert (
        is_already_sent(
            db_session,
            user.id,
            "expiring_credits",
            "benefit:1:period:2026-03-01",
            channel="email",
        )
        is True
    )

    # Push should NOT be marked as sent (independent channel)
    assert (
        is_already_sent(
            db_session,
            user.id,
            "expiring_credits",
            "benefit:1:period:2026-03-01",
            channel="push",
        )
        is False
    )
