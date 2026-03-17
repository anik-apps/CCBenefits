import uuid


def test_health(client):
    resp = client.get("/api/health")
    assert resp.status_code == 200
    assert resp.json()["status"] == "ok"


def test_register_and_login(client):
    email = f"test-{uuid.uuid4().hex[:8]}@integration.test"
    # Register
    resp = client.post("/api/auth/register", json={
        "email": email, "password": "testpass123", "display_name": "Integration Test",
    })
    assert resp.status_code == 201
    data = resp.json()
    assert "access_token" in data

    # Login
    resp = client.post("/api/auth/login", json={"email": email, "password": "testpass123"})
    assert resp.status_code == 200
    assert "access_token" in resp.json()


def test_card_crud(client):
    email = f"test-{uuid.uuid4().hex[:8]}@integration.test"
    # Register + get token
    resp = client.post("/api/auth/register", json={
        "email": email, "password": "testpass123", "display_name": "Card Test",
    })
    token = resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # List templates
    resp = client.get("/api/card-templates/", headers=headers)
    assert resp.status_code == 200
    templates = resp.json()
    assert len(templates) > 0

    # Add a card
    resp = client.post("/api/user-cards/", json={"card_template_id": templates[0]["id"]}, headers=headers)
    assert resp.status_code == 201
    card_id = resp.json()["id"]

    # Verify card in user cards
    resp = client.get("/api/user-cards/", headers=headers)
    assert resp.status_code == 200
    assert any(c["id"] == card_id for c in resp.json())


def test_benefit_usage(client):
    email = f"test-{uuid.uuid4().hex[:8]}@integration.test"
    resp = client.post("/api/auth/register", json={
        "email": email, "password": "testpass123", "display_name": "Usage Test",
    })
    token = resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Add card
    templates = client.get("/api/card-templates/", headers=headers).json()
    card = client.post("/api/user-cards/", json={"card_template_id": templates[0]["id"]}, headers=headers).json()

    # Get card details to find a benefit
    detail = client.get(f"/api/user-cards/{card['id']}", headers=headers).json()
    benefit = detail["benefits_status"][0]

    # Log usage
    resp = client.post(f"/api/user-cards/{card['id']}/usage", json={
        "benefit_template_id": benefit["benefit_template_id"],
        "amount_used": 10.0,
    }, headers=headers)
    assert resp.status_code == 201

    # Verify usage reflected
    detail2 = client.get(f"/api/user-cards/{card['id']}", headers=headers).json()
    used_benefit = next(b for b in detail2["benefits_status"] if b["benefit_template_id"] == benefit["benefit_template_id"])
    assert used_benefit["amount_used"] == 10.0


def test_batch_details(client):
    email = f"test-{uuid.uuid4().hex[:8]}@integration.test"
    resp = client.post("/api/auth/register", json={
        "email": email, "password": "testpass123", "display_name": "Batch Test",
    })
    token = resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Add card
    templates = client.get("/api/card-templates/", headers=headers).json()
    client.post("/api/user-cards/", json={"card_template_id": templates[0]["id"]}, headers=headers)

    # Batch details
    resp = client.get("/api/user-cards/details", headers=headers)
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) == 1
    assert "benefits_status" in data[0]
