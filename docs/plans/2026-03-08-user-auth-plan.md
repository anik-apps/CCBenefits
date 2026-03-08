# User Profiles & Authentication Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add multi-user JWT auth with email/password to CCBenefits so each user's cards and benefits are isolated.

**Architecture:** New `User` model with `user_id` FK on `UserCard`. FastAPI dependency `get_current_user` decodes JWT and filters all queries. Frontend uses React context + Axios interceptors for auth state.

**Tech Stack:** passlib[bcrypt], PyJWT, pydantic[email], FastAPI OAuth2PasswordBearer

**Known limitations (intentionally deferred):**
- No email verification — acceptable for a personal finance tool
- No concurrent session limits or session revocation
- Tokens stored in localStorage (not httpOnly cookies) — simpler, adequate for this app
- Soft-delete deactivation has a 30-min token validity window — `get_current_user` checks `is_active` per request

---

### Task 1: Add Auth Dependencies

**Files:**
- Modify: `backend/pyproject.toml:8-13`

**Step 1: Add passlib, PyJWT, and pydantic[email] to dependencies**

In `backend/pyproject.toml`, add to `[tool.poetry.dependencies]`:
```toml
passlib = {extras = ["bcrypt"], version = ">=1.7.4"}
PyJWT = ">=2.8.0"
pydantic = {extras = ["email"], version = ">=2.0"}
```

**Step 2: Install dependencies**

Run: `cd backend && poetry install`
Expected: Both packages install successfully

**Step 3: Commit**

```bash
git add backend/pyproject.toml backend/poetry.lock
git commit -m "Add passlib, PyJWT, and pydantic[email] auth dependencies"
```

---

### Task 2: User Model & DB Schema

**Files:**
- Modify: `backend/ccbenefits/models.py`
- Modify: `backend/ccbenefits/database.py`

**Step 1: Write test for User model**

**Files:**
- Create: `backend/tests/test_models.py`

```python
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from ccbenefits.database import Base
from ccbenefits.models import User


def _make_session():
    engine = create_engine(
        "sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool
    )

    @event.listens_for(engine, "connect")
    def set_sqlite_pragma(dbapi_connection, connection_record):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys = ON")
        cursor.close()

    Base.metadata.create_all(bind=engine)
    return sessionmaker(bind=engine)()


def test_create_user():
    session = _make_session()
    user = User(
        email="test@example.com",
        display_name="Test User",
        hashed_password="fakehash",
    )
    session.add(user)
    session.commit()
    session.refresh(user)

    assert user.id is not None
    assert user.email == "test@example.com"
    assert user.display_name == "Test User"
    assert user.is_active is True
    assert user.preferred_currency == "USD"
    assert user.timezone == "UTC"
    assert user.created_at is not None


def test_user_email_unique():
    session = _make_session()
    session.add(User(email="dup@example.com", display_name="A", hashed_password="x"))
    session.commit()
    session.add(User(email="dup@example.com", display_name="B", hashed_password="y"))
    import pytest
    from sqlalchemy.exc import IntegrityError
    with pytest.raises(IntegrityError):
        session.commit()
```

**Step 2: Run test to verify it fails**

Run: `cd backend && python -m pytest tests/test_models.py -v`
Expected: FAIL — `ImportError: cannot import name 'User' from 'ccbenefits.models'`

**Step 3: Add User model**

In `backend/ccbenefits/models.py`, add after the imports (line 16):

```python
from sqlalchemy import JSON
```

Add the `JSON` import to the existing import block. Then add the User class after `RedemptionType` (after line 28):

```python
class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    email: Mapped[str] = mapped_column(String, unique=True, index=True, nullable=False)
    display_name: Mapped[str] = mapped_column(String, nullable=False)
    hashed_password: Mapped[str] = mapped_column(String, nullable=False)
    preferred_currency: Mapped[str] = mapped_column(String, default="USD", nullable=False)
    timezone: Mapped[str] = mapped_column(String, default="UTC", nullable=False)
    notification_preferences: Mapped[dict | None] = mapped_column(JSON, default=dict)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    password_reset_token: Mapped[str | None] = mapped_column(String, nullable=True)  # SHA-256 hashed
    password_reset_expires: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(timezone.utc), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    cards: Mapped[list["UserCard"]] = relationship(back_populates="user")
```

Note: `timezone` name conflicts with the `timezone` import from `datetime`. Rename the import:

At line 2 of `models.py`, change:
```python
from datetime import date, datetime, timezone
```
to:
```python
from datetime import date, datetime
from datetime import timezone as dt_timezone
```

Then update all `timezone.utc` references to `dt_timezone.utc` (in `UserCard.created_at`, `BenefitUsage.created_at`, and the new `User` model).

**Step 4: Add user_id FK to UserCard**

In the `UserCard` class, add after `id` (line 68):

```python
user_id: Mapped[int] = mapped_column(
    Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
)
```

Add the relationship:
```python
user: Mapped["User"] = relationship(back_populates="cards")
```

**Step 5: Run test to verify it passes**

Run: `cd backend && python -m pytest tests/test_models.py -v`
Expected: PASS

**Step 6: Commit**

```bash
git add backend/ccbenefits/models.py backend/tests/test_models.py
git commit -m "Add User model and user_id FK on UserCard"
```

---

### Task 3: Config Module

**Files:**
- Create: `backend/ccbenefits/config.py`

**Step 1: Create config module (singleton pattern, matching database.py)**

```python
# backend/ccbenefits/config.py
import os
import warnings


SECRET_KEY = os.environ.get("CCB_SECRET_KEY", "")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30
REFRESH_TOKEN_EXPIRE_DAYS = 7
RESET_TOKEN_EXPIRE_HOURS = 1  # Used for password_reset_expires in DB

CCB_ENV = os.environ.get("CCB_ENV", "development")

if not SECRET_KEY:
    if CCB_ENV == "production":
        raise RuntimeError(
            "CCB_SECRET_KEY must be set in production. "
            "Set the CCB_SECRET_KEY environment variable."
        )
    SECRET_KEY = "dev-secret-key-do-not-use-in-production"
    warnings.warn(
        "CCB_SECRET_KEY not set — using insecure default. Set it for production!",
        stacklevel=1,
    )

ALLOWED_ORIGINS = os.environ.get(
    "CCB_ALLOWED_ORIGINS", "http://localhost:5173,http://localhost:8000"
).split(",")
```

