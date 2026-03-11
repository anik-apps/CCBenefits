from .config import ADMIN_EMAILS
from .models import User
from .schemas import UserOut


def user_out(user: User) -> UserOut:
    out = UserOut.model_validate(user)
    out.is_admin = user.email.lower() in ADMIN_EMAILS
    return out
