import logging
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
from ..config import (
    ADMIN_EMAILS,
    FRONTEND_URL,
    RESET_TOKEN_EXPIRE_HOURS,
    VERIFICATION_TOKEN_EXPIRE_HOURS,
)
from ..database import get_db
from ..dependencies import get_current_user
from ..email import get_email_sender, send_password_reset_email, send_verification_email
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
    VerifyEmailRequest,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/auth", tags=["auth"])


def _user_out(user: User) -> UserOut:
    out = UserOut.model_validate(user)
    out.is_admin = user.email.lower() in ADMIN_EMAILS
    return out


def _now_naive() -> datetime:
    """Current UTC time as naive datetime (for SQLite compatibility)."""
    return datetime.now(dt_timezone.utc).replace(tzinfo=None)


@router.post("/register", response_model=AuthResponse, status_code=201)
def register(data: UserRegister, db: Session = Depends(get_db)):
    email = data.email.lower()
    existing = db.query(User).filter(User.email == email).first()
    if existing:
        raise HTTPException(status_code=409, detail="Email already registered")

    # Generate verification token before commit
    verification_raw = create_password_reset_token()
    verification_hash = hash_reset_token(verification_raw)

    user = User(
        email=email,
        display_name=data.display_name,
        hashed_password=hash_password(data.password),
        is_verified=False,
        verification_token=verification_hash,
        verification_token_expires=_now_naive() + timedelta(hours=VERIFICATION_TOKEN_EXPIRE_HOURS),
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    # Send verification email (best-effort — user can resend if this fails)
    try:
        sender = get_email_sender()
        send_verification_email(sender, user.email, verification_raw, FRONTEND_URL)
    except Exception:
        logger.warning(f"Failed to send verification email to {user.email}", exc_info=True)

    return AuthResponse(
        user=_user_out(user),
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


@router.post("/verify-email")
def verify_email(data: VerifyEmailRequest, db: Session = Depends(get_db)):
    hashed = hash_reset_token(data.token)
    user = db.query(User).filter(User.verification_token == hashed).first()

    if not user:
        # Check if any user with this email is already verified (double-click on link)
        raise HTTPException(status_code=400, detail="Invalid or expired verification token")

    now = _now_naive()
    if not user.verification_token_expires or user.verification_token_expires < now:
        raise HTTPException(status_code=400, detail="Verification token has expired. Request a new one.")

    user.is_verified = True
    user.verification_token = None
    user.verification_token_expires = None
    db.commit()
    return {"message": "Email verified successfully"}


@router.post("/resend-verification")
def resend_verification(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.is_verified:
        raise HTTPException(status_code=400, detail="Email already verified")

    # Rate limit: reject if token was generated less than 2 minutes ago
    now = _now_naive()
    if current_user.verification_token_expires:
        token_created_at = current_user.verification_token_expires - timedelta(
            hours=VERIFICATION_TOKEN_EXPIRE_HOURS
        )
        if (now - token_created_at).total_seconds() < 120:
            raise HTTPException(status_code=429, detail="Please wait before requesting another email")

    # Generate new token
    verification_raw = create_password_reset_token()
    current_user.verification_token = hash_reset_token(verification_raw)
    current_user.verification_token_expires = now + timedelta(hours=VERIFICATION_TOKEN_EXPIRE_HOURS)
    db.commit()

    try:
        sender = get_email_sender()
        send_verification_email(sender, current_user.email, verification_raw, FRONTEND_URL)
    except Exception:
        logger.warning(f"Failed to send verification email to {current_user.email}", exc_info=True)

    return {"message": "Verification email sent"}


@router.post("/password-reset-request")
def request_password_reset(data: PasswordResetRequest, db: Session = Depends(get_db)):
    # Always return 200 to avoid email enumeration
    user = db.query(User).filter(User.email == data.email.lower()).first()
    if user and user.is_active:
        token = create_password_reset_token()
        user.password_reset_token = hash_reset_token(token)
        user.password_reset_expires = _now_naive() + timedelta(hours=RESET_TOKEN_EXPIRE_HOURS)
        db.commit()
        try:
            sender = get_email_sender()
            send_password_reset_email(sender, user.email, token, FRONTEND_URL)
        except Exception:
            logger.warning(f"Failed to send reset email to {user.email}", exc_info=True)
    return {"message": "If the email exists, a reset link has been sent"}


@router.post("/password-reset")
def reset_password(data: PasswordReset, db: Session = Depends(get_db)):
    hashed = hash_reset_token(data.token)
    user = db.query(User).filter(User.password_reset_token == hashed).first()

    if not user:
        raise HTTPException(status_code=400, detail="Invalid reset token")

    now = _now_naive()
    if not user.password_reset_expires or user.password_reset_expires < now:
        raise HTTPException(status_code=400, detail="Reset token has expired")

    user.hashed_password = hash_password(data.new_password)
    user.password_reset_token = None
    user.password_reset_expires = None
    db.commit()
    return {"message": "Password reset successfully"}
