from unittest.mock import MagicMock, patch

from ccbenefits.email import (
    ConsoleEmailSender,
    send_password_reset_email,
    send_verification_email,
)


def test_console_sender_send(caplog):
    sender = ConsoleEmailSender()
    with caplog.at_level("INFO"):
        sender.send("test@test.com", "Test Subject", "<p>Body</p>")
    assert "test@test.com" in caplog.text
    assert "Test Subject" in caplog.text


def test_resend_sender_send():
    from ccbenefits.email import ResendEmailSender

    sender = ResendEmailSender(api_key="re_test", from_address="noreply@test.com")
    with patch("resend.Emails") as mock_emails:
        sender.send("user@test.com", "Subject", "<p>HTML</p>")
        mock_emails.send.assert_called_once_with({
            "from": "noreply@test.com",
            "to": ["user@test.com"],
            "subject": "Subject",
            "html": "<p>HTML</p>",
        })


def test_send_verification_email():
    sender = MagicMock()
    send_verification_email(sender, "user@test.com", "abc123", "https://example.com")
    sender.send.assert_called_once()
    args = sender.send.call_args
    assert args[0][0] == "user@test.com"
    assert "Verify" in args[0][1]
    assert "https://example.com/verify?token=abc123" in args[0][2]


def test_send_password_reset_email():
    sender = MagicMock()
    send_password_reset_email(sender, "user@test.com", "xyz789", "https://example.com")
    sender.send.assert_called_once()
    args = sender.send.call_args
    assert args[0][0] == "user@test.com"
    assert "Reset" in args[0][1] or "reset" in args[0][1]
    assert "https://example.com/reset-password?token=xyz789" in args[0][2]