**Step 2: Commit**

```bash
git add backend/ccbenefits/config.py
git commit -m "Add config module with env-based settings"
```

---

### Task 4: Auth Utilities (password hashing + JWT)

**Files:**
- Create: `backend/ccbenefits/auth.py`
- Create: `backend/tests/test_auth.py`

**Step 1: Write failing tests**

```python
# backend/tests/test_auth.py
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
```

**Step 2: Run test to verify it fails**

Run: `cd backend && python -m pytest tests/test_auth.py -v`
Expected: FAIL — `ModuleNotFoundError`

**Step 3: Implement auth utilities**

```python
# backend/ccbenefits/auth.py
import hashlib
import secrets
from datetime import datetime, timedelta
from datetime import timezone as dt_timezone

import jwt
from passlib.context import CryptContext

from .config import (
    ACCESS_TOKEN_EXPIRE_MINUTES,
    ALGORITHM,
    REFRESH_TOKEN_EXPIRE_DAYS,
    SECRET_KEY,
)

_pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    return _pwd_context.hash(password)


def verify_password(plain: str, hashed: str) -> bool:
    return _pwd_context.verify(plain, hashed)


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
        raise ValueError(f"Invalid token: {e}") from e
```

**Step 4: Run tests**

Run: `cd backend && python -m pytest tests/test_auth.py -v`
Expected: PASS (5 tests)

**Step 5: Commit**

```bash
git add backend/ccbenefits/auth.py backend/tests/test_auth.py
git commit -m "Add auth utilities: password hashing and JWT tokens"
```

---

### Task 5: Auth Schemas

**Files:**
- Modify: `backend/ccbenefits/schemas.py`

**Step 1: Add auth-related Pydantic schemas**

Add `EmailStr` import at top of `backend/ccbenefits/schemas.py`:
```python
from pydantic import BaseModel, ConfigDict, EmailStr, Field
```

Then append:

```python
# --- Auth schemas ---


class UserRegister(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=72)  # bcrypt truncates at 72 bytes
    display_name: str = Field(min_length=1)


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class RefreshRequest(BaseModel):
    refresh_token: str


class PasswordResetRequest(BaseModel):
    email: str


class PasswordReset(BaseModel):
    token: str
    new_password: str = Field(min_length=8, max_length=72)


class PasswordChange(BaseModel):
    current_password: str
    new_password: str = Field(min_length=8, max_length=72)


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    email: str
    display_name: str
    preferred_currency: str
    timezone: str
    notification_preferences: dict | None
    is_active: bool
    created_at: datetime


class UserUpdate(BaseModel):
    display_name: str | None = None
    preferred_currency: str | None = None
    timezone: str | None = None
    notification_preferences: dict | None = None


class AuthResponse(BaseModel):
    user: UserOut
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
```

**Step 2: Commit**

```bash
git add backend/ccbenefits/schemas.py
git commit -m "Add auth and user profile Pydantic schemas"
```

---

### Task 6: Auth Dependency (get_current_user)

**Files:**
- Create: `backend/ccbenefits/dependencies.py`
- Create: `backend/tests/test_dependencies.py`

**Step 1: Write failing test**

```python
# backend/tests/test_dependencies.py
import pytest
from fastapi import HTTPException
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from ccbenefits.auth import create_access_token, create_refresh_token, hash_password
from ccbenefits.database import Base
from ccbenefits.dependencies import get_current_user
from ccbenefits.models import User


def _make_session():
    engine = create_engine(
        "sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool
    )

    @event.listens_for(engine, "connect")
    def set_sqlite_pragma(dbapi_connection, connection_record):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys = ON")
        cursor.close()

    Base.metadata.create_all(bind=engine)
    return sessionmaker(bind=engine)()


def test_get_current_user_valid():
    db = _make_session()
    user = User(email="a@b.com", display_name="A", hashed_password=hash_password("pw"))
    db.add(user)
    db.commit()
    db.refresh(user)

    token = create_access_token(subject=str(user.id))
    result = get_current_user(token=token, db=db)
    assert result.id == user.id


def test_get_current_user_invalid_token():
    db = _make_session()
    with pytest.raises(HTTPException) as exc_info:
        get_current_user(token="bad.token.here", db=db)
    assert exc_info.value.status_code == 401


def test_get_current_user_refresh_token_rejected():
    db = _make_session()
    user = User(email="a@b.com", display_name="A", hashed_password=hash_password("pw"))
    db.add(user)
    db.commit()
    db.refresh(user)

    token = create_refresh_token(subject=str(user.id))
    with pytest.raises(HTTPException) as exc_info:
        get_current_user(token=token, db=db)
    assert exc_info.value.status_code == 401


def test_get_current_user_inactive():
    db = _make_session()
    user = User(
        email="a@b.com", display_name="A", hashed_password=hash_password("pw"),
        is_active=False,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    token = create_access_token(subject=str(user.id))
    with pytest.raises(HTTPException) as exc_info:
        get_current_user(token=token, db=db)
    assert exc_info.value.status_code == 401
```

**Step 2: Run test to verify it fails**

Run: `cd backend && python -m pytest tests/test_dependencies.py -v`
Expected: FAIL — `ModuleNotFoundError`

**Step 3: Implement dependency**

```python
# backend/ccbenefits/dependencies.py
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from .auth import decode_token
from .database import get_db
from .models import User

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")


def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> User:
    try:
        payload = decode_token(token)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if payload.get("type") != "access":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token type",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user_id = payload.get("sub")
    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload",
        )

    user = db.query(User).filter(User.id == int(user_id)).first()
    if user is None or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or inactive",
        )

    return user
```

**Step 4: Run tests**

Run: `cd backend && python -m pytest tests/test_dependencies.py -v`
Expected: PASS (4 tests)

**Step 5: Commit**

```bash
git add backend/ccbenefits/dependencies.py backend/tests/test_dependencies.py
git commit -m "Add get_current_user auth dependency"
```

