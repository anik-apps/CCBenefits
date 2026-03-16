from unittest.mock import patch

GOOGLE_USER = {
    "provider_user_id": "google-123",
    "email": "oauth@test.com",
    "email_verified": True,
    "display_name": "OAuth User",
}


class TestOAuthEndpoint:
    @patch("ccbenefits.routers.auth.verify_google_token")
    def test_new_user_created(self, mock_verify, client):
        mock_verify.return_value = GOOGLE_USER
        resp = client.post("/api/auth/oauth", json={"provider": "google", "id_token": "tok"})
        assert resp.status_code == 200
        data = resp.json()
        assert data["user"]["email"] == "oauth@test.com"
        assert data["user"]["is_verified"] is True
        assert "access_token" in data

    @patch("ccbenefits.routers.auth.verify_google_token")
    def test_existing_verified_user_linked(self, mock_verify, client, test_user, db_session):
        mock_verify.return_value = {**GOOGLE_USER, "email": test_user.email}
        test_user.is_verified = True
        db_session.commit()

        resp = client.post("/api/auth/oauth", json={"provider": "google", "id_token": "tok"})
        assert resp.status_code == 200
        assert resp.json()["user"]["email"] == test_user.email

    @patch("ccbenefits.routers.auth.verify_google_token")
    def test_existing_unverified_rejected(self, mock_verify, client, test_user):
        mock_verify.return_value = {**GOOGLE_USER, "email": test_user.email}
        resp = client.post("/api/auth/oauth", json={"provider": "google", "id_token": "tok"})
        assert resp.status_code == 409

    @patch("ccbenefits.routers.auth.verify_google_token")
    def test_email_not_verified_rejected(self, mock_verify, client):
        mock_verify.return_value = {**GOOGLE_USER, "email_verified": False}
        resp = client.post("/api/auth/oauth", json={"provider": "google", "id_token": "tok"})
        assert resp.status_code == 400

    @patch("ccbenefits.routers.auth.verify_google_token")
    def test_inactive_user_rejected(self, mock_verify, client, test_user, db_session):
        mock_verify.return_value = {**GOOGLE_USER, "email": test_user.email}
        test_user.is_verified = True
        test_user.is_active = False
        db_session.commit()

        resp = client.post("/api/auth/oauth", json={"provider": "google", "id_token": "tok"})
        assert resp.status_code == 401

    @patch("ccbenefits.routers.auth.verify_google_token")
    def test_returning_oauth_user(self, mock_verify, client):
        mock_verify.return_value = GOOGLE_USER
        resp1 = client.post("/api/auth/oauth", json={"provider": "google", "id_token": "tok"})
        assert resp1.status_code == 200
        resp2 = client.post("/api/auth/oauth", json={"provider": "google", "id_token": "tok"})
        assert resp2.status_code == 200
        assert resp1.json()["user"]["id"] == resp2.json()["user"]["id"]

    def test_invalid_provider(self, client):
        resp = client.post("/api/auth/oauth", json={"provider": "facebook", "id_token": "tok"})
        assert resp.status_code == 422  # Literal validation


class TestNullPasswordGuards:
    @patch("ccbenefits.routers.auth.verify_google_token")
    def test_login_rejects_oauth_only_user(self, mock_verify, client):
        mock_verify.return_value = GOOGLE_USER
        client.post("/api/auth/oauth", json={"provider": "google", "id_token": "tok"})
        resp = client.post("/api/auth/login", json={"email": "oauth@test.com", "password": "anything"})
        assert resp.status_code == 401
        assert "Google" in resp.json()["detail"] or "Apple" in resp.json()["detail"]

    @patch("ccbenefits.routers.auth.verify_google_token")
    def test_change_password_rejects_oauth_only_user(self, mock_verify, client):
        mock_verify.return_value = GOOGLE_USER
        resp = client.post("/api/auth/oauth", json={"provider": "google", "id_token": "tok"})
        token = resp.json()["access_token"]
        resp = client.put(
            "/api/users/me/password",
            json={"current_password": "anything", "new_password": "newpass123"},
            headers={"Authorization": f"Bearer {token}"},
        )
        assert resp.status_code == 400


class TestOAuthProfileEndpoints:
    @patch("ccbenefits.routers.auth.verify_google_token")
    def test_list_providers(self, mock_verify, client):
        mock_verify.return_value = GOOGLE_USER
        resp = client.post("/api/auth/oauth", json={"provider": "google", "id_token": "tok"})
        token = resp.json()["access_token"]
        resp = client.get("/api/auth/oauth/providers", headers={"Authorization": f"Bearer {token}"})
        assert resp.status_code == 200
        providers = resp.json()
        assert len(providers) == 1
        assert providers[0]["provider"] == "google"

    @patch("ccbenefits.routers.auth.verify_google_token")
    def test_link_provider(self, mock_verify, client, test_user, db_session, auth_header):
        mock_verify.return_value = {**GOOGLE_USER, "email": test_user.email}
        test_user.is_verified = True
        db_session.commit()

        resp = client.post(
            "/api/auth/oauth/link",
            json={"provider": "google", "id_token": "tok"},
            headers=auth_header,
        )
        assert resp.status_code == 200

    @patch("ccbenefits.routers.auth.verify_google_token")
    def test_unlink_with_password(self, mock_verify, client, test_user, db_session, auth_header):
        mock_verify.return_value = {**GOOGLE_USER, "email": test_user.email}
        test_user.is_verified = True
        db_session.commit()

        client.post("/api/auth/oauth/link", json={"provider": "google", "id_token": "tok"}, headers=auth_header)
        resp = client.delete("/api/auth/oauth/link/google", headers=auth_header)
        assert resp.status_code == 200

    @patch("ccbenefits.routers.auth.verify_google_token")
    def test_unlink_last_method_blocked(self, mock_verify, client):
        mock_verify.return_value = GOOGLE_USER
        resp = client.post("/api/auth/oauth", json={"provider": "google", "id_token": "tok"})
        token = resp.json()["access_token"]
        resp = client.delete("/api/auth/oauth/link/google", headers={"Authorization": f"Bearer {token}"})
        assert resp.status_code == 400
        assert "password" in resp.json()["detail"].lower() or "sign-in" in resp.json()["detail"].lower()
