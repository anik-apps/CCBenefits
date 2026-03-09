from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..auth import hash_password, verify_password
from ..config import ADMIN_EMAILS
from ..database import get_db
from ..dependencies import get_current_user
from ..models import User
from ..schemas import PasswordChange, UserOut, UserUpdate

router = APIRouter(prefix="/api/users", tags=["users"])


def _user_out(user: User) -> UserOut:
    out = UserOut.model_validate(user)
    out.is_admin = user.email.lower() in ADMIN_EMAILS
    return out


@router.get("/me", response_model=UserOut)
def get_profile(current_user: User = Depends(get_current_user)):
    return _user_out(current_user)


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
    return _user_out(current_user)


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