---

### Task 7: Auth Router (register, login, refresh, password reset)

**Files:**
- Create: `backend/ccbenefits/routers/auth.py`
- Create: `backend/tests/test_auth_api.py`

**Step 1: Write failing tests**

```python
# backend/tests/test_auth_api.py
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from ccbenefits.database import Base, get_db
from ccbenefits.main import app
from ccbenefits.seed import seed_data


@pytest.fixture()
def db_session():
    engine = create_engine(
        "sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool
    )

    @event.listens_for(engine, "connect")
    def set_sqlite_pragma(dbapi_connection, connection_record):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys = ON")
        cursor.close()

    Base.metadata.create_all(bind=engine)
    session = sessionmaker(bind=engine)()
    seed_data(session)
    yield session
    session.close()


@pytest.fixture()
def client(db_session):
    def override():
        yield db_session
    app.dependency_overrides[get_db] = override
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


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
```

**Step 2: Run test to verify it fails**

Run: `cd backend && python -m pytest tests/test_auth_api.py -v`
Expected: FAIL

**Step 3: Implement auth router**

```python
# backend/ccbenefits/routers/auth.py
from datetime import datetime, timedelta
from datetime import timezone as dt_timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ..auth import (
    create_access_token,
    create_password_reset_token,
    create_refresh_token,
    decode_token,
    hash_password,
    hash_reset_token,
    verify_password,
)
from ..config import RESET_TOKEN_EXPIRE_HOURS
from ..database import get_db
from ..email import get_email_sender
from ..models import User
from ..schemas import (
    AuthResponse,
    PasswordReset,
    PasswordResetRequest,
    RefreshRequest,
    TokenResponse,
    UserLogin,
    UserOut,
    UserRegister,
)

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/register", response_model=AuthResponse, status_code=201)
def register(data: UserRegister, db: Session = Depends(get_db)):
    email = data.email.lower()
    existing = db.query(User).filter(User.email == email).first()
    if existing:
        raise HTTPException(status_code=409, detail="Email already registered")

    user = User(
        email=email,
        display_name=data.display_name,
        hashed_password=hash_password(data.password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    return AuthResponse(
        user=UserOut.model_validate(user),
        access_token=create_access_token(subject=str(user.id)),
        refresh_token=create_refresh_token(subject=str(user.id)),
    )


@router.post("/login", response_model=TokenResponse)
def login(data: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == data.email.lower()).first()
    if not user or not verify_password(data.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    if not user.is_active:
        raise HTTPException(status_code=401, detail="Account deactivated")

    return TokenResponse(
        access_token=create_access_token(subject=str(user.id)),
        refresh_token=create_refresh_token(subject=str(user.id)),
    )


@router.post("/refresh", response_model=TokenResponse)
def refresh(data: RefreshRequest, db: Session = Depends(get_db)):
    try:
        payload = decode_token(data.refresh_token)
    except ValueError:
        raise HTTPException(status_code=401, detail="Invalid refresh token")

    if payload.get("type") != "refresh":
        raise HTTPException(status_code=401, detail="Invalid token type")

    user_id = payload.get("sub")
    user = db.query(User).filter(User.id == int(user_id)).first()
    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="User not found or inactive")

    return TokenResponse(
        access_token=create_access_token(subject=str(user.id)),
        refresh_token=create_refresh_token(subject=str(user.id)),
    )


@router.post("/password-reset-request")
def request_password_reset(data: PasswordResetRequest, db: Session = Depends(get_db)):
    # Always return 200 to avoid email enumeration
    user = db.query(User).filter(User.email == data.email.lower()).first()
    if user and user.is_active:
        token = create_password_reset_token()
        user.password_reset_token = hash_reset_token(token)
        user.password_reset_expires = datetime.now(dt_timezone.utc) + timedelta(
            hours=RESET_TOKEN_EXPIRE_HOURS
        )
        db.commit()
        sender = get_email_sender()
        sender.send_reset_email(to=user.email, token=token)
    return {"message": "If the email exists, a reset link has been sent"}


@router.post("/password-reset")
def reset_password(data: PasswordReset, db: Session = Depends(get_db)):
    hashed = hash_reset_token(data.token)
    user = db.query(User).filter(User.password_reset_token == hashed).first()

    if not user:
        raise HTTPException(status_code=400, detail="Invalid reset token")

    if not user.password_reset_expires or user.password_reset_expires < datetime.now(
        dt_timezone.utc
    ):
        raise HTTPException(status_code=400, detail="Reset token has expired")

    user.hashed_password = hash_password(data.new_password)
    user.password_reset_token = None
    user.password_reset_expires = None
    db.commit()
    return {"message": "Password reset successfully"}
```

**Step 4: Create email sender interface**

**Files:**
- Create: `backend/ccbenefits/email.py`

```python
# backend/ccbenefits/email.py
import logging
from typing import Protocol

logger = logging.getLogger(__name__)


class EmailSender(Protocol):
    def send_reset_email(self, to: str, token: str) -> None: ...


class ConsoleEmailSender:
    """Logs reset emails to console. Replace with real sender in production."""

    def send_reset_email(self, to: str, token: str) -> None:
        logger.info(f"Password reset requested for {to}. Token: {token}")


_sender: EmailSender = ConsoleEmailSender()


def get_email_sender() -> EmailSender:
    return _sender


def set_email_sender(sender: EmailSender) -> None:
    global _sender
    _sender = sender
```

**Step 5: Register auth router in main.py**

In `backend/ccbenefits/main.py`, add import (line 11):
```python
from .routers import auth, card_templates, usage, user_cards
```

Add after existing router includes (line 40):
```python
app.include_router(auth.router)
```

**Step 6: Run tests**

Run: `cd backend && python -m pytest tests/test_auth_api.py -v`
Expected: PASS (9 tests)

**Step 7: Commit**

```bash
git add backend/ccbenefits/routers/auth.py backend/ccbenefits/email.py backend/ccbenefits/main.py backend/tests/test_auth_api.py
git commit -m "Add auth router: register, login, refresh, password reset"
```

---

