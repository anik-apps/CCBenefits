import logging
from datetime import datetime, timezone as dt_timezone
from zoneinfo import ZoneInfo

from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger

from . import config
from .database import SessionLocal
from .models import User

logger = logging.getLogger(__name__)

scheduler = BackgroundScheduler()


def get_users_for_notification_hour(db, utc_hour: int) -> list[User]:
    """Return verified, active users whose notification_hour matches the given UTC hour.

    NOTE: Fractional timezone limitation — timezones with non-integer UTC offsets
    (e.g., Asia/Kolkata UTC+5:30) are truncated to the nearest whole hour via int().
    Notifications may fire ~30 minutes early for half-hour offset zones.
    """
    all_users = db.query(User).filter(
        User.is_verified.is_(True), User.is_active.is_(True)
    ).all()
    matched = []
    for user in all_users:
        prefs = user.notification_preferences or {}
        user_hour = prefs.get("notification_hour", 9)
        user_tz = user.timezone or "UTC"
        try:
            now_in_tz = datetime.now(ZoneInfo(user_tz))
            utc_offset = now_in_tz.utcoffset().total_seconds() / 3600
            user_utc_hour = int((user_hour - utc_offset) % 24)
            if user_utc_hour == utc_hour:
                matched.append(user)
        except Exception:
            logger.warning(f"Invalid timezone for user {user.id}: {user_tz}")
    return matched


def hourly_notification_check():
    """Runs every hour at minute=0. Dispatches notification jobs for matching users."""
    utc_hour = datetime.now(dt_timezone.utc).hour
    logger.info(f"Running hourly notification check for UTC hour {utc_hour}")
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
        logger.info(f"Processing notifications for {len(users)} users")
        check_expiring_credits(db, users)
        check_period_transitions(db, users)
        check_fee_approaching(db, users)
    except Exception:
        logger.exception("Error in hourly notification check")
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
    except Exception:
        logger.exception("Error in weekly utilization check")
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
    scheduler.start()
    logger.info("Notification scheduler started")


def stop_scheduler():
    if scheduler.running:
        scheduler.shutdown(wait=False)
        logger.info("Notification scheduler stopped")
