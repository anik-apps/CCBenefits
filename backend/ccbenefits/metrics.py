"""Business metric counters for CCBenefits.

These are no-ops when OTel is not configured (no MeterProvider set).
"""

from opentelemetry import metrics

meter = metrics.get_meter("ccbenefits")

auth_login_counter = meter.create_counter("auth.login", description="Login attempts")
auth_register_counter = meter.create_counter("auth.register", description="Registrations")
auth_failure_counter = meter.create_counter("auth.failure", description="Auth failures")
verification_sent_counter = meter.create_counter("verification.email_sent", description="Verification emails sent")
verification_completed_counter = meter.create_counter(
    "verification.completed", description="Email verifications completed"
)
cards_added_counter = meter.create_counter("cards.added", description="Cards added")
feedback_submitted_counter = meter.create_counter("feedback.submitted", description="Feedback submitted")
email_sent_counter = meter.create_counter("email.sent", description="Emails sent")
password_reset_counter = meter.create_counter("password_reset.requested", description="Password resets requested")
notifications_sent_counter = meter.create_counter(
    "notifications.sent",
    description="Notification emails sent",
)
notification_jobs_counter = meter.create_counter(
    "notifications.jobs_run",
    description="Notification job invocations",
)
notification_users_gauge = meter.create_gauge(
    "notifications.users_processed",
    description="Number of users processed in the last notification job run",
)
oauth_login_counter = meter.create_counter("oauth.login", description="OAuth sign-ins")
oauth_link_counter = meter.create_counter("oauth.link", description="OAuth link/unlink")