### Task 8: User Profile Router

**Files:**
- Create: `backend/ccbenefits/routers/users.py`
- Create: `backend/tests/test_users_api.py`

**Step 1: Write failing tests**

```python
# backend/tests/test_users_api.py
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from ccbenefits.database import Base, get_db
from ccbenefits.main import app
from ccbenefits.seed import seed_data


@pytest.fixture()
def db_session():
    engine = create_engine(
        "sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool
    )

    @event.listens_for(engine, "connect")
    def set_sqlite_pragma(dbapi_connection, connection_record):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys = ON")
        cursor.close()

    Base.metadata.create_all(bind=engine)
    session = sessionmaker(bind=engine)()
    seed_data(session)
    yield session
    session.close()


@pytest.fixture()
def client(db_session):
    def override():
        yield db_session
    app.dependency_overrides[get_db] = override
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


def _register_and_get_token(client) -> str:
    resp = client.post("/api/auth/register", json={
        "email": "user@test.com", "password": "password123", "display_name": "Test",
    })
    return resp.json()["access_token"]


def _auth_header(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


def test_get_profile(client):
    token = _register_and_get_token(client)
    resp = client.get("/api/users/me", headers=_auth_header(token))
    assert resp.status_code == 200
    assert resp.json()["email"] == "user@test.com"


def test_get_profile_unauthenticated(client):
    resp = client.get("/api/users/me")
    assert resp.status_code == 401


def test_update_profile(client):
    token = _register_and_get_token(client)
    resp = client.put("/api/users/me", headers=_auth_header(token), json={
        "display_name": "Updated",
        "preferred_currency": "EUR",
    })
    assert resp.status_code == 200
    assert resp.json()["display_name"] == "Updated"
    assert resp.json()["preferred_currency"] == "EUR"


def test_change_password(client):
    token = _register_and_get_token(client)
    resp = client.put("/api/users/me/password", headers=_auth_header(token), json={
        "current_password": "password123",
        "new_password": "newpassword456",
    })
    assert resp.status_code == 200

    # Login with new password works
    resp2 = client.post("/api/auth/login", json={
        "email": "user@test.com", "password": "newpassword456",
    })
    assert resp2.status_code == 200


def test_change_password_wrong_current(client):
    token = _register_and_get_token(client)
    resp = client.put("/api/users/me/password", headers=_auth_header(token), json={
        "current_password": "wrongpassword",
        "new_password": "newpassword456",
    })
    assert resp.status_code == 400


def test_deactivate_account(client):
    token = _register_and_get_token(client)
    resp = client.delete("/api/users/me", headers=_auth_header(token))
    assert resp.status_code == 200

    # Can no longer access profile
    resp2 = client.get("/api/users/me", headers=_auth_header(token))
    assert resp2.status_code == 401
```

**Step 2: Run test to verify it fails**

Run: `cd backend && python -m pytest tests/test_users_api.py -v`
Expected: FAIL

**Step 3: Implement users router**

```python
# backend/ccbenefits/routers/users.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..auth import hash_password, verify_password
from ..database import get_db
from ..dependencies import get_current_user
from ..models import User
from ..schemas import PasswordChange, UserOut, UserUpdate

router = APIRouter(prefix="/api/users", tags=["users"])


@router.get("/me", response_model=UserOut)
def get_profile(current_user: User = Depends(get_current_user)):
    return UserOut.model_validate(current_user)


@router.put("/me", response_model=UserOut)
def update_profile(
    data: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if data.display_name is not None:
        current_user.display_name = data.display_name
    if data.preferred_currency is not None:
        current_user.preferred_currency = data.preferred_currency
    if data.timezone is not None:
        current_user.timezone = data.timezone
    if data.notification_preferences is not None:
        current_user.notification_preferences = data.notification_preferences
    db.commit()
    db.refresh(current_user)
    return UserOut.model_validate(current_user)


@router.put("/me/password")
def change_password(
    data: PasswordChange,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not verify_password(data.current_password, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    current_user.hashed_password = hash_password(data.new_password)
    db.commit()
    return {"message": "Password changed successfully"}


@router.delete("/me")
def deactivate_account(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    current_user.is_active = False
    db.commit()
    return {"message": "Account deactivated"}
```

**Step 4: Register router in main.py**

In `backend/ccbenefits/main.py`, update import:
```python
from .routers import auth, card_templates, usage, user_cards, users
```

Add:
```python
app.include_router(users.router)
```

**Step 5: Run tests**

Run: `cd backend && python -m pytest tests/test_users_api.py -v`
Expected: PASS (7 tests)

**Step 6: Commit**

```bash
git add backend/ccbenefits/routers/users.py backend/ccbenefits/main.py backend/tests/test_users_api.py
git commit -m "Add user profile router: get, update, change password, deactivate"
```

---

### Task 9: Protect Existing Routes with Auth

**Files:**
- Modify: `backend/ccbenefits/routers/user_cards.py`
- Modify: `backend/ccbenefits/routers/usage.py`
- Modify: `backend/tests/conftest.py`
- Modify: `backend/tests/test_api.py`

**Step 1: Write tests for auth-protected user card routes**

Create `backend/tests/test_protected_routes.py`:

