import pytest
from ccbenefits.schemas import NotificationPreferences, ChannelPreferences

def test_default_preferences():
    prefs = NotificationPreferences()
    assert prefs.email.expiring_credits is True
    assert prefs.email.utilization_summary is False
    assert prefs.push.expiring_credits is True
    assert prefs.notification_hour == 9

def test_custom_preferences():
    prefs = NotificationPreferences(
        email=ChannelPreferences(expiring_credits=False),
        push=ChannelPreferences(period_start=False),
        notification_hour=14,
    )
    assert prefs.email.expiring_credits is False
    assert prefs.push.period_start is False
    assert prefs.notification_hour == 14

def test_invalid_notification_hour():
    with pytest.raises(Exception):
        NotificationPreferences(notification_hour=25)

def test_from_dict():
    raw = {"email": {"expiring_credits": False}, "push": {}, "notification_hour": 8}
    prefs = NotificationPreferences.model_validate(raw)
    assert prefs.email.expiring_credits is False
    assert prefs.email.period_start is True
    assert prefs.notification_hour == 8

def test_from_none_returns_defaults():
    prefs = NotificationPreferences()
    assert prefs.model_dump() == {
        "email": {
            "expiring_credits": True,
            "period_start": True,
            "utilization_summary": False,
            "unused_recap": True,
            "fee_approaching": False,
        },
        "push": {
            "expiring_credits": True,
            "period_start": True,
            "utilization_summary": False,
            "unused_recap": True,
            "fee_approaching": False,
        },
        "notification_hour": 9,
    }
