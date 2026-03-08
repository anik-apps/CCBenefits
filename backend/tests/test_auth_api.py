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


def test_register(client):
    resp = client.post("/api/auth/register", json={
        "email": "new@test.com",
        "password": "password123",
        "display_name": "New User",
    })
    assert resp.status_code == 201
    data = resp.json()
    assert data["user"]["email"] == "new@test.com"
    assert "access_token" in data
    assert "refresh_token" in data


def test_register_duplicate_email(client):
    client.post("/api/auth/register", json={
        "email": "dup@test.com", "password": "password123", "display_name": "A",
    })
    resp = client.post("/api/auth/register", json={
        "email": "dup@test.com", "password": "password456", "display_name": "B",
    })
    assert resp.status_code == 409


def test_register_short_password(client):
    resp = client.post("/api/auth/register", json={
        "email": "x@test.com", "password": "short", "display_name": "X",
    })
    assert resp.status_code == 422


def test_login(client):
    client.post("/api/auth/register", json={
        "email": "login@test.com", "password": "password123", "display_name": "L",
    })
    resp = client.post("/api/auth/login", json={
        "email": "login@test.com", "password": "password123",
    })
    assert resp.status_code == 200
    data = resp.json()
    assert "access_token" in data
    assert "refresh_token" in data


def test_login_wrong_password(client):
    client.post("/api/auth/register", json={
        "email": "login2@test.com", "password": "password123", "display_name": "L",
    })
    resp = client.post("/api/auth/login", json={
        "email": "login2@test.com", "password": "wrong",
    })
    assert resp.status_code == 401


def test_login_nonexistent(client):
    resp = client.post("/api/auth/login", json={
        "email": "noone@test.com", "password": "password123",
    })
    assert resp.status_code == 401


def test_refresh_token(client):
    resp = client.post("/api/auth/register", json={
        "email": "ref@test.com", "password": "password123", "display_name": "R",
    })
    refresh = resp.json()["refresh_token"]
    resp2 = client.post("/api/auth/refresh", json={"refresh_token": refresh})
    assert resp2.status_code == 200
    assert "access_token" in resp2.json()


def test_refresh_with_access_token_rejected(client):
    resp = client.post("/api/auth/register", json={
        "email": "ref2@test.com", "password": "password123", "display_name": "R",
    })
    access = resp.json()["access_token"]
    resp2 = client.post("/api/auth/refresh", json={"refresh_token": access})
    assert resp2.status_code == 401


def test_password_reset_request(client):
    client.post("/api/auth/register", json={
        "email": "reset@test.com", "password": "password123", "display_name": "R",
    })
    resp = client.post("/api/auth/password-reset-request", json={
        "email": "reset@test.com",
    })
    # Always 200 (don't reveal if email exists)
    assert resp.status_code == 200
