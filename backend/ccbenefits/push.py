"""Expo Push Notification sender with batch stale token cleanup."""

import logging

import httpx

from .metrics import notifications_sent_counter

logger = logging.getLogger(__name__)

EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send"


def send_push_notifications(
    tokens: list[str],
    title: str,
    body: str,
    data: dict = None,
    db=None,
    notification_type: str = "push",
) -> int:
    """Send push notifications via Expo Push API.

    Returns the number of successfully sent notifications.
    Automatically purges stale (DeviceNotRegistered) tokens when a db session is provided.
    """
    if not tokens:
        return 0

    messages = [{"to": t, "title": title, "body": body, "data": data or {}} for t in tokens]
    sent_count = 0
    try:
        with httpx.Client(timeout=10) as client:
            resp = client.post(EXPO_PUSH_URL, json=messages)
            resp.raise_for_status()
            tickets = resp.json().get("data", [])

            stale_tokens = []
            for i, ticket in enumerate(tickets):
                token = tokens[i] if i < len(tokens) else None
                if ticket.get("status") == "ok":
                    sent_count += 1
                    notifications_sent_counter.add(
                        1, {"type": notification_type, "channel": "push", "success": "true"}
                    )
                elif ticket.get("status") == "error":
                    error = ticket.get("details", {}).get("error", "")
                    logger.warning("Push failed for %s: %s", token, error)
                    notifications_sent_counter.add(
                        1, {"type": notification_type, "channel": "push", "success": "false"}
                    )
                    if error == "DeviceNotRegistered" and token:
                        stale_tokens.append(token)

            # Batch delete stale tokens
            if stale_tokens and db:
                from .models import PushToken

                db.query(PushToken).filter(PushToken.token.in_(stale_tokens)).delete(
                    synchronize_session="fetch"
                )
                db.commit()
                logger.info("Purged %d stale push tokens", len(stale_tokens))
    except Exception:
        logger.exception("Failed to send push notifications")

    return sent_count
