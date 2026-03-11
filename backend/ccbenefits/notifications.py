"""Notification logic — dedup, email rendering, sending helpers, and scheduler stubs."""

import html
import logging
import urllib.parse
from datetime import datetime, timedelta
from datetime import timezone as dt_timezone

from sqlalchemy.orm import Session

from .auth import create_opaque_token, hash_opaque_token
from .config import FRONTEND_URL
from .email import get_email_sender
from .metrics import email_sent_counter, notifications_sent_counter
from .models import NotificationLog, UnsubscribeToken

logger = logging.getLogger(__name__)


def get_user_pref(user, channel: str, notif_type: str) -> bool:
    """Read nested notification preference. Returns True by default (opt-out model)."""
    prefs = user.notification_preferences
    if not isinstance(prefs, dict):
        return True
    channel_prefs = prefs.get(channel)
    if not isinstance(channel_prefs, dict):
        return True
    value = channel_prefs.get(notif_type)
    if value is None:
        return True
    return bool(value)


def is_already_sent(db: Session, user_id: int, notification_type: str, reference_key: str) -> bool:
    """Check NotificationLog for an existing entry (dedup)."""
    return (
        db.query(NotificationLog)
        .filter_by(user_id=user_id, notification_type=notification_type, reference_key=reference_key)
        .first()
        is not None
    )


def log_notification(
    db: Session, user_id: int, notification_type: str, channel: str, reference_key: str
) -> None:
    """Create a NotificationLog entry after successful send."""
    entry = NotificationLog(
        user_id=user_id,
        notification_type=notification_type,
        channel=channel,
        reference_key=reference_key,
    )
    db.add(entry)
    db.commit()


def render_notification_email(
    notification_type: str,
    user_name: str,
    items: list[dict],
    unsubscribe_url: str | None = None,
) -> str:
    """Render an HTML notification email. All user data is HTML-escaped."""
    safe_name = html.escape(user_name)

    if notification_type == "expiring_credits":
        title = "Credits Expiring Soon"
        intro = f"Hi {safe_name}, you have credits expiring soon:"
    elif notification_type == "period_start":
        title = "New Benefit Period Started"
        intro = f"Hi {safe_name}, a new benefit period has started:"
    elif notification_type == "fee_approaching":
        title = "Annual Fee Approaching"
        intro = f"Hi {safe_name}, your annual fee renewal is coming up:"
    elif notification_type == "utilization_summary":
        title = "Your Weekly Utilization Summary"
        intro = f"Hi {safe_name}, here's your benefit utilization summary:"
    else:
        title = "CCBenefits Notification"
        intro = f"Hi {safe_name},"

    rows = ""
    for item in items:
        cells = ""
        for key in ("name", "card", "amount", "expires"):
            val = html.escape(str(item.get(key, "")))
            cells += f'<td style="padding:8px 12px;border-bottom:1px solid #222;">{val}</td>'
        rows += f"<tr>{cells}</tr>"

    # Build header columns based on notification type
    if notification_type == "expiring_credits":
        headers = ["Benefit", "Card", "Amount", "Expires"]
    elif notification_type == "fee_approaching":
        headers = ["Fee", "Card", "Amount", "Due Date"]
    else:
        headers = ["Benefit", "Card", "Amount", "Date"]

    header_cells = "".join(
        f'<th style="padding:8px 12px;text-align:left;border-bottom:2px solid #c9a84c;color:#c9a84c;">'
        f"{h}</th>"
        for h in headers
    )

    unsubscribe_section = ""
    if unsubscribe_url:
        safe_url = html.escape(unsubscribe_url)
        unsubscribe_section = (
            f'<p style="margin-top:24px;font-size:0.8em;color:#666;">'
            f'Don\'t want these emails? <a href="{safe_url}" '
            f'style="color:#c9a84c;">Unsubscribe</a></p>'
        )

    return f"""\
<div style="max-width:600px;margin:0 auto;font-family:system-ui,-apple-system,sans-serif;background:#0a0a0f;color:#e0e0e0;padding:24px;border-radius:8px;">
  <h2 style="color:#c9a84c;margin-top:0;">{title}</h2>
  <p>{intro}</p>
  <table style="width:100%;border-collapse:collapse;margin:16px 0;">
    <thead><tr>{header_cells}</tr></thead>
    <tbody>{rows}</tbody>
  </table>
  <p style="margin-top:16px;">
    <a href="https://ccb.kumaranik.com" style="display:inline-block;padding:12px 24px;background:#c9a84c;color:#0a0a0f;text-decoration:none;border-radius:6px;font-weight:600;">View in CCBenefits</a>
  </p>
  {unsubscribe_section}
  <p style="margin-top:24px;font-size:0.75em;color:#555;">CCBenefits — Track your credit card benefits</p>
</div>"""


def _generate_unsubscribe_url(db: Session, user_id: int, notification_type: str) -> str:
    """Create an opaque unsubscribe token and return the full URL."""
    raw_token = create_opaque_token()
    record = UnsubscribeToken(
        user_id=user_id,
        token_hash=hash_opaque_token(raw_token),
        notification_type=notification_type,
        expires_at=datetime.now(dt_timezone.utc) + timedelta(days=60),
    )
    db.add(record)
    db.flush()  # persist but let caller commit

    base_url = FRONTEND_URL.rstrip("/")
    return f"{base_url}/api/notifications/unsubscribe?token={urllib.parse.quote(raw_token)}"