```python
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from ccbenefits.database import Base, get_db
from ccbenefits.main import app
from ccbenefits.seed import seed_data


@pytest.fixture()
def db_session():
    engine = create_engine(
        "sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool
    )

    @event.listens_for(engine, "connect")
    def set_sqlite_pragma(dbapi_connection, connection_record):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys = ON")
        cursor.close()

    Base.metadata.create_all(bind=engine)
    session = sessionmaker(bind=engine)()
    seed_data(session)
    yield session
    session.close()


@pytest.fixture()
def client(db_session):
    def override():
        yield db_session
    app.dependency_overrides[get_db] = override
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


def _auth(client, email="a@b.com") -> dict:
    client.post("/api/auth/register", json={
        "email": email, "password": "password123", "display_name": "T",
    })
    resp = client.post("/api/auth/login", json={
        "email": email, "password": "password123",
    })
    return {"Authorization": f"Bearer {resp.json()['access_token']}"}


# --- Unauthenticated access blocked ---

def test_list_user_cards_requires_auth(client):
    assert client.get("/api/user-cards/").status_code == 401


def test_create_user_card_requires_auth(client):
    assert client.post("/api/user-cards/", json={
        "card_template_id": 1
    }).status_code == 401


# --- Data isolation ---

def test_user_sees_only_own_cards(client):
    h1 = _auth(client, "user1@test.com")
    h2 = _auth(client, "user2@test.com")

    # User 1 creates a card
    client.post("/api/user-cards/", json={"card_template_id": 1}, headers=h1)

    # User 2 creates a card
    client.post("/api/user-cards/", json={"card_template_id": 2}, headers=h2)

    # Each sees only their own
    r1 = client.get("/api/user-cards/", headers=h1).json()
    r2 = client.get("/api/user-cards/", headers=h2).json()
    assert len(r1) == 1
    assert len(r2) == 1
    assert r1[0]["card_name"] != r2[0]["card_name"]


def test_user_cannot_access_other_users_card(client):
    h1 = _auth(client, "user1@test.com")
    h2 = _auth(client, "user2@test.com")

    resp = client.post("/api/user-cards/", json={"card_template_id": 1}, headers=h1)
    card_id = resp.json()["id"]

    # User 2 can't see user 1's card
    resp2 = client.get(f"/api/user-cards/{card_id}", headers=h2)
    assert resp2.status_code == 404


def test_user_cannot_delete_other_users_card(client):
    h1 = _auth(client, "user1@test.com")
    h2 = _auth(client, "user2@test.com")

    resp = client.post("/api/user-cards/", json={"card_template_id": 1}, headers=h1)
    card_id = resp.json()["id"]

    resp2 = client.delete(f"/api/user-cards/{card_id}", headers=h2)
    assert resp2.status_code == 404


# --- Card templates stay public ---

def test_card_templates_public(client):
    resp = client.get("/api/card-templates/")
    assert resp.status_code == 200
    assert len(resp.json()) > 0
```

**Step 2: Run test to verify it fails**

Run: `cd backend && python -m pytest tests/test_protected_routes.py -v`
Expected: FAIL (routes don't require auth yet)

**Step 3: Modify user_cards.py to require auth and filter by user**

In `backend/ccbenefits/routers/user_cards.py`:

Add imports:
```python
from ..dependencies import get_current_user
from ..models import User
```

Update every route function signature to include `current_user: User = Depends(get_current_user)`.

Key changes to each endpoint:

- `create_user_card`: Set `user_card.user_id = current_user.id`
- `list_user_cards`: Add `.filter(UserCard.user_id == current_user.id)`
- `get_user_card_detail`: Add `.filter(UserCard.user_id == current_user.id)`
- `delete_user_card`: Add `.filter(UserCard.user_id == current_user.id)`
- `log_usage`: Verify `uc.user_id == current_user.id`
- `upsert_benefit_setting`: Verify `uc.user_id == current_user.id`
- `get_card_summary`: Add `.filter(UserCard.user_id == current_user.id)`

**Step 4: Modify usage.py to require auth and verify ownership**

In `backend/ccbenefits/routers/usage.py`:

Add imports:
```python
from ..dependencies import get_current_user
from ..models import User, UserCard
```

For `update_usage` and `delete_usage`:
- Add `current_user: User = Depends(get_current_user)` parameter
- After fetching the usage, verify ownership: query `UserCard` to check `user_card.user_id == current_user.id`

**Step 5: Update existing test_api.py conftest**

The existing `conftest.py` and `test_api.py` tests will break because they don't authenticate. Update `backend/tests/conftest.py` to add an auth helper:

```python
# Add to conftest.py
from ccbenefits.auth import create_access_token, hash_password
from ccbenefits.models import User


@pytest.fixture()
def test_user(db_session):
    user = User(
        email="testuser@example.com",
        display_name="Test User",
        hashed_password=hash_password("testpass123"),
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture()
def auth_header(test_user):
    token = create_access_token(subject=str(test_user.id))
    return {"Authorization": f"Bearer {token}"}
```

Then update all tests in `test_api.py` that hit protected endpoints to pass `headers=auth_header` and use the `test_user` fixture. The `create_user_card` calls need the user's auth. This is a mechanical change — every `client.post("/api/user-cards/", ...)`, `client.get("/api/user-cards/...")`, etc. needs `headers=auth_header`.

**Step 6: Run all tests**

Run: `cd backend && python -m pytest -v`
Expected: ALL PASS

**Step 7: Commit**

```bash
git add backend/ccbenefits/routers/user_cards.py backend/ccbenefits/routers/usage.py backend/tests/conftest.py backend/tests/test_api.py backend/tests/test_protected_routes.py
git commit -m "Protect existing routes with auth, add user data isolation"
```

---

### Task 10: Tighten CORS & Add Frontend SPA Routes

**Files:**
- Modify: `backend/ccbenefits/main.py`

**Step 1: Update CORS and add new SPA routes**

In `backend/ccbenefits/main.py`:

Import config and replace the CORS middleware:
```python
from .config import ALLOWED_ORIGINS

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

Replace the hardcoded SPA routes with a catch-all for non-`/api` paths. Remove the individual `@app.get("/")`, `@app.get("/credits")`, etc. decorators and the `serve_frontend` function. Replace with:

```python
# Serve frontend static files if built
if FRONTEND_DIR.exists():
    app.mount("/assets", StaticFiles(directory=FRONTEND_DIR / "assets"), name="assets")

    @app.api_route("/{path:path}", methods=["GET"], include_in_schema=False)
    async def serve_frontend(path: str = ""):
        # Don't serve frontend for API routes
        if path.startswith("api/"):
            raise HTTPException(status_code=404, detail="Not found")
        return FileResponse(FRONTEND_DIR / "index.html")
```

This handles all current and future SPA routes without maintaining a hardcoded list.

**Step 2: Run tests**

Run: `cd backend && python -m pytest -v`
Expected: ALL PASS

**Step 3: Commit**

```bash
git add backend/ccbenefits/main.py
git commit -m "Tighten CORS to configurable origins, add auth SPA routes"
```

---

### Task 11: Frontend Auth Types & API Functions

**Files:**
- Modify: `frontend/src/types.ts`
- Modify: `frontend/src/services/api.ts`

**Step 1: Add auth types**

Append to `frontend/src/types.ts`:

```typescript
export interface User {
  id: number;
  email: string;
  display_name: string;
  preferred_currency: string;
  timezone: string;
  notification_preferences: Record<string, unknown> | null;
  is_active: boolean;
  created_at: string;
}

export interface AuthResponse {
  user: User;
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
}
```

**Step 2: Add auth API functions and interceptor**

In `frontend/src/services/api.ts`, add:

```typescript
import type { AuthResponse, TokenResponse, User } from '../types';

// Token management
const TOKEN_KEY = 'ccb_access_token';
const REFRESH_KEY = 'ccb_refresh_token';

export function getStoredTokens() {
  return {
    access: localStorage.getItem(TOKEN_KEY),
    refresh: localStorage.getItem(REFRESH_KEY),
  };
}

export function storeTokens(access: string, refresh: string) {
  localStorage.setItem(TOKEN_KEY, access);
  localStorage.setItem(REFRESH_KEY, refresh);
}

export function clearTokens() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_KEY);
}

