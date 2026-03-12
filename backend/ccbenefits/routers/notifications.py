import copy
import html
from datetime import datetime, timezone as dt_timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import HTMLResponse
from sqlalchemy.orm import Session

from ..auth import hash_opaque_token
from ..database import get_db
from ..dependencies import get_current_user
from ..models import PushToken, UnsubscribeToken, User
from ..schemas import PushTokenCreate, PushTokenUnregister

router = APIRouter(prefix="/api/notifications", tags=["notifications"])


@router.get("/unsubscribe", response_class=HTMLResponse)
def unsubscribe(token: str = Query(...), db: Session = Depends(get_db)):
    """One-click email unsubscribe. No authentication required (token-based)."""
    token_hash = hash_opaque_token(token)
    record = db.query(UnsubscribeToken).filter_by(token_hash=token_hash).first()

    if not record:
        return HTMLResponse(
            "<h2>Invalid unsubscribe link</h2><p>This link may have expired.</p>",
            status_code=400,
        )

    now = datetime.now(dt_timezone.utc)
    if record.expires_at.replace(tzinfo=dt_timezone.utc) < now:
        return HTMLResponse(
            "<h2>Link expired</h2><p>This unsubscribe link has expired.</p>",
            status_code=400,
        )

    if record.used_at:
        return HTMLResponse(
            "<h2>Already unsubscribed</h2>"
            "<p>You've already unsubscribed from these notifications.</p>"
        )

    # Update user preferences (deep copy to trigger SQLAlchemy JSON mutation detection)
    user = db.get(User, record.user_id)
    if user:
        prefs = copy.deepcopy(user.notification_preferences or {})
        email_prefs = prefs.get("email", {})
        email_prefs[record.notification_type] = False
        prefs["email"] = email_prefs
        user.notification_preferences = prefs
        record.used_at = now
        db.commit()

    notif_label = html.escape(record.notification_type.replace("_", " ").title())
    return HTMLResponse(
        f"""
    <html><body style="font-family: sans-serif; max-width: 500px; margin: 40px auto; text-align: center;">
    <h2 style="color: #c9a84c;">Unsubscribed</h2>
    <p>You've been unsubscribed from <strong>{notif_label}</strong> email notifications.</p>
    <p style="color: #888; font-size: 0.85em;">You can re-enable this in your profile settings.</p>
    </body></html>
    """
    )


MAX_TOKENS_PER_USER = 10


@router.post("/push-token", status_code=201)
def register_push_token(
    data: PushTokenCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    existing = db.query(PushToken).filter_by(token=data.token).first()
    if existing:
        if existing.user_id == current_user.id:
            existing.device_name = data.device_name
        else:
            db.delete(existing)
            db.flush()
            existing = None

    if not existing:
        count = db.query(PushToken).filter_by(user_id=current_user.id).count()
        if count >= MAX_TOKENS_PER_USER:
            raise HTTPException(
                status_code=400, detail="Maximum push tokens reached (10)"
            )
        token = PushToken(
            user_id=current_user.id, token=data.token, device_name=data.device_name
        )
        db.add(token)

    db.commit()
    return {"token": data.token, "device_name": data.device_name}


@router.post("/push-token/unregister")
def unregister_push_token(
    data: PushTokenUnregister,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    token = (
        db.query(PushToken)
        .filter_by(token=data.token, user_id=current_user.id)
        .first()
    )
    if not token:
        raise HTTPException(status_code=404, detail="Push token not found")
    db.delete(token)
    db.commit()
    return {"status": "deleted"}