def send_notification_email(
    db: Session,
    user,
    notification_type: str,
    reference_key: str,
    subject: str,
    items: list[dict],
) -> bool:
    """Orchestrate: check dedup -> check preference -> render -> send -> log.

    Returns True if the email was sent, False if skipped.
    """
    if is_already_sent(db, user_id=user.id, notification_type=notification_type, reference_key=reference_key):
        logger.debug("Notification already sent: user=%s type=%s ref=%s", user.id, notification_type, reference_key)
        return False

    if not get_user_pref(user, "email", notification_type):
        logger.debug("User %s opted out of %s emails", user.id, notification_type)
        return False

    unsubscribe_url = _generate_unsubscribe_url(db, user.id, notification_type)

    body = render_notification_email(
        notification_type=notification_type,
        user_name=user.display_name,
        items=items,
        unsubscribe_url=unsubscribe_url,
    )

    sender = get_email_sender()
    try:
        sender.send(to=user.email, subject=subject, html_body=body)
        email_sent_counter.add(1, {"type": notification_type, "success": "true"})
        notifications_sent_counter.add(1, {"type": notification_type, "channel": "email", "success": "true"})
    except Exception:
        email_sent_counter.add(1, {"type": notification_type, "success": "false"})
        notifications_sent_counter.add(1, {"type": notification_type, "channel": "email", "success": "false"})
        logger.exception("Failed to send %s email to user %s", notification_type, user.id)
        return False

    log_notification(db, user_id=user.id, notification_type=notification_type, channel="email", reference_key=reference_key)
    return True


# --- Scheduler stubs (implemented in subsequent tasks) ---


def check_expiring_credits(db, users):
    """Check for benefits with periods ending within 3 days and no usage logged."""
    from datetime import date

    from .models import BenefitTemplate, BenefitUsage, CardTemplate, UserCard
    from .utils import get_current_period

    today = date.today()

    for user in users:
        if not get_user_pref(user, "email", "expiring_credits"):
            continue

        # Get user's active cards with their benefits
        cards = db.query(UserCard).filter(
            UserCard.user_id == user.id,
            UserCard.is_active.is_(True),
        ).all()

        expiring_items = []
        for card in cards:
            card_template = db.get(CardTemplate, card.card_template_id)
            benefits = db.query(BenefitTemplate).filter_by(
                card_template_id=card.card_template_id
            ).all()

            for benefit in benefits:
                start_date, end_date = get_current_period(benefit.period_type, today)
                delta = (end_date - today).days

                if not (0 < delta <= 3):
                    continue

                # Check if usage exists for this period
                usage = db.query(BenefitUsage).filter(
                    BenefitUsage.user_card_id == card.id,
                    BenefitUsage.benefit_template_id == benefit.id,
                    BenefitUsage.period_start_date == start_date,
                ).first()

                if usage is None or usage.amount_used == 0:
                    ref_key = f"benefit:{benefit.id}:period:{start_date}"
                    if not is_already_sent(db, user.id, "expiring_credits", ref_key):
                        expiring_items.append({
                            "name": benefit.name,
                            "card": card_template.name,
                            "amount": f"${benefit.max_value:.0f}",
                            "expires": end_date.strftime("%b %d"),
                            "ref_key": ref_key,
                        })

        if expiring_items:
            # Send one email with all expiring benefits
            send_notification_email(
                db,
                user,
                "expiring_credits",
                expiring_items[0]["ref_key"],  # use first item's ref_key
                "Credits expiring soon",
                expiring_items,
            )
            # Log all additional ref_keys to prevent re-sending
            for item in expiring_items[1:]:
                log_notification(db, user.id, "expiring_credits", "email", item["ref_key"])


