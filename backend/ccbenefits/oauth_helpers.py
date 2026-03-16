"""Shared OAuth account resolution logic."""
import logging
from urllib.parse import quote

from fastapi import HTTPException
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from .auth import create_access_token, create_refresh_token
from .helpers import user_out
from .metrics import oauth_login_counter
from .models import User, UserOAuthAccount
from .schemas import AuthResponse

logger = logging.getLogger(__name__)


def resolve_or_create_oauth_user(
    db: Session,
    provider: str,
    provider_user_id: str,
    email: str,
    display_name: str,
) -> tuple[AuthResponse, bool]:
    """Resolve an OAuth sign-in to a user, creating or linking as needed.

    Returns (AuthResponse, is_new_user).
    Raises HTTPException on rejection (unverified, deactivated).
    """
    oauth_account = (
        db.query(UserOAuthAccount)
        .filter(
            UserOAuthAccount.provider == provider,
            UserOAuthAccount.provider_user_id == provider_user_id,
        )
        .first()
    )

    is_new_user = False

    if oauth_account:
        user = oauth_account.user
        if not user.is_active:
            raise HTTPException(status_code=401, detail="Account is deactivated")
        if oauth_account.provider_email != email:
            logger.warning("OAuth email drift for %s: %s -> %s", provider, oauth_account.provider_email, email)
            oauth_account.provider_email = email
            db.commit()
    else:
        user = db.query(User).filter(User.email == email).first()

        if user:
            if not user.is_verified:
                raise HTTPException(
                    status_code=409,
                    detail="An unverified account exists with this email. Verify it first or use a different sign-in method.",
                )
            if not user.is_active:
                raise HTTPException(status_code=401, detail="Account is deactivated")
        else:
            user = User(
                email=email,
                display_name=display_name,
                hashed_password=None,
                is_verified=True,
            )
            db.add(user)
            db.flush()
            is_new_user = True

        db.add(UserOAuthAccount(
            user_id=user.id,
            provider=provider,
            provider_user_id=provider_user_id,
            provider_email=email,
        ))
        try:
            db.commit()
        except IntegrityError:
            db.rollback()
            # Concurrent request created the same record — retry lookup
            oauth_account = (
                db.query(UserOAuthAccount)
                .filter(
                    UserOAuthAccount.provider == provider,
                    UserOAuthAccount.provider_user_id == provider_user_id,
                )
                .first()
            )
            if oauth_account:
                user = oauth_account.user
            else:
                raise HTTPException(status_code=500, detail="Failed to create OAuth link")
        db.refresh(user)

    oauth_login_counter.add(1, {"provider": provider, "is_new_user": str(is_new_user).lower()})

    auth_response = AuthResponse(
        user=user_out(user),
        access_token=create_access_token(subject=str(user.id), email=user.email),
        refresh_token=create_refresh_token(subject=str(user.id), email=user.email),
    )
    return auth_response, is_new_user


def get_error_redirect_url(frontend_url: str, error: str) -> str:
    """Build redirect URL with error parameter for Apple web callback."""
    return f"{frontend_url}/login?error={quote(error)}"
