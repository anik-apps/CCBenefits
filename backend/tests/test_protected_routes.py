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


def _auth(client, email="a@b.com") -> dict:
    client.post("/api/auth/register", json={
        "email": email, "password": "password123", "display_name": "T",
    })
    resp = client.post("/api/auth/login", json={
        "email": email, "password": "password123",
    })
    return {"Authorization": f"Bearer {resp.json()['access_token']}"}


# --- Unauthenticated access blocked ---

def test_list_user_cards_requires_auth(client):
    assert client.get("/api/user-cards/").status_code == 401


def test_create_user_card_requires_auth(client):
    assert client.post("/api/user-cards/", json={
        "card_template_id": 1
    }).status_code == 401


# --- Data isolation ---

def test_user_sees_only_own_cards(client):
    h1 = _auth(client, "user1@test.com")
    h2 = _auth(client, "user2@test.com")

    # User 1 creates a card
    client.post("/api/user-cards/", json={"card_template_id": 1}, headers=h1)

    # User 2 creates a card
    client.post("/api/user-cards/", json={"card_template_id": 2}, headers=h2)

    # Each sees only their own
    r1 = client.get("/api/user-cards/", headers=h1).json()
    r2 = client.get("/api/user-cards/", headers=h2).json()
    assert len(r1) == 1
    assert len(r2) == 1
    assert r1[0]["card_name"] != r2[0]["card_name"]


def test_user_cannot_access_other_users_card(client):
    h1 = _auth(client, "user1@test.com")
    h2 = _auth(client, "user2@test.com")

    resp = client.post("/api/user-cards/", json={"card_template_id": 1}, headers=h1)
    card_id = resp.json()["id"]

    # User 2 can't see user 1's card
    resp2 = client.get(f"/api/user-cards/{card_id}", headers=h2)
    assert resp2.status_code == 404


def test_user_cannot_delete_other_users_card(client):
    h1 = _auth(client, "user1@test.com")
    h2 = _auth(client, "user2@test.com")

    resp = client.post("/api/user-cards/", json={"card_template_id": 1}, headers=h1)
    card_id = resp.json()["id"]

    resp2 = client.delete(f"/api/user-cards/{card_id}", headers=h2)
    assert resp2.status_code == 404


# --- Card templates stay public ---

def test_card_templates_public(client):
    resp = client.get("/api/card-templates/")
    assert resp.status_code == 200
    assert len(resp.json()) > 0
