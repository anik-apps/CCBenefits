import logging
from typing import Protocol

logger = logging.getLogger(__name__)


class EmailSender(Protocol):
    def send_reset_email(self, to: str, token: str) -> None: ...


class ConsoleEmailSender:
    """Logs reset emails to console. Replace with real sender in production."""

    def send_reset_email(self, to: str, token: str) -> None:
        logger.info(f"Password reset requested for {to}. Token: {token[:8]}...")


_sender: EmailSender = ConsoleEmailSender()


def get_email_sender() -> EmailSender:
    return _sender


def set_email_sender(sender: EmailSender) -> None:
    global _sender
    _sender = sender
