import logging
from typing import Protocol

from .metrics import email_sent_counter

logger = logging.getLogger(__name__)

# Sender addresses
NOREPLY_FROM = "CCBenefits <noreply@ccb.kumaranik.com>"
NOTIFICATIONS_FROM = "CCBenefits <notifications@ccb.kumaranik.com>"

# Shared footer for all emails
EMAIL_FOOTER = """\
<div style="margin-top:32px;padding-top:16px;border-top:1px solid #222;font-size:0.75em;color:#555;">
  <p>This mailbox is not monitored — please do not reply to this email.</p>
  <p>To provide feedback, visit <a href="https://ccb.kumaranik.com" style="color:#c9a84c;">CCBenefits</a> and use the feedback option.</p>
  <p>CCBenefits — Track your credit card benefits</p>
</div>"""


class EmailSender(Protocol):
    def send(self, to: str, subject: str, html_body: str, from_address: str | None = None) -> None: ...


class ConsoleEmailSender:
    """Logs emails to console. Used in development when no email provider is configured."""

    def send(self, to: str, subject: str, html_body: str, from_address: str | None = None) -> None:
        logger.info(f"Email to {to} | From: {from_address or 'default'} | Subject: {subject}")
        logger.debug(f"Body: {html_body}")


class ResendEmailSender:
    """Sends emails via Resend API."""

    def __init__(self, api_key: str, from_address: str) -> None:
        import resend

        resend.api_key = api_key
        self._from_address = from_address

    def send(self, to: str, subject: str, html_body: str, from_address: str | None = None) -> None:
        import resend

        resend.Emails.send({
            "from": from_address or self._from_address,
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
    body = f"""\
    <div style="max-width:600px;margin:0 auto;font-family:system-ui,-apple-system,sans-serif;background:#0a0a0f;color:#e0e0e0;padding:24px;border-radius:8px;">
    <h2 style="color:#c9a84c;margin-top:0;">Verify your email</h2>
    <p>Click the link below to verify your email address:</p>
    <p><a href="{link}" style="display:inline-block;padding:12px 24px;background:#c9a84c;color:#0a0a0f;text-decoration:none;border-radius:6px;font-weight:600;">Verify Email</a></p>
    <p style="color:#888;font-size:0.85em;">Or copy this link: {link}</p>
    <p style="color:#888;font-size:0.85em;">This link expires in 24 hours.</p>
    {EMAIL_FOOTER}
    </div>"""
    try:
        sender.send(to, "Verify your CCBenefits email", body, from_address=NOREPLY_FROM)
        email_sent_counter.add(1, {"type": "verification", "success": "true"})
    except Exception:
        email_sent_counter.add(1, {"type": "verification", "success": "false"})
        raise


def send_password_reset_email(sender: EmailSender, to: str, token: str, base_url: str) -> None:
    link = f"{base_url}/reset-password?token={token}"
    body = f"""\
    <div style="max-width:600px;margin:0 auto;font-family:system-ui,-apple-system,sans-serif;background:#0a0a0f;color:#e0e0e0;padding:24px;border-radius:8px;">
    <h2 style="color:#c9a84c;margin-top:0;">Reset your password</h2>
    <p>Click the link below to reset your password:</p>
    <p><a href="{link}" style="display:inline-block;padding:12px 24px;background:#c9a84c;color:#0a0a0f;text-decoration:none;border-radius:6px;font-weight:600;">Reset Password</a></p>
    <p style="color:#888;font-size:0.85em;">Or copy this link: {link}</p>
    <p style="color:#888;font-size:0.85em;">This link expires in 1 hour. If you didn't request this, ignore this email.</p>
    {EMAIL_FOOTER}
    </div>"""
    try:
        sender.send(to, "Reset your CCBenefits password", body, from_address=NOREPLY_FROM)
        email_sent_counter.add(1, {"type": "reset", "success": "true"})
    except Exception:
        email_sent_counter.add(1, {"type": "reset", "success": "false"})
        raise
