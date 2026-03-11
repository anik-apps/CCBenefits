from ccbenefits.models import PushToken, NotificationLog


def test_push_token_creation(db_session):
    from ccbenefits.auth import hash_password
    from ccbenefits.models import User

    user = User(
        email="push@test.com",
        hashed_password=hash_password("pass123"),
        display_name="Push Tester",
    )
    db_session.add(user)
    db_session.commit()

    token = PushToken(
        user_id=user.id, token="ExponentPushToken[abc123]", device_name="iPhone"
    )
    db_session.add(token)
    db_session.commit()

    assert token.id is not None
    assert token.user_id == user.id
    assert token.created_at is not None


def test_notification_log_creation(db_session):
    from ccbenefits.auth import hash_password
    from ccbenefits.models import User

    user = User(
        email="log@test.com",
        hashed_password=hash_password("pass123"),
        display_name="Log Tester",
    )
    db_session.add(user)
    db_session.commit()

    log = NotificationLog(
        user_id=user.id,
        notification_type="expiring_credits",
        channel="email",
        reference_key="benefit:1:period:2026-03-01",
    )
    db_session.add(log)
    db_session.commit()

    assert log.id is not None
    assert log.sent_at is not None


def test_user_card_renewal_date(db_session):
    from ccbenefits.models import User, UserCard, CardTemplate
    from ccbenefits.auth import hash_password
    from datetime import date

    user = User(email="renewal@test.com", hashed_password=hash_password("pass123"), display_name="Renew")
    db_session.add(user)
    db_session.flush()

    template = db_session.query(CardTemplate).first()
    card = UserCard(user_id=user.id, card_template_id=template.id, renewal_date=date(2026, 12, 15))
    db_session.add(card)
    db_session.commit()

    assert card.renewal_date == date(2026, 12, 15)


def test_user_card_renewal_date_nullable(db_session):
    from ccbenefits.models import User, UserCard, CardTemplate
    from ccbenefits.auth import hash_password

    user = User(email="norenewal@test.com", hashed_password=hash_password("pass123"), display_name="NoRenew")
    db_session.add(user)
    db_session.flush()

    template = db_session.query(CardTemplate).first()
    card = UserCard(user_id=user.id, card_template_id=template.id)
    db_session.add(card)
    db_session.commit()

    assert card.renewal_date is None
