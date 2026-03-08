import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from ccbenefits.database import Base, get_db
from ccbenefits.main import app
from ccbenefits.seed import seed_data


@pytest.fixture()
def db_session():
    engine = create_engine(
        "sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool
    )

    @event.listens_for(engine, "connect")
    def set_sqlite_pragma(dbapi_connection, connection_record):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys = ON")
        cursor.close()

    Base.metadata.create_all(bind=engine)
    session = sessionmaker(bind=engine)()
    seed_data(session)
    yield session
    session.close()


@pytest.fixture()
def client(db_session):
    def override():
        yield db_session
    app.dependency_overrides[get_db] = override
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


def _register_and_get_token(client) -> str:
    resp = client.post("/api/auth/register", json={
        "email": "user@test.com", "password": "password123", "display_name": "Test",
    })
    return resp.json()["access_token"]


def _auth_header(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


def test_get_profile(client):
    token = _register_and_get_token(client)
    resp = client.get("/api/users/me", headers=_auth_header(token))
    assert resp.status_code == 200
    assert resp.json()["email"] == "user@test.com"


def test_get_profile_unauthenticated(client):
    resp = client.get("/api/users/me")
    assert resp.status_code == 401


def test_update_profile(client):
    token = _register_and_get_token(client)
    resp = client.put("/api/users/me", headers=_auth_header(token), json={
        "display_name": "Updated",
        "preferred_currency": "EUR",
    })
    assert resp.status_code == 200
    assert resp.json()["display_name"] == "Updated"
    assert resp.json()["preferred_currency"] == "EUR"


def test_change_password(client):
    token = _register_and_get_token(client)
    resp = client.put("/api/users/me/password", headers=_auth_header(token), json={
        "current_password": "password123",
        "new_password": "newpassword456",
    })
    assert resp.status_code == 200

    # Login with new password works
    resp2 = client.post("/api/auth/login", json={
        "email": "user@test.com", "password": "newpassword456",
    })
    assert resp2.status_code == 200


def test_change_password_wrong_current(client):
    token = _register_and_get_token(client)
    resp = client.put("/api/users/me/password", headers=_auth_header(token), json={
        "current_password": "wrongpassword",
        "new_password": "newpassword456",
    })
    assert resp.status_code == 400


def test_deactivate_account(client):
    token = _register_and_get_token(client)
    resp = client.delete("/api/users/me", headers=_auth_header(token))
    assert resp.status_code == 200

    # Can no longer access profile
    resp2 = client.get("/api/users/me", headers=_auth_header(token))
    assert resp2.status_code == 401
