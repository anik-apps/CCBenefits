"""OAuth token verification for Google and Apple."""
import logging
import time
from typing import Any

import httpx
import jwt
from google.auth.transport import requests as google_requests
from google.oauth2 import id_token

from .config import APPLE_BUNDLE_ID, APPLE_SERVICE_ID, GOOGLE_CLIENT_IDS

logger = logging.getLogger(__name__)

# Cache Apple's public keys
_apple_keys_cache: dict[str, Any] = {}
_apple_keys_fetched_at: float = 0
_APPLE_KEYS_TTL = 86400  # 24 hours


def verify_google_token(token: str) -> dict:
    """Verify a Google ID token and return user info.

    Tries each configured client ID. Raises ValueError if none match.
    """
    for client_id in GOOGLE_CLIENT_IDS:
        try:
            info = id_token.verify_oauth2_token(
                token, google_requests.Request(), client_id
            )
            return {
                "provider_user_id": info["sub"],
                "email": info["email"].lower(),
                "email_verified": info.get("email_verified", False),
                "display_name": info.get("name"),
            }
        except Exception:
            continue
    raise ValueError("Invalid Google ID token")


def _get_apple_public_keys() -> dict:
    """Fetch and cache Apple's public keys (JWKS)."""
    global _apple_keys_cache, _apple_keys_fetched_at

    now = time.time()
    if _apple_keys_cache and (now - _apple_keys_fetched_at) < _APPLE_KEYS_TTL:
        return _apple_keys_cache

    resp = httpx.get("https://appleid.apple.com/auth/keys", timeout=10)
    resp.raise_for_status()
    _apple_keys_cache = resp.json()
    _apple_keys_fetched_at = now
    return _apple_keys_cache


def verify_apple_token(token: str) -> dict:
    """Verify an Apple ID token and return user info.

    Raises ValueError if token is invalid or key not found.
    """
    jwks = _get_apple_public_keys()

    header = jwt.get_unverified_header(token)
    kid = header.get("kid")

    key = None
    for k in jwks.get("keys", []):
        if k["kid"] == kid:
            key = jwt.algorithms.RSAAlgorithm.from_jwk(k)
            break

    if not key:
        # Key not found — refresh cache and retry
        global _apple_keys_fetched_at
        _apple_keys_fetched_at = 0
        jwks = _get_apple_public_keys()
        for k in jwks.get("keys", []):
            if k["kid"] == kid:
                key = jwt.algorithms.RSAAlgorithm.from_jwk(k)
                break

    if not key:
        raise ValueError("Apple public key not found")

    payload = jwt.decode(
        token,
        key,
        algorithms=["RS256"],
        audience=[APPLE_SERVICE_ID, APPLE_BUNDLE_ID],
        issuer="https://appleid.apple.com",
    )

    # Apple sends email_verified as string "true"/"false"
    email_verified = payload.get("email_verified")
    if isinstance(email_verified, str):
        email_verified = email_verified.lower() == "true"

    return {
        "provider_user_id": payload["sub"],
        "email": payload["email"].lower(),
        "email_verified": bool(email_verified),
        "display_name": None,  # Apple sends name separately, not in ID token
    }
