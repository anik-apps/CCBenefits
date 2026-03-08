from datetime import timedelta

import pytest


def test_password_hashing():
    from ccbenefits.auth import hash_password, verify_password

    hashed = hash_password("mysecretpassword")
    assert hashed != "mysecretpassword"
    assert verify_password("mysecretpassword", hashed) is True
    assert verify_password("wrongpassword", hashed) is False


def test_create_access_token():
    from ccbenefits.auth import create_access_token, decode_token

    token = create_access_token(subject="42")
    payload = decode_token(token)
    assert payload["sub"] == "42"
    assert payload["type"] == "access"


def test_create_refresh_token():
    from ccbenefits.auth import create_refresh_token, decode_token

    token = create_refresh_token(subject="42")
    payload = decode_token(token)
    assert payload["sub"] == "42"
    assert payload["type"] == "refresh"


def test_expired_token():
    from ccbenefits.auth import create_access_token, decode_token

    token = create_access_token(subject="42", expires_delta=timedelta(seconds=-1))
    with pytest.raises(Exception):
        decode_token(token)


def test_create_password_reset_token():
    from ccbenefits.auth import create_password_reset_token, hash_reset_token

    token = create_password_reset_token()
    assert len(token) == 64  # 32 bytes hex-encoded
    hashed = hash_reset_token(token)
    assert hashed != token
    assert hash_reset_token(token) == hashed  # deterministic