def check_period_transitions(db, users):
    """Check for period_start and unused_recap notifications."""
    from datetime import date, timedelta

    from .models import BenefitTemplate, BenefitUsage, CardTemplate, UserCard
    from .utils import get_current_period

    today = date.today()
    yesterday = today - timedelta(days=1)

    for user in users:
        wants_period_start = get_user_pref(user, "email", "period_start")
        wants_unused_recap = get_user_pref(user, "email", "unused_recap")

        if not wants_period_start and not wants_unused_recap:
            continue

        cards = db.query(UserCard).filter(
            UserCard.user_id == user.id,
            UserCard.is_active.is_(True),
        ).all()

        period_start_items = []
        unused_recap_items = []

        for card in cards:
            card_template = db.get(CardTemplate, card.card_template_id)
            benefits = db.query(BenefitTemplate).filter_by(
                card_template_id=card.card_template_id
            ).all()

            for benefit in benefits:
                # --- period_start: check if today is the first day of a new period ---
                if wants_period_start:
                    start_date, end_date = get_current_period(benefit.period_type, today)
                    if start_date == today:
                        ref_key = f"benefit:{benefit.id}:period:{start_date}"
                        if not is_already_sent(db, user.id, "period_start", ref_key):
                            period_start_items.append({
                                "name": benefit.name,
                                "card": card_template.name,
                                "amount": f"${benefit.max_value:.0f}",
                                "expires": f"{benefit.period_type}",
                                "ref_key": ref_key,
                            })

                # --- unused_recap: check if yesterday was the last day of a period ---
                if wants_unused_recap:
                    prev_start, prev_end = get_current_period(benefit.period_type, yesterday)
                    if prev_end == yesterday:
                        usage = db.query(BenefitUsage).filter(
                            BenefitUsage.user_card_id == card.id,
                            BenefitUsage.benefit_template_id == benefit.id,
                            BenefitUsage.period_start_date == prev_start,
                        ).first()

                        amount_used = usage.amount_used if usage else 0
                        if amount_used < benefit.max_value:
                            missed = benefit.max_value - amount_used
                            ref_key = f"benefit:{benefit.id}:period:{prev_start}"
                            if not is_already_sent(db, user.id, "unused_recap", ref_key):
                                unused_recap_items.append({
                                    "name": benefit.name,
                                    "card": card_template.name,
                                    "amount": f"${missed:.0f}",
                                    "expires": f"{prev_start} - {prev_end}",
                                    "ref_key": ref_key,
                                })

        if period_start_items:
            send_notification_email(
                db,
                user,
                "period_start",
                period_start_items[0]["ref_key"],
                "New benefit period started",
                period_start_items,
            )
            for item in period_start_items[1:]:
                log_notification(db, user.id, "period_start", "email", item["ref_key"])

        if unused_recap_items:
            send_notification_email(
                db,
                user,
                "unused_recap",
                unused_recap_items[0]["ref_key"],
                "Credits you missed last period",
                unused_recap_items,
            )
            for item in unused_recap_items[1:]:
                log_notification(db, user.id, "unused_recap", "email", item["ref_key"])


def check_fee_approaching(db, users):
    """Check for cards with annual fee renewal approaching in 30 days."""
    from datetime import date, timedelta

    from .models import CardTemplate, UserCard

    today = date.today()
    target_date = today + timedelta(days=30)

    for user in users:
        if not get_user_pref(user, "email", "fee_approaching"):
            continue

        cards = db.query(UserCard).filter(
            UserCard.user_id == user.id,
            UserCard.is_active.is_(True),
            UserCard.renewal_date.isnot(None),
            UserCard.renewal_date == target_date,
        ).all()

        fee_items = []
        for card in cards:
            card_template = db.get(CardTemplate, card.card_template_id)
            ref_key = f"card:{card.id}:renewal:{card.renewal_date.year}"
            if not is_already_sent(db, user.id, "fee_approaching", ref_key):
                fee_items.append({
                    "name": card_template.name,
                    "card": card_template.name,
                    "amount": f"${card_template.annual_fee:.0f}",
                    "expires": card.renewal_date.strftime("%b %d, %Y"),
                    "ref_key": ref_key,
                })

        if fee_items:
            send_notification_email(
                db,
                user,
                "fee_approaching",
                fee_items[0]["ref_key"],
                "Card renewal coming up",
                fee_items,
            )
            for item in fee_items[1:]:
                log_notification(db, user.id, "fee_approaching", "email", item["ref_key"])


def send_utilization_summary(db, users):
    """Send weekly utilization summary for opted-in users."""
    from datetime import date

    from .models import BenefitTemplate, BenefitUsage, CardTemplate, UserCard
    from .utils import get_current_period

    today = date.today()
    iso_week = today.isocalendar()[1]

    for user in users:
        if not get_user_pref(user, "email", "utilization_summary"):
            continue

        ref_key = f"user:{user.id}:week:{iso_week}"
        if is_already_sent(db, user.id, "utilization_summary", ref_key):
            continue

        cards = db.query(UserCard).filter(
            UserCard.user_id == user.id,
            UserCard.is_active.is_(True),
        ).all()

        summary_items = []
        for card in cards:
            card_template = db.get(CardTemplate, card.card_template_id)
            benefits = db.query(BenefitTemplate).filter_by(
                card_template_id=card.card_template_id
            ).all()

            total_available = 0.0
            total_used = 0.0

            for benefit in benefits:
                start_date, end_date = get_current_period(benefit.period_type, today)
                total_available += benefit.max_value

                usage = db.query(BenefitUsage).filter(
                    BenefitUsage.user_card_id == card.id,
                    BenefitUsage.benefit_template_id == benefit.id,
                    BenefitUsage.period_start_date == start_date,
                ).first()

                if usage:
                    total_used += usage.amount_used

            if total_available > 0:
                pct = int(total_used / total_available * 100)
                summary_items.append({
                    "name": card_template.name,
                    "card": card_template.name,
                    "amount": f"${total_used:.0f} / ${total_available:.0f}",
                    "expires": f"{pct}%",
                })

        if summary_items:
            send_notification_email(
                db,
                user,
                "utilization_summary",
                ref_key,
                "Weekly benefits summary",
                summary_items,
            )
