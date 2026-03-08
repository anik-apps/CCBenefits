import hashlib
import secrets
from datetime import datetime, timedelta
from datetime import timezone as dt_timezone

import bcrypt
import jwt

from .config import (
    ACCESS_TOKEN_EXPIRE_MINUTES,
    ALGORITHM,
    REFRESH_TOKEN_EXPIRE_DAYS,
    SECRET_KEY,
)


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode(), hashed.encode())


def create_access_token(
    subject: str, expires_delta: timedelta | None = None
) -> str:
    expire = datetime.now(dt_timezone.utc) + (
        expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    return jwt.encode(
        {"sub": subject, "exp": expire, "type": "access"}, SECRET_KEY, algorithm=ALGORITHM
    )


def create_refresh_token(
    subject: str, expires_delta: timedelta | None = None
) -> str:
    expire = datetime.now(dt_timezone.utc) + (
        expires_delta or timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    )
    return jwt.encode(
        {"sub": subject, "exp": expire, "type": "refresh"}, SECRET_KEY, algorithm=ALGORITHM
    )


def create_password_reset_token() -> str:
    """Generate a random opaque token (32 bytes, hex-encoded)."""
    return secrets.token_hex(32)


def hash_reset_token(token: str) -> str:
    """SHA-256 hash of a reset token for safe database storage."""
    return hashlib.sha256(token.encode()).hexdigest()


def decode_token(token: str) -> dict:
    try:
        return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except jwt.PyJWTError as e:
        raise ValueError("Invalid or expired token") from e
