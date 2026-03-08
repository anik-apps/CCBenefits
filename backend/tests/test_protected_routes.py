
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


# --- Cross-user usage ownership ---

def test_user_cannot_update_other_users_usage(client):
    h1 = _auth(client, "user1@test.com")
    h2 = _auth(client, "user2@test.com")

    # User 1 creates card and logs usage
    resp = client.post("/api/user-cards/", json={"card_template_id": 1}, headers=h1)
    card_id = resp.json()["id"]

    # Get a valid benefit ID
    templates = client.get("/api/card-templates/1").json()
    benefit_id = templates["benefits"][0]["id"]

    resp = client.post(
        f"/api/user-cards/{card_id}/usage",
        json={"benefit_template_id": benefit_id, "amount_used": 5.0},
        headers=h1,
    )
    usage_id = resp.json()["id"]

    # User 2 cannot update user 1's usage
    resp2 = client.put(f"/api/usage/{usage_id}", json={"amount_used": 10.0}, headers=h2)
    assert resp2.status_code == 404


def test_user_cannot_delete_other_users_usage(client):
    h1 = _auth(client, "user1@test.com")
    h2 = _auth(client, "user2@test.com")

    resp = client.post("/api/user-cards/", json={"card_template_id": 1}, headers=h1)
    card_id = resp.json()["id"]

    templates = client.get("/api/card-templates/1").json()
    benefit_id = templates["benefits"][0]["id"]

    resp = client.post(
        f"/api/user-cards/{card_id}/usage",
        json={"benefit_template_id": benefit_id, "amount_used": 5.0},
        headers=h1,
    )
    usage_id = resp.json()["id"]

    # User 2 cannot delete user 1's usage
    resp2 = client.delete(f"/api/usage/{usage_id}", headers=h2)
    assert resp2.status_code == 404


# --- Card templates stay public ---

def test_card_templates_public(client):
    resp = client.get("/api/card-templates/")
    assert resp.status_code == 200
    assert len(resp.json()) > 0
