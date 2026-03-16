
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


def test_password_reset_request_nonexistent_email(client):
    resp = client.post("/api/auth/password-reset-request", json={
        "email": "nobody@test.com",
    })
    # Still 200 — no enumeration
    assert resp.status_code == 200


def test_password_reset_end_to_end(client, db_session):
    from datetime import datetime, timedelta
    from datetime import timezone as dt_timezone

    from ccbenefits.auth import create_opaque_token, hash_opaque_token
    from ccbenefits.models import User

    # Register a user
    client.post("/api/auth/register", json={
        "email": "resetflow@test.com", "password": "password123", "display_name": "R",
    })

    # Simulate password reset request by setting token directly
    user = db_session.query(User).filter(User.email == "resetflow@test.com").first()
    raw_token = create_opaque_token()
    user.password_reset_token = hash_opaque_token(raw_token)
    user.password_reset_expires = datetime.now(dt_timezone.utc).replace(tzinfo=None) + timedelta(hours=1)
    db_session.commit()

    # Reset password with valid token
    resp = client.post("/api/auth/password-reset", json={
        "token": raw_token, "new_password": "newpassword456",
    })
    assert resp.status_code == 200

    # Login with new password
    resp2 = client.post("/api/auth/login", json={
        "email": "resetflow@test.com", "password": "newpassword456",
    })
    assert resp2.status_code == 200

    # Old password no longer works
    resp3 = client.post("/api/auth/login", json={
        "email": "resetflow@test.com", "password": "password123",
    })
    assert resp3.status_code == 401


def test_password_reset_invalid_token(client):
    resp = client.post("/api/auth/password-reset", json={
        "token": "invalid-token-here", "new_password": "newpassword456",
    })
    assert resp.status_code == 400


def test_password_reset_token_single_use(client, db_session):
    from datetime import datetime, timedelta
    from datetime import timezone as dt_timezone

    from ccbenefits.auth import create_opaque_token, hash_opaque_token
    from ccbenefits.models import User

    client.post("/api/auth/register", json={
        "email": "singleuse@test.com", "password": "password123", "display_name": "S",
    })

    user = db_session.query(User).filter(User.email == "singleuse@test.com").first()
    raw_token = create_opaque_token()
    user.password_reset_token = hash_opaque_token(raw_token)
    user.password_reset_expires = datetime.now(dt_timezone.utc).replace(tzinfo=None) + timedelta(hours=1)
    db_session.commit()

    # First use succeeds
    resp = client.post("/api/auth/password-reset", json={
        "token": raw_token, "new_password": "newpass111111",
    })
    assert resp.status_code == 200

    # Second use fails (token cleared)
    resp2 = client.post("/api/auth/password-reset", json={
        "token": raw_token, "new_password": "newpass222222",
    })
    assert resp2.status_code == 400
