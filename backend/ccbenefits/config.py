import os
import re
import warnings

SECRET_KEY = os.environ.get("CCB_SECRET_KEY", "")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30
REFRESH_TOKEN_EXPIRE_DAYS = 7
RESET_TOKEN_EXPIRE_HOURS = 1  # Used for password_reset_expires in DB

CCB_ENV = os.environ.get("CCB_ENV", "development")

if not SECRET_KEY:
    if CCB_ENV == "production":
        raise RuntimeError(
            "CCB_SECRET_KEY must be set in production. "
            "Set the CCB_SECRET_KEY environment variable."
        )
    SECRET_KEY = "dev-secret-key-do-not-use-in-production"
    warnings.warn(
        "CCB_SECRET_KEY not set — using insecure default. Set it for production!",
        stacklevel=2,
    )

DATABASE_URL = os.environ.get("DATABASE_URL", "sqlite:///./ccbenefits.db")

_EMAIL_RE = re.compile(r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$")

ADMIN_EMAILS = [
    e.strip().lower()
    for e in os.environ.get("CCB_ADMIN_EMAILS", "").split(",")
    if e.strip() and _EMAIL_RE.match(e.strip())
]

RESEND_API_KEY = os.environ.get("RESEND_API_KEY", "")
EMAIL_FROM = os.environ.get("CCB_EMAIL_FROM", "CCBenefits <notifications@ccb.kumaranik.com>")
FRONTEND_URL = os.environ.get("CCB_FRONTEND_URL", "http://localhost:5173")
VERIFICATION_TOKEN_EXPIRE_HOURS = 24

# OAuth
GOOGLE_CLIENT_ID = os.environ.get("GOOGLE_CLIENT_ID", "")
GOOGLE_CLIENT_ID_ANDROID = os.environ.get("GOOGLE_CLIENT_ID_ANDROID", "")
GOOGLE_CLIENT_ID_IOS = os.environ.get("GOOGLE_CLIENT_ID_IOS", "")
GOOGLE_CLIENT_IDS = [cid for cid in [GOOGLE_CLIENT_ID, GOOGLE_CLIENT_ID_ANDROID, GOOGLE_CLIENT_ID_IOS] if cid]

APPLE_SERVICE_ID = os.environ.get("APPLE_SERVICE_ID", "")
APPLE_BUNDLE_ID = os.environ.get("APPLE_BUNDLE_ID", "com.anikapps.ccbenefits")
APPLE_TEAM_ID = os.environ.get("APPLE_TEAM_ID", "")
APPLE_KEY_ID = os.environ.get("APPLE_KEY_ID", "")
APPLE_PRIVATE_KEY = os.environ.get("APPLE_PRIVATE_KEY", "")  # PEM format

GRAFANA_OTLP_ENDPOINT = os.environ.get("GRAFANA_OTLP_ENDPOINT", "")
GRAFANA_INSTANCE_ID = os.environ.get("GRAFANA_INSTANCE_ID", "")
GRAFANA_OTLP_TOKEN = os.environ.get("GRAFANA_OTLP_TOKEN", "")

SCHEDULER_ENABLED: bool = os.getenv("CCB_SCHEDULER_ENABLED", "false").lower() in ("true", "1", "yes")

ALLOWED_ORIGINS = [
    origin.strip()
    for origin in os.environ.get(
        "CCB_ALLOWED_ORIGINS", "http://localhost:5173,http://localhost:8000"
    ).split(",")
    if origin.strip()
]