// Axios interceptor: attach token
api.interceptors.request.use((config) => {
  const { access } = getStoredTokens();
  if (access) {
    config.headers.Authorization = `Bearer ${access}`;
  }
  return config;
});

// Axios interceptor: refresh on 401
let refreshPromise: Promise<string> | null = null;

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      const { refresh } = getStoredTokens();
      if (!refresh) {
        clearTokens();
        window.location.href = '/login';
        return Promise.reject(error);
      }

      if (!refreshPromise) {
        refreshPromise = api
          .post('/api/auth/refresh', { refresh_token: refresh })
          .then((res) => {
            const data: TokenResponse = res.data;
            storeTokens(data.access_token, data.refresh_token);
            return data.access_token;
          })
          .catch(() => {
            clearTokens();
            window.location.href = '/login';
            throw error;
          })
          .finally(() => {
            refreshPromise = null;
          });
      }

      const newToken = await refreshPromise;
      original.headers.Authorization = `Bearer ${newToken}`;
      return api(original);
    }
    return Promise.reject(error);
  }
);

// Auth API functions
export async function register(
  email: string, password: string, displayName: string
): Promise<AuthResponse> {
  const { data } = await api.post('/api/auth/register', {
    email, password, display_name: displayName,
  });
  storeTokens(data.access_token, data.refresh_token);
  return data;
}

export async function login(email: string, password: string): Promise<TokenResponse> {
  const { data } = await api.post('/api/auth/login', { email, password });
  storeTokens(data.access_token, data.refresh_token);
  return data;
}

export async function getProfile(): Promise<User> {
  const { data } = await api.get('/api/users/me');
  return data;
}

export async function updateProfile(updates: Partial<User>): Promise<User> {
  const { data } = await api.put('/api/users/me', updates);
  return data;
}

export async function changePassword(
  currentPassword: string, newPassword: string
): Promise<void> {
  await api.put('/api/users/me/password', {
    current_password: currentPassword,
    new_password: newPassword,
  });
}

