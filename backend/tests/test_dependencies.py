import pytest
from fastapi import HTTPException
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from ccbenefits.auth import create_access_token, create_refresh_token, hash_password
from ccbenefits.database import Base
from ccbenefits.dependencies import get_current_user
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


def test_get_current_user_valid():
    db = _make_session()
    user = User(email="a@b.com", display_name="A", hashed_password=hash_password("pw"))
    db.add(user)
    db.commit()
    db.refresh(user)

    token = create_access_token(subject=str(user.id))
    result = get_current_user(token=token, db=db)
    assert result.id == user.id


def test_get_current_user_invalid_token():
    db = _make_session()
    with pytest.raises(HTTPException) as exc_info:
        get_current_user(token="bad.token.here", db=db)
    assert exc_info.value.status_code == 401


def test_get_current_user_refresh_token_rejected():
    db = _make_session()
    user = User(email="a@b.com", display_name="A", hashed_password=hash_password("pw"))
    db.add(user)
    db.commit()
    db.refresh(user)

    token = create_refresh_token(subject=str(user.id))
    with pytest.raises(HTTPException) as exc_info:
        get_current_user(token=token, db=db)
    assert exc_info.value.status_code == 401


def test_get_current_user_inactive():
    db = _make_session()
    user = User(
        email="a@b.com", display_name="A", hashed_password=hash_password("pw"),
        is_active=False,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    token = create_access_token(subject=str(user.id))
    with pytest.raises(HTTPException) as exc_info:
        get_current_user(token=token, db=db)
    assert exc_info.value.status_code == 401
