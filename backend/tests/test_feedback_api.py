from unittest.mock import patch


def _auth(client, email="user@test.com") -> dict:
    client.post("/api/auth/register", json={
        "email": email, "password": "password123", "display_name": "T",
    })
    resp = client.post("/api/auth/login", json={
        "email": email, "password": "password123",
    })
    return {"Authorization": f"Bearer {resp.json()['access_token']}"}


def test_submit_feedback(client):
    headers = _auth(client)
    resp = client.post("/api/feedback/", json={
        "category": "bug_report",
        "message": "The card page is slow",
    }, headers=headers)
    assert resp.status_code == 201
    data = resp.json()
    assert data["category"] == "bug_report"
    assert data["message"] == "The card page is slow"
    assert data["user_email"] == "user@test.com"
    assert "id" in data
    assert "created_at" in data


def test_submit_feedback_invalid_category(client):
    headers = _auth(client)
    resp = client.post("/api/feedback/", json={
        "category": "invalid_category",
        "message": "test",
    }, headers=headers)
    assert resp.status_code == 422


def test_submit_feedback_message_too_long(client):
    headers = _auth(client)
    resp = client.post("/api/feedback/", json={
        "category": "general",
        "message": "x" * 1001,
    }, headers=headers)
    assert resp.status_code == 422


def test_submit_feedback_empty_message(client):
    headers = _auth(client)
    resp = client.post("/api/feedback/", json={
        "category": "general",
        "message": "",
    }, headers=headers)
    assert resp.status_code == 422


def test_submit_feedback_unauthenticated(client):
    resp = client.post("/api/feedback/", json={
        "category": "general",
        "message": "test",
    })
    assert resp.status_code == 401


@patch("ccbenefits.routers.feedback.ADMIN_EMAILS", ["admin@test.com"])
def test_admin_list_feedback(client):
    # Submit as regular user
    user_headers = _auth(client, "user@test.com")
    client.post("/api/feedback/", json={
        "category": "bug_report", "message": "Bug!",
    }, headers=user_headers)

    # List as admin
    admin_headers = _auth(client, "admin@test.com")
    resp = client.get("/api/feedback/", headers=admin_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) >= 1
    assert any(f["user_email"] == "user@test.com" for f in data)
    assert any(f["category"] == "bug_report" for f in data)


@patch("ccbenefits.routers.feedback.ADMIN_EMAILS", ["admin@test.com"])
def test_non_admin_cannot_list_feedback(client):
    headers = _auth(client, "user@test.com")
    resp = client.get("/api/feedback/", headers=headers)
    assert resp.status_code == 403
