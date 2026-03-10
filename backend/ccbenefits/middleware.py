"""Request/response logging middleware with structured fields."""

import json
import logging
import re
import time

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

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

        if query:
            log_data["query"] = query
        if body_data:
            log_data["request_body"] = body_data
        if request.headers.get("authorization", "").startswith("Bearer "):
            log_data["authenticated"] = True

        # Log level based on status code
        msg = f"{request.method} {path} {response.status_code} {duration_ms}ms"
        if response.status_code >= 500:
            logger.error(msg, extra=log_data)
        elif response.status_code >= 400:
            logger.warning(msg, extra=log_data)
        else:
            logger.info(msg, extra=log_data)

        return response
