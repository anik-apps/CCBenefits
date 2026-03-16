import pytest
from unittest.mock import patch, MagicMock
from ccbenefits.oauth import verify_google_token, verify_apple_token


class TestVerifyGoogleToken:
    @patch("ccbenefits.oauth.GOOGLE_CLIENT_IDS", ["test-client-id"])
    @patch("ccbenefits.oauth.id_token.verify_oauth2_token")
    def test_valid_token(self, mock_verify):
        mock_verify.return_value = {
            "sub": "google-123",
            "email": "test@gmail.com",
            "email_verified": True,
            "name": "Test User",
        }
        result = verify_google_token("fake-token")
        assert result["provider_user_id"] == "google-123"
        assert result["email"] == "test@gmail.com"
        assert result["email_verified"] is True
        assert result["display_name"] == "Test User"

    @patch("ccbenefits.oauth.GOOGLE_CLIENT_IDS", ["test-client-id"])
    @patch("ccbenefits.oauth.id_token.verify_oauth2_token")
    def test_invalid_token_raises(self, mock_verify):
        mock_verify.side_effect = ValueError("Invalid token")
        with pytest.raises(ValueError):
            verify_google_token("bad-token")

    @patch("ccbenefits.oauth.GOOGLE_CLIENT_IDS", ["test-client-id"])
    @patch("ccbenefits.oauth.id_token.verify_oauth2_token")
    def test_email_not_verified(self, mock_verify):
        mock_verify.return_value = {
            "sub": "google-123",
            "email": "test@gmail.com",
            "email_verified": False,
            "name": "Test User",
        }
        result = verify_google_token("fake-token")
        assert result["email_verified"] is False


class TestVerifyAppleToken:
    @patch("ccbenefits.oauth._get_apple_public_keys")
    @patch("ccbenefits.oauth.jwt.decode")
    @patch("ccbenefits.oauth.jwt.get_unverified_header")
    def test_valid_token(self, mock_header, mock_decode, mock_keys):
        mock_header.return_value = {"kid": "key-1"}
        mock_keys.return_value = {"keys": [{"kid": "key-1", "kty": "RSA", "n": "x", "e": "y"}]}
        mock_decode.return_value = {
            "sub": "apple-456",
            "email": "test@icloud.com",
            "email_verified": "true",
        }
        with patch("ccbenefits.oauth.jwt.algorithms.RSAAlgorithm.from_jwk", return_value=MagicMock()):
            result = verify_apple_token("fake-token")
        assert result["provider_user_id"] == "apple-456"
        assert result["email"] == "test@icloud.com"
        assert result["email_verified"] is True

    @patch("ccbenefits.oauth._get_apple_public_keys")
    @patch("ccbenefits.oauth.jwt.get_unverified_header")
    def test_key_not_found_raises(self, mock_header, mock_keys):
        mock_header.return_value = {"kid": "nonexistent"}
        mock_keys.return_value = {"keys": []}
        with pytest.raises(ValueError, match="Apple public key not found"):
            verify_apple_token("bad-token")
