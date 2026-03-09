import logging
from typing import Protocol

logger = logging.getLogger(__name__)


class EmailSender(Protocol):
    def send(self, to: str, subject: str, html_body: str) -> None: ...


class ConsoleEmailSender:
    """Logs emails to console. Used in development when no email provider is configured."""

    def send(self, to: str, subject: str, html_body: str) -> None:
        logger.info(f"Email to {to} | Subject: {subject}")
        logger.debug(f"Body: {html_body}")


class ResendEmailSender:
    """Sends emails via Resend API."""

    def __init__(self, api_key: str, from_address: str) -> None:
        import resend

        resend.api_key = api_key
        self._from_address = from_address

    def send(self, to: str, subject: str, html_body: str) -> None:
        import resend

        resend.Emails.send({
            "from": self._from_address,
            "to": [to],
            "subject": subject,
            "html": html_body,
        })


_sender: EmailSender = ConsoleEmailSender()


def get_email_sender() -> EmailSender:
    return _sender


def set_email_sender(sender: EmailSender) -> None:
    global _sender
    _sender = sender


def send_verification_email(sender: EmailSender, to: str, token: str, base_url: str) -> None:
    link = f"{base_url}/verify?token={token}"
    html = f"""
    <h2>Verify your email</h2>
    <p>Click the link below to verify your email address:</p>
    <p><a href="{link}" style="display:inline-block;padding:12px 24px;background:#c9a84c;color:#0a0a0f;text-decoration:none;border-radius:6px;font-weight:600;">Verify Email</a></p>
    <p style="color:#888;font-size:0.85em;">Or copy this link: {link}</p>
    <p style="color:#888;font-size:0.85em;">This link expires in 24 hours.</p>
    """
    sender.send(to, "Verify your CCBenefits email", html)


def send_password_reset_email(sender: EmailSender, to: str, token: str, base_url: str) -> None:
    link = f"{base_url}/reset-password?token={token}"
    html = f"""
    <h2>Reset your password</h2>
    <p>Click the link below to reset your password:</p>
    <p><a href="{link}" style="display:inline-block;padding:12px 24px;background:#c9a84c;color:#0a0a0f;text-decoration:none;border-radius:6px;font-weight:600;">Reset Password</a></p>
    <p style="color:#888;font-size:0.85em;">Or copy this link: {link}</p>
    <p style="color:#888;font-size:0.85em;">This link expires in 1 hour. If you didn't request this, ignore this email.</p>
    """
    sender.send(to, "Reset your CCBenefits password", html)
