import hashlib
import secrets
from datetime import datetime, timedelta
from datetime import timezone as dt_timezone

import bcrypt
import jwt
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

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


def _create_token(
    subject: str, token_type: str, default_delta: timedelta,
    expires_delta: timedelta | None = None, extra_claims: dict | None = None,
) -> str:
    expire = datetime.now(dt_timezone.utc) + (expires_delta or default_delta)
    payload = {"sub": subject, "exp": expire, "type": token_type}
    if extra_claims:
        payload.update(extra_claims)
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def create_access_token(
    subject: str, expires_delta: timedelta | None = None, email: str | None = None,
) -> str:
    extra = {"email": email} if email else None
    return _create_token(subject, "access", timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES), expires_delta, extra)


def create_refresh_token(
    subject: str, expires_delta: timedelta | None = None, email: str | None = None,
) -> str:
    extra = {"email": email} if email else None
    return _create_token(subject, "refresh", timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS), expires_delta, extra)


def create_opaque_token() -> str:
    """Generate a random opaque token (32 bytes, hex-encoded)."""
    return secrets.token_hex(32)


def hash_opaque_token(token: str) -> str:
    """SHA-256 hash of an opaque token for safe database storage."""
    return hashlib.sha256(token.encode()).hexdigest()


def decode_token(token: str) -> dict:
    try:
        return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except jwt.PyJWTError as e:
        raise ValueError("Invalid or expired token") from e


def resolve_user_from_token(token: str, db: Session, expected_type: str):
    """Decode a JWT, validate its type, and return the active User or raise 401."""
    from .models import User  # deferred to avoid circular import

    try:
        payload = decode_token(token)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if payload.get("type") != expected_type:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token type",
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        uid = int(payload.get("sub"))
    except (ValueError, TypeError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload",
        )

    user = db.query(User).filter(User.id == uid).first()
    if user is None or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or inactive",
        )

    return user
