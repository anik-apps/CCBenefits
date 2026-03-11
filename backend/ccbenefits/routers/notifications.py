import copy
import html
from datetime import datetime, timezone as dt_timezone

from fastapi import APIRouter, Depends, Query
from fastapi.responses import HTMLResponse
from sqlalchemy.orm import Session

from ..auth import hash_opaque_token
from ..database import get_db
from ..models import UnsubscribeToken, User

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
