
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
