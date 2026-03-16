"""Request/response logging middleware with structured fields."""

import json
import logging
import time

import jwt as pyjwt
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

from .config import ALGORITHM, SECRET_KEY
from .observability import mask_email

logger = logging.getLogger("ccbenefits.access")

_SENSITIVE_FIELDS = {
    "password", "new_password", "current_password",
    "token", "access_token", "refresh_token",
    "email",  # fully masked to prevent enumeration via logs
}

# Skip logging for these paths/methods
_SKIP_PATHS = {"/api/health"}
_SKIP_METHODS = {"OPTIONS"}

# Human-readable action names for API endpoints
_ACTION_MAP = {
    ("POST", "/api/auth/register"): "register",
    ("POST", "/api/auth/login"): "login",
    ("POST", "/api/auth/refresh"): "refresh_token",
    ("POST", "/api/auth/verify-email"): "verify_email",
    ("POST", "/api/auth/resend-verification"): "resend_verification",
    ("POST", "/api/auth/password-reset-request"): "request_password_reset",
    ("POST", "/api/auth/password-reset"): "reset_password",
    ("GET", "/api/users/me"): "get_profile",
    ("PUT", "/api/users/me"): "update_profile",
    ("PUT", "/api/users/me/password"): "change_password",
    ("DELETE", "/api/users/me"): "deactivate_account",
    ("GET", "/api/card-templates/"): "list_card_templates",
    ("POST", "/api/user-cards/"): "add_card",
    ("GET", "/api/user-cards/"): "list_user_cards",
    ("POST", "/api/feedback/"): "submit_feedback",
    ("GET", "/api/feedback/"): "list_feedback_admin",
}

# Pattern-based actions for parameterized routes
# ORDER MATTERS: more specific patterns (with suffix) must come before generic ones
_ACTION_PATTERNS = [
    ("/api/user-cards/", "/usage", "POST", "log_usage"),
    ("/api/user-cards/", "/summary", "GET", "get_card_summary"),
    ("/api/user-cards/", "/benefits/", "PUT", "update_benefit_setting"),
    ("/api/user-cards/", "", "GET", "get_card_detail"),
    ("/api/user-cards/", "", "DELETE", "delete_card"),
    ("/api/usage/", "", "PUT", "update_usage"),
    ("/api/usage/", "", "DELETE", "delete_usage"),
    ("/api/card-templates/", "", "GET", "get_card_template"),
]


def _get_action(method: str, path: str) -> str | None:
    """Get human-readable action name for a request."""
    action = _ACTION_MAP.get((method, path))
    if action:
        return action

    for prefix, suffix, act_method, act_name in _ACTION_PATTERNS:
        if path.startswith(prefix) and path.endswith(suffix) and method == act_method:
            return act_name

    return None


def _get_user_from_token(request: Request) -> dict | None:
    """Decode JWT to extract user_id and masked email without a DB call."""
    auth = request.headers.get("authorization", "")
    if not auth.startswith("Bearer "):
        return None
    try:
        payload = pyjwt.decode(auth[7:], SECRET_KEY, algorithms=[ALGORITHM])
        sub = payload.get("sub")
        if sub is None:
            return None
        info = {"user_id": int(sub)}
        email = payload.get("email")
        if email:
            info["user_email"] = mask_email(email)
        return info
    except Exception:
        return None


def _mask_value(key: str, value):
    """Mask sensitive values in request data."""
    if key in _SENSITIVE_FIELDS:
        return "***"
    if isinstance(value, str) and "@" in value:
        return mask_email(value)
    return value


def _mask_data(data):
    """Recursively mask sensitive fields in dicts and lists."""
    if isinstance(data, dict):
        return {k: _mask_data(v) if isinstance(v, (dict, list)) else _mask_value(k, v)
                for k, v in data.items()}
    if isinstance(data, list):
        return [_mask_data(item) for item in data]
    return data


class RequestLoggingMiddleware(BaseHTTPMiddleware):
    """Logs structured request/response data for each API call."""

    async def dispatch(self, request: Request, call_next) -> Response:
        path = request.url.path

        if path in _SKIP_PATHS or request.method in _SKIP_METHODS:
            return await call_next(request)

        start = time.perf_counter()

        # Read request body for POST/PUT/PATCH (small JSON payloads only)
        body_data = None
        content_type = request.headers.get("content-type", "")
        if (
            request.method in ("POST", "PUT", "PATCH")
            and path.startswith("/api/")
            and "application/json" in content_type
        ):
            try:
                body = await request.body()
                if 0 < len(body) < 4096:
                    body_data = _mask_data(json.loads(body))
            except (json.JSONDecodeError, UnicodeDecodeError):
                pass

        response = await call_next(request)

        duration_ms = round((time.perf_counter() - start) * 1000, 1)

        # Get real client IP (behind Caddy reverse proxy)
        client_ip = request.headers.get("x-forwarded-for", "").split(",")[0].strip()
        if not client_ip:
            client_ip = request.client.host if request.client else None

        # Resolve action and user
        action = _get_action(request.method, path)
        user_info = _get_user_from_token(request)

        # Mask query params that might contain tokens
        query = None
        if request.query_params:
            query = _mask_data(dict(request.query_params))

        # Build structured log entry
        log_data = {
            "method": request.method,
            "path": path,
            "status": response.status_code,
            "duration_ms": duration_ms,
            "client": client_ip,
        }

        if action:
            log_data["action"] = action
        if user_info:
            log_data["user_id"] = user_info["user_id"]
            if "user_email" in user_info:
                log_data["user_email"] = user_info["user_email"]
        if query:
            log_data["query"] = query
        if body_data:
            log_data["request_body"] = body_data

        # Log message with action context
        action_str = f" [{action}]" if action else ""
        user_str = f" user={user_info['user_id']}({user_info.get('user_email', '')})" if user_info else ""
        msg = f"{request.method} {path} {response.status_code} {duration_ms}ms{action_str}{user_str}"

        if response.status_code >= 500:
            logger.error(msg, extra=log_data)
        elif response.status_code >= 400:
            logger.warning(msg, extra=log_data)
        else:
            logger.info(msg, extra=log_data)

        return response