export function logout() {
  clearTokens();
  window.location.href = '/login';
}
```

**Step 3: Commit**

```bash
git add frontend/src/types.ts frontend/src/services/api.ts
git commit -m "Add frontend auth types, API functions, and token interceptor"
```

---

### Task 12: Auth Context

**Files:**
- Create: `frontend/src/contexts/AuthContext.tsx`

**Step 1: Create auth context**

```tsx
// frontend/src/contexts/AuthContext.tsx
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { User } from '../types';
import {
  getProfile,
  getStoredTokens,
  login as apiLogin,
  register as apiRegister,
  logout as apiLogout,
  clearTokens,
} from '../services/api';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, displayName: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    try {
      const profile = await getProfile();
      setUser(profile);
    } catch {
      setUser(null);
      clearTokens();
    }
  }, []);

  useEffect(() => {
    const { access } = getStoredTokens();
    if (access) {
      refreshUser().finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [refreshUser]);

  const login = async (email: string, password: string) => {
    queryClient.clear();
    await apiLogin(email, password);
    await refreshUser();
  };

  const register = async (email: string, password: string, displayName: string) => {
    queryClient.clear();
    await apiRegister(email, password, displayName);
    await refreshUser();
  };

  const logout = () => {
    setUser(null);
    queryClient.clear();
    apiLogout();
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
```

**Step 2: Commit**

```bash
git add frontend/src/contexts/AuthContext.tsx
git commit -m "Add AuthContext with login, register, logout, and token refresh"
```

---

### Task 13: Login & Register Pages

**Files:**
- Create: `frontend/src/pages/LoginPage.tsx`
- Create: `frontend/src/pages/RegisterPage.tsx`

**Step 1: Create LoginPage**

```tsx
// frontend/src/pages/LoginPage.tsx
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/');
    } catch {
      setError('Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 400, margin: '80px auto', padding: 24 }}>
      <h1 style={{ fontFamily: 'var(--font-display)', marginBottom: 24 }}>Sign In</h1>
      {error && (
        <div style={{ color: 'var(--status-danger)', marginBottom: 16, fontSize: '0.9rem' }}>
          {error}
        </div>
      )}
      <form onSubmit={handleSubmit}>
        <label style={{ display: 'block', marginBottom: 12 }}>
          <span style={{ display: 'block', marginBottom: 4, fontSize: '0.85rem', color: 'var(--text-muted)' }}>Email</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={{ width: '100%', padding: '8px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-medium)', background: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}
          />
        </label>
        <label style={{ display: 'block', marginBottom: 20 }}>
          <span style={{ display: 'block', marginBottom: 4, fontSize: '0.85rem', color: 'var(--text-muted)' }}>Password</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={{ width: '100%', padding: '8px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-medium)', background: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}
          />
        </label>
        <button
          type="submit"
          disabled={loading}
          style={{
            width: '100%', padding: '10px', borderRadius: 'var(--radius-sm)',
            background: 'linear-gradient(135deg, var(--accent-gold), var(--accent-gold-dim))',
            color: '#0a0a0f', fontWeight: 600, border: 'none', cursor: 'pointer',
          }}
        >
          {loading ? 'Signing in...' : 'Sign In'}
        </button>
      </form>
      <p style={{ marginTop: 16, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
        Don't have an account? <Link to="/register" style={{ color: 'var(--accent-gold)' }}>Sign up</Link>
      </p>
    </div>
  );
}
```

**Step 2: Create RegisterPage**

```tsx
// frontend/src/pages/RegisterPage.tsx
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    setLoading(true);
    try {
      await register(email, password, displayName);
      navigate('/');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setError(msg || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 400, margin: '80px auto', padding: 24 }}>
      <h1 style={{ fontFamily: 'var(--font-display)', marginBottom: 24 }}>Create Account</h1>
      {error && (
        <div style={{ color: 'var(--status-danger)', marginBottom: 16, fontSize: '0.9rem' }}>
          {error}
        </div>
      )}
      <form onSubmit={handleSubmit}>
        <label style={{ display: 'block', marginBottom: 12 }}>
          <span style={{ display: 'block', marginBottom: 4, fontSize: '0.85rem', color: 'var(--text-muted)' }}>Display Name</span>
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            required
            style={{ width: '100%', padding: '8px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-medium)', background: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}
          />
        </label>
        <label style={{ display: 'block', marginBottom: 12 }}>
          <span style={{ display: 'block', marginBottom: 4, fontSize: '0.85rem', color: 'var(--text-muted)' }}>Email</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={{ width: '100%', padding: '8px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-medium)', background: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}
          />
        </label>
        <label style={{ display: 'block', marginBottom: 12 }}>
          <span style={{ display: 'block', marginBottom: 4, fontSize: '0.85rem', color: 'var(--text-muted)' }}>Password</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            style={{ width: '100%', padding: '8px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-medium)', background: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}
          />
        </label>
        <label style={{ display: 'block', marginBottom: 20 }}>
          <span style={{ display: 'block', marginBottom: 4, fontSize: '0.85rem', color: 'var(--text-muted)' }}>Confirm Password</span>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            minLength={8}
            style={{ width: '100%', padding: '8px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-medium)', background: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}
          />
        </label>
        <button
          type="submit"
          disabled={loading}
          style={{
            width: '100%', padding: '10px', borderRadius: 'var(--radius-sm)',
            background: 'linear-gradient(135deg, var(--accent-gold), var(--accent-gold-dim))',
            color: '#0a0a0f', fontWeight: 600, border: 'none', cursor: 'pointer',
          }}
        >
          {loading ? 'Creating account...' : 'Create Account'}
        </button>
      </form>
      <p style={{ marginTop: 16, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
        Already have an account? <Link to="/login" style={{ color: 'var(--accent-gold)' }}>Sign in</Link>
      </p>
    </div>
  );
}
```

**Step 3: Commit**

```bash
git add frontend/src/pages/LoginPage.tsx frontend/src/pages/RegisterPage.tsx
git commit -m "Add Login and Register pages"
```

---

### Task 14: Profile Page

**Files:**
- Create: `frontend/src/pages/ProfilePage.tsx`

**Step 1: Create ProfilePage**

```tsx
// frontend/src/pages/ProfilePage.tsx
import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { updateProfile, changePassword } from '../services/api';

export default function ProfilePage() {
  const { user, refreshUser, logout } = useAuth();
  const [displayName, setDisplayName] = useState(user?.display_name || '');
  const [currency, setCurrency] = useState(user?.preferred_currency || 'USD');
  const [tz, setTz] = useState(user?.timezone || 'UTC');
  const [profileMsg, setProfileMsg] = useState('');

  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [pwMsg, setPwMsg] = useState('');

  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateProfile({
        display_name: displayName,
        preferred_currency: currency,
        timezone: tz,
      });
      await refreshUser();
      setProfileMsg('Profile updated');
    } catch {
      setProfileMsg('Failed to update profile');
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await changePassword(currentPw, newPw);
      setPwMsg('Password changed');
      setCurrentPw('');
      setNewPw('');
    } catch {
      setPwMsg('Failed to change password');
    }
  };

  if (!user) return null;

  const inputStyle = {
    width: '100%', padding: '8px 12px', borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--border-medium)', background: 'var(--bg-tertiary)',
    color: 'var(--text-primary)',
  };

  return (
    <div style={{ maxWidth: 500 }}>
      <h1 style={{ fontFamily: 'var(--font-display)', marginBottom: 24 }}>Profile</h1>

      <form onSubmit={handleProfileSave} style={{ marginBottom: 32 }}>
        <h3 style={{ marginBottom: 12 }}>Account Settings</h3>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 12 }}>{user.email}</p>
        <label style={{ display: 'block', marginBottom: 12 }}>
          <span style={{ display: 'block', marginBottom: 4, fontSize: '0.85rem', color: 'var(--text-muted)' }}>Display Name</span>
          <input type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value)} style={inputStyle} />
        </label>
        <label style={{ display: 'block', marginBottom: 12 }}>
          <span style={{ display: 'block', marginBottom: 4, fontSize: '0.85rem', color: 'var(--text-muted)' }}>Currency</span>
          <input type="text" value={currency} onChange={(e) => setCurrency(e.target.value)} style={inputStyle} />
        </label>
        <label style={{ display: 'block', marginBottom: 16 }}>
          <span style={{ display: 'block', marginBottom: 4, fontSize: '0.85rem', color: 'var(--text-muted)' }}>Timezone</span>
          <input type="text" value={tz} onChange={(e) => setTz(e.target.value)} style={inputStyle} />
        </label>
        <button type="submit" style={{
          padding: '8px 20px', borderRadius: 'var(--radius-sm)',
          background: 'linear-gradient(135deg, var(--accent-gold), var(--accent-gold-dim))',
          color: '#0a0a0f', fontWeight: 600, border: 'none', cursor: 'pointer',
        }}>Save</button>
        {profileMsg && <span style={{ marginLeft: 12, fontSize: '0.85rem' }}>{profileMsg}</span>}
      </form>

      <form onSubmit={handlePasswordChange} style={{ marginBottom: 32 }}>
        <h3 style={{ marginBottom: 12 }}>Change Password</h3>
        <label style={{ display: 'block', marginBottom: 12 }}>
          <span style={{ display: 'block', marginBottom: 4, fontSize: '0.85rem', color: 'var(--text-muted)' }}>Current Password</span>
          <input type="password" value={currentPw} onChange={(e) => setCurrentPw(e.target.value)} required style={inputStyle} />
        </label>
        <label style={{ display: 'block', marginBottom: 16 }}>
          <span style={{ display: 'block', marginBottom: 4, fontSize: '0.85rem', color: 'var(--text-muted)' }}>New Password</span>
          <input type="password" value={newPw} onChange={(e) => setNewPw(e.target.value)} required minLength={8} style={inputStyle} />
        </label>
        <button type="submit" style={{
          padding: '8px 20px', borderRadius: 'var(--radius-sm)',
          background: 'rgba(255,255,255,0.1)', color: 'var(--text-primary)',
          fontWeight: 600, border: '1px solid var(--border-medium)', cursor: 'pointer',
        }}>Change Password</button>
        {pwMsg && <span style={{ marginLeft: 12, fontSize: '0.85rem' }}>{pwMsg}</span>}
      </form>

      <div>
        <button onClick={logout} style={{
          padding: '8px 20px', borderRadius: 'var(--radius-sm)',
          background: 'transparent', color: 'var(--status-danger)',
          fontWeight: 600, border: '1px solid var(--status-danger)', cursor: 'pointer',
        }}>Sign Out</button>
      </div>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add frontend/src/pages/ProfilePage.tsx
git commit -m "Add Profile page with settings and password change"
```

---

### Task 15: Wire Up App Routing & Auth Guard

**Files:**
- Modify: `frontend/src/App.tsx`
- Modify: `frontend/src/main.tsx`

**Step 1: Update main.tsx to wrap with AuthProvider**

In `frontend/src/main.tsx`, wrap the app:

```tsx
import { AuthProvider } from './contexts/AuthContext';

// Wrap <App /> with <AuthProvider>
```

**Step 2: Update App.tsx with protected routes and user menu**

Replace `frontend/src/App.tsx` with routing that:
- Shows login/register for unauthenticated users
- Shows a loading spinner while auth state loads
- Adds a user menu dropdown (display name → Profile / Logout) in the header
- Redirects unauthenticated users to `/login`

Key additions:
- Import `useAuth` from AuthContext
- Import `Navigate` from react-router-dom
- Create a `ProtectedRoute` wrapper component
- Add routes for `/login`, `/register`, `/profile`
- Add user menu to header

**Step 3: Run frontend build**

Run: `cd frontend && npm run build`
Expected: Build succeeds

**Step 4: Run frontend tests**

Run: `cd frontend && npm test -- --run`
Expected: Tests pass (some may need updates for AuthProvider wrapper — update test helpers to wrap with AuthProvider)

**Step 5: Commit**

```bash
git add frontend/src/App.tsx frontend/src/main.tsx
git commit -m "Wire up auth routing, protected routes, and user menu"
```

---

### Task 16: Update Frontend Tests

**Files:**
- Modify: `frontend/src/test/helpers.tsx`
- Modify: various test files as needed

**Step 1: Update test helper to provide AuthContext**

The existing test helper likely provides QueryClientProvider. Update it to also wrap with a mock AuthProvider or the real AuthProvider with mocked API calls.

Add to `frontend/src/test/helpers.tsx`:
```tsx
import { AuthProvider } from '../contexts/AuthContext';

// Update renderWithProviders to include AuthProvider
```

**Step 2: Run all frontend tests**

Run: `cd frontend && npm test -- --run`
Expected: ALL PASS

**Step 3: Commit**

```bash
git add frontend/src/test/helpers.tsx frontend/src/components/__tests__/ frontend/src/__tests__/
git commit -m "Update frontend tests for auth context"
```

---

### Task 17: Delete Old DB & Final Integration Test

**Step 1: Delete the SQLite database**

Run: `rm -f backend/ccbenefits.db`

The app recreates it on startup with `create_all` and `seed_data`.

**Step 2: Run the full backend test suite**

Run: `cd backend && python -m pytest -v`
Expected: ALL PASS

**Step 3: Run the full frontend test suite**

Run: `cd frontend && npm test -- --run`
Expected: ALL PASS

**Step 4: Manual smoke test**

Run: `cd backend && python -m uvicorn ccbenefits.main:app --reload`

1. Visit `http://localhost:8000` — should redirect to `/login`
2. Register a new account
3. Add a card, log usage — verify it works
4. Open incognito, register a second account — verify you can't see the first user's cards
5. Test logout, login with first account — data still there

**Step 5: Commit**

```bash
git commit -m "Remove old database, clean slate for multi-user auth"
```

---

## Summary

| Task | Description | New Files | Modified Files |
|------|-------------|-----------|----------------|
| 1 | Auth dependencies | — | pyproject.toml |
| 2 | User model + FK | test_models.py | models.py |
| 3 | Config module | config.py | — |
| 4 | Auth utilities | auth.py, test_auth.py | — |
| 5 | Auth schemas | — | schemas.py |
| 6 | Auth dependency | dependencies.py, test_dependencies.py | — |
| 7 | Auth router | routers/auth.py, email.py, test_auth_api.py | main.py |
| 8 | Users router | routers/users.py, test_users_api.py | main.py |
| 9 | Protect routes | test_protected_routes.py | user_cards.py, usage.py, conftest.py, test_api.py |
| 10 | CORS + SPA routes | — | main.py |
| 11 | Frontend types + API | — | types.ts, api.ts |
| 12 | Auth context | AuthContext.tsx | — |
| 13 | Login + Register | LoginPage.tsx, RegisterPage.tsx | — |
| 14 | Profile page | ProfilePage.tsx | — |
| 15 | App routing | — | App.tsx, main.tsx |
| 16 | Frontend tests | — | helpers.tsx, test files |
| 17 | Integration test | — | — |
