from datetime import datetime, timedelta
from datetime import timezone as dt_timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ..auth import (
    create_access_token,
    create_password_reset_token,
    create_refresh_token,
    hash_password,
    hash_reset_token,
    resolve_user_from_token,
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
        raise HTTPException(status_code=401, detail="Invalid email or password")

    return TokenResponse(
        access_token=create_access_token(subject=str(user.id)),
        refresh_token=create_refresh_token(subject=str(user.id)),
    )


@router.post("/refresh", response_model=TokenResponse)
def refresh(data: RefreshRequest, db: Session = Depends(get_db)):
    user = resolve_user_from_token(data.refresh_token, db, expected_type="refresh")
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
        user.password_reset_expires = datetime.now(dt_timezone.utc).replace(tzinfo=None) + timedelta(
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

    now = datetime.now(dt_timezone.utc).replace(tzinfo=None)  # SQLite stores naive datetimes
    if not user.password_reset_expires or user.password_reset_expires < now:
        raise HTTPException(status_code=400, detail="Reset token has expired")

    user.hashed_password = hash_password(data.new_password)
    user.password_reset_token = None
    user.password_reset_expires = None
    db.commit()
    return {"message": "Password reset successfully"}
