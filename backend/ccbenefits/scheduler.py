import logging
from datetime import datetime, timedelta
from datetime import timezone as dt_timezone
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger
from sqlalchemy.exc import SQLAlchemyError

from . import config
from .database import SessionLocal
from .metrics import notification_jobs_counter, notification_users_gauge
from .models import User

logger = logging.getLogger(__name__)

scheduler = BackgroundScheduler()


def get_users_for_notification_hour(db, utc_hour: int) -> list[User]:
    """Return verified, active users whose notification_hour matches the given UTC hour.

    Uses DB-level filtering for active/verified, then timezone calculation in Python.

    NOTE: Fractional timezone limitation — timezones with non-integer UTC offsets
    (e.g., Asia/Kolkata UTC+5:30) are truncated to the nearest whole hour via int().
    Notifications may fire ~30 minutes early for half-hour offset zones.
    """
    active_users = (
        db.query(User)
        .filter(User.is_verified.is_(True), User.is_active.is_(True))
        .order_by(User.id)
        .all()
    )
    matched: list[User] = []
    for user in active_users:
        prefs = user.notification_preferences or {}
        user_hour = prefs.get("notification_hour", 9)
        user_tz = user.timezone or "UTC"
        try:
            now_in_tz = datetime.now(ZoneInfo(user_tz))
            utc_offset = now_in_tz.utcoffset().total_seconds() / 3600
            user_utc_hour = int((user_hour - utc_offset) % 24)
            if user_utc_hour == utc_hour:
                matched.append(user)
        except ZoneInfoNotFoundError:
            logger.warning("Invalid timezone for user %s: %s", user.id, user_tz)
    return matched


def hourly_notification_check():
    """Runs every hour at minute=0. Dispatches notification jobs for matching users."""
    utc_hour = datetime.now(dt_timezone.utc).hour
    logger.info("Running hourly notification check for UTC hour %s", utc_hour)
    db = SessionLocal()
    try:
        from .notifications import (
            check_expiring_credits,
            check_fee_approaching,
            check_period_transitions,
        )

        users = get_users_for_notification_hour(db, utc_hour)
        if not users:
            return
        logger.info("Processing notifications for %d users", len(users))
        check_expiring_credits(db, users)
        check_period_transitions(db, users)
        check_fee_approaching(db, users)
        notification_jobs_counter.add(1, {"job": "hourly"})
        notification_users_gauge.set(len(users), {"job": "hourly"})
    except (SQLAlchemyError, ImportError) as exc:
        logger.exception("Error in hourly notification check: %s", exc)
        db.rollback()
    finally:
        db.close()


def weekly_utilization_check():
    """Runs Monday at each hour (24 invocations per Monday). Each invocation processes
    only users whose notification_hour matches the current UTC hour — by design for
    timezone-correct delivery."""
    utc_hour = datetime.now(dt_timezone.utc).hour
    db = SessionLocal()
    try:
        from .notifications import send_utilization_summary

        users = get_users_for_notification_hour(db, utc_hour)
        if users:
            send_utilization_summary(db, users)
        notification_jobs_counter.add(1, {"job": "weekly"})
        notification_users_gauge.set(len(users), {"job": "weekly"})
    except (SQLAlchemyError, ImportError) as exc:
        logger.exception("Error in weekly utilization check: %s", exc)
        db.rollback()
    finally:
        db.close()


def cleanup_expired_data():
    """Weekly cleanup of old notifications and expired tokens."""
    db = SessionLocal()
    try:
        from .models import Notification, UnsubscribeToken, User

        # All DateTime columns use DateTime without timezone=True, so compare with naive UTC
        now = datetime.now(dt_timezone.utc).replace(tzinfo=None)

        # Clean old notifications (90+ days)
        cutoff = now - timedelta(days=90)
        notif_deleted = db.query(Notification).filter(Notification.created_at < cutoff).delete()

        # Clean expired verification tokens
        verif_cleared = (
            db.query(User)
            .filter(User.verification_token.isnot(None), User.verification_token_expires < now)
            .update({"verification_token": None, "verification_token_expires": None})
        )

        # Clean expired password reset tokens
        reset_cleared = (
            db.query(User)
            .filter(User.password_reset_token.isnot(None), User.password_reset_expires < now)
            .update({"password_reset_token": None, "password_reset_expires": None})
        )

        # Clean expired unsubscribe tokens
        unsub_deleted = db.query(UnsubscribeToken).filter(UnsubscribeToken.expires_at < now).delete()

        db.commit()
        logger.info(
            "Cleanup: %d notifications, %d verification tokens, %d reset tokens, %d unsubscribe tokens",
            notif_deleted, verif_cleared, reset_cleared, unsub_deleted,
        )
    except SQLAlchemyError as exc:
        logger.exception("Error in cleanup_expired_data: %s", exc)
        db.rollback()
    finally:
        db.close()


def start_scheduler():
    if not config.SCHEDULER_ENABLED:
        logger.info("Notification scheduler disabled (CCB_SCHEDULER_ENABLED=false)")
        return
    scheduler.add_job(
        hourly_notification_check,
        CronTrigger(minute=0),
        id="hourly_notifications",
        replace_existing=True,
    )
    scheduler.add_job(
        weekly_utilization_check,
        CronTrigger(day_of_week="mon", minute=0),
        id="weekly_utilization",
        replace_existing=True,
    )
    scheduler.add_job(
        cleanup_expired_data,
        CronTrigger(day_of_week="sun", hour=3),
        id="cleanup_expired_data",
        replace_existing=True,
    )
    scheduler.start()
    logger.info("Notification scheduler started")


def stop_scheduler():
    if scheduler.running:
        scheduler.shutdown(wait=False)
        logger.info("Notification scheduler stopped")
