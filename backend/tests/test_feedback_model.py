from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from ccbenefits.database import Base
from ccbenefits.models import Feedback, User


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


def test_create_feedback():
    session = _make_session()
    user = User(email="fb@test.com", display_name="FB", hashed_password="x")
    session.add(user)
    session.commit()
    session.refresh(user)

    fb = Feedback(
        user_id=user.id,
        category="bug_report",
        message="Something broke",
    )
    session.add(fb)
    session.commit()
    session.refresh(fb)

    assert fb.id is not None
    assert fb.category == "bug_report"
    assert fb.message == "Something broke"
    assert fb.created_at is not None
