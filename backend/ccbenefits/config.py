import os
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

ALLOWED_ORIGINS = [
    origin.strip()
    for origin in os.environ.get(
        "CCB_ALLOWED_ORIGINS", "http://localhost:5173,http://localhost:8000"
    ).split(",")
    if origin.strip()
]
