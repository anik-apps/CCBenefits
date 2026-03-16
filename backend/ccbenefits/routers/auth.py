import logging
from datetime import datetime, timedelta
from datetime import timezone as dt_timezone

import json as json_mod

from fastapi import APIRouter, Depends, Form, HTTPException, Request as FastAPIRequest
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session

from ..auth import (
    create_access_token,
    create_opaque_token,
    create_refresh_token,
    hash_password,
    hash_opaque_token,
    resolve_user_from_token,
    verify_password,
)
from ..config import (
    FRONTEND_URL,
    RESET_TOKEN_EXPIRE_HOURS,
    VERIFICATION_TOKEN_EXPIRE_HOURS,
)
from ..database import get_db
from ..dependencies import get_current_user
from ..email import get_email_sender, send_password_reset_email, send_verification_email
from ..metrics import (
    auth_failure_counter,
    auth_login_counter,
    auth_register_counter,
    oauth_link_counter,
    password_reset_counter,
    verification_completed_counter,
    verification_sent_counter,
)
from ..helpers import user_out
from ..models import User, UserOAuthAccount
from ..oauth import verify_apple_token, verify_google_token
from ..oauth_helpers import get_error_redirect_url, resolve_or_create_oauth_user
from ..schemas import (
    AuthResponse,
    OAuthLinkRequest,
    OAuthProviderOut,
    OAuthRequest,
    PasswordReset,
    PasswordResetRequest,
    RefreshRequest,
    TokenResponse,
    UserLogin,
    UserRegister,
    VerifyEmailRequest,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/auth", tags=["auth"])


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
    verification_raw = create_opaque_token()
    verification_hash = hash_opaque_token(verification_raw)

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

    auth_register_counter.add(1)

    # Send verification email (best-effort — user can resend if this fails)
    try:
        sender = get_email_sender()
        send_verification_email(sender, user.email, verification_raw, FRONTEND_URL)
        verification_sent_counter.add(1)
    except Exception:
        logger.warning(f"Failed to send verification email to {user.email}", exc_info=True)

    return AuthResponse(
        user=user_out(user),
        access_token=create_access_token(subject=str(user.id), email=user.email),
        refresh_token=create_refresh_token(subject=str(user.id), email=user.email),
    )


@router.post("/login", response_model=TokenResponse)
def login(data: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == data.email.lower()).first()
    if not user:
        auth_login_counter.add(1, {"success": "false"})
        auth_failure_counter.add(1, {"reason": "invalid_credentials"})
        raise HTTPException(status_code=401, detail="Invalid email or password")
    if not user.hashed_password:
        auth_login_counter.add(1, {"success": "false"})
        auth_failure_counter.add(1, {"reason": "oauth_only"})
        raise HTTPException(status_code=401, detail="Invalid email or password")
    if not verify_password(data.password, user.hashed_password):
        auth_login_counter.add(1, {"success": "false"})
        auth_failure_counter.add(1, {"reason": "invalid_credentials"})
        raise HTTPException(status_code=401, detail="Invalid email or password")
    if not user.is_active:
        auth_login_counter.add(1, {"success": "false"})
        auth_failure_counter.add(1, {"reason": "inactive"})
        raise HTTPException(status_code=401, detail="Invalid email or password")

    auth_login_counter.add(1, {"success": "true"})
    return TokenResponse(
        access_token=create_access_token(subject=str(user.id), email=user.email),
        refresh_token=create_refresh_token(subject=str(user.id), email=user.email),
    )


@router.post("/refresh", response_model=TokenResponse)
def refresh(data: RefreshRequest, db: Session = Depends(get_db)):
    user = resolve_user_from_token(data.refresh_token, db, expected_type="refresh")
    return TokenResponse(
        access_token=create_access_token(subject=str(user.id), email=user.email),
        refresh_token=create_refresh_token(subject=str(user.id), email=user.email),
    )


@router.post("/verify-email")
def verify_email(data: VerifyEmailRequest, db: Session = Depends(get_db)):
    hashed = hash_opaque_token(data.token)
    user = db.query(User).filter(User.verification_token == hashed).first()

    if not user:
        raise HTTPException(status_code=400, detail="Invalid or expired verification token")

    now = _now_naive()
    if not user.verification_token_expires or user.verification_token_expires < now:
        raise HTTPException(status_code=400, detail="Invalid or expired verification token")

    user.is_verified = True
    user.verification_token = None
    user.verification_token_expires = None
    db.commit()
    verification_completed_counter.add(1)
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
    verification_raw = create_opaque_token()
    current_user.verification_token = hash_opaque_token(verification_raw)
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
    password_reset_counter.add(1)
    if user and user.is_active:
        token = create_opaque_token()
        user.password_reset_token = hash_opaque_token(token)
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
    hashed = hash_opaque_token(data.token)
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


# --- OAuth endpoints ---


@router.post("/oauth", response_model=AuthResponse)
def oauth_sign_in(data: OAuthRequest, db: Session = Depends(get_db)):
    if data.provider == "google":
        try:
            info = verify_google_token(data.id_token)
        except Exception:
            raise HTTPException(status_code=401, detail="Invalid Google token")
    elif data.provider == "apple":
        try:
            info = verify_apple_token(data.id_token)
        except Exception:
            raise HTTPException(status_code=401, detail="Invalid Apple token")
    else:
        raise HTTPException(status_code=400, detail="Unsupported provider")

    if not info["email_verified"]:
        raise HTTPException(status_code=400, detail="Email not verified by provider")

    display_name = info.get("display_name") or data.display_name or info["email"].split("@")[0]

    auth_response, _ = resolve_or_create_oauth_user(
        db=db,
        provider=data.provider,
        provider_user_id=info["provider_user_id"],
        email=info["email"],
        display_name=display_name,
    )
    return auth_response


@router.get("/oauth/providers", response_model=list[OAuthProviderOut])
def list_oauth_providers(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    accounts = (
        db.query(UserOAuthAccount)
        .filter(UserOAuthAccount.user_id == current_user.id)
        .all()
    )
    return [
        OAuthProviderOut(provider=a.provider, provider_email=a.provider_email, created_at=a.created_at)
        for a in accounts
    ]


@router.post("/oauth/link")
def link_oauth_provider(
    data: OAuthLinkRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if data.provider == "google":
        try:
            info = verify_google_token(data.id_token)
        except Exception:
            raise HTTPException(status_code=401, detail="Invalid Google token")
    elif data.provider == "apple":
        try:
            info = verify_apple_token(data.id_token)
        except Exception:
            raise HTTPException(status_code=401, detail="Invalid Apple token")
    else:
        raise HTTPException(status_code=400, detail="Unsupported provider")

    if not info.get("email_verified"):
        raise HTTPException(status_code=400, detail="Email not verified by provider")

    existing = (
        db.query(UserOAuthAccount)
        .filter(UserOAuthAccount.provider == data.provider, UserOAuthAccount.provider_user_id == info["provider_user_id"])
        .first()
    )
    if existing:
        if existing.user_id == current_user.id:
            return {"message": "Already linked"}
        raise HTTPException(status_code=409, detail="This account is linked to another user")

    db.add(UserOAuthAccount(
        user_id=current_user.id, provider=data.provider,
        provider_user_id=info["provider_user_id"], provider_email=info["email"],
    ))
    db.commit()
    oauth_link_counter.add(1, {"provider": data.provider, "action": "link"})
    return {"message": f"{data.provider} linked successfully"}


@router.delete("/oauth/link/{provider}")
def unlink_oauth_provider(
    provider: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    account = (
        db.query(UserOAuthAccount)
        .filter(UserOAuthAccount.user_id == current_user.id, UserOAuthAccount.provider == provider)
        .first()
    )
    if not account:
        raise HTTPException(status_code=404, detail="Provider not linked")

    other_oauth_count = (
        db.query(UserOAuthAccount)
        .filter(UserOAuthAccount.user_id == current_user.id, UserOAuthAccount.provider != provider)
        .count()
    )
    has_password = current_user.hashed_password is not None
    if not has_password and other_oauth_count == 0:
        raise HTTPException(
            status_code=400,
            detail="Cannot unlink your only sign-in method. Set a password first or link another provider.",
        )

    db.delete(account)
    db.commit()
    oauth_link_counter.add(1, {"provider": provider, "action": "unlink"})
    return {"message": f"{provider} unlinked successfully"}


@router.post("/oauth/apple/callback")
def apple_web_callback(
    request: FastAPIRequest,
    id_token: str = Form(...),
    state: str = Form(...),
    apple_user_data: str = Form("", alias="user"),
    db: Session = Depends(get_db),
):
    """Apple web sign-in callback. Apple POSTs here after authentication."""
    # CSRF: validate state matches cookie
    cookie_state = request.cookies.get("apple_oauth_state")
    if not cookie_state or cookie_state != state:
        raise HTTPException(status_code=400, detail="Invalid state parameter")

    try:
        info = verify_apple_token(id_token)
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid Apple token")

    if not info["email_verified"]:
        return RedirectResponse(get_error_redirect_url(FRONTEND_URL, "email_not_verified"))

    # Extract display name from Apple's user JSON (only sent on first sign-in)
    display_name = None
    if apple_user_data:
        try:
            parsed = json_mod.loads(apple_user_data)
            name = parsed.get("name", {})
            parts = [name.get("firstName", ""), name.get("lastName", "")]
            display_name = " ".join(p for p in parts if p) or None
        except (json_mod.JSONDecodeError, AttributeError):
            logger.warning("Failed to parse Apple user JSON: %s", apple_user_data[:200])
    if not display_name:
        display_name = info["email"].split("@")[0]

    try:
        auth_response, _ = resolve_or_create_oauth_user(
            db=db,
            provider="apple",
            provider_user_id=info["provider_user_id"],
            email=info["email"],
            display_name=display_name,
        )
    except HTTPException as e:
        error_map = {409: "unverified_account", 401: "account_deactivated"}
        error_key = error_map.get(e.status_code, "sign_in_failed")
        return RedirectResponse(get_error_redirect_url(FRONTEND_URL, error_key))

    # Redirect with tokens in URL fragment (not query params, for security)
    response = RedirectResponse(
        f"{FRONTEND_URL}/login#access_token={auth_response.access_token}&refresh_token={auth_response.refresh_token}",
        status_code=302,
    )
    # Clear the state cookie to prevent replay
    response.delete_cookie("apple_oauth_state")
    return response
