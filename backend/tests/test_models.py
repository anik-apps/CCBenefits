from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from ccbenefits.database import Base
from ccbenefits.models import User


def _make_session():
    engine = create_engine(
        "sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool
    )

    @event.listens_for(engine, "connect")
    def set_sqlite_pragma(dbapi_connection, connection_record):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys = ON")
        cursor.close()

    Base.metadata.create_all(bind=engine)
    return sessionmaker(bind=engine)()


def test_create_user():
    session = _make_session()
    user = User(
        email="test@example.com",
        display_name="Test User",
        hashed_password="fakehash",
    )
    session.add(user)
    session.commit()
    session.refresh(user)

    assert user.id is not None
    assert user.email == "test@example.com"
    assert user.display_name == "Test User"
    assert user.is_active is True
    assert user.preferred_currency == "USD"
    assert user.timezone == "UTC"
    assert user.created_at is not None


def test_user_email_unique():
    session = _make_session()
    session.add(User(email="dup@example.com", display_name="A", hashed_password="x"))
    session.commit()
    session.add(User(email="dup@example.com", display_name="B", hashed_password="y"))
    import pytest
    from sqlalchemy.exc import IntegrityError

    with pytest.raises(IntegrityError):
        session.commit()
