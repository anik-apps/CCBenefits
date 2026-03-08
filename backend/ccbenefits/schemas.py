from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field


# --- Card Template schemas ---


class BenefitTemplateOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    description: str | None
    max_value: float
    period_type: str
    redemption_type: str
    category: str


class CardTemplateOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    issuer: str
    annual_fee: float
    image_url: str | None
    benefits: list[BenefitTemplateOut]
    total_annual_value: float = 0.0


class CardTemplateListItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    issuer: str
    annual_fee: float
    image_url: str | None
    benefit_count: int = 0
    total_annual_value: float = 0.0


# --- User Card schemas ---


class UserCardCreate(BaseModel):
    card_template_id: int
    nickname: str | None = None
    member_since_date: date | None = None


class UserCardOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    card_template_id: int
    card_name: str
    issuer: str
    annual_fee: float
    nickname: str | None
    member_since_date: date | None
    is_active: bool
    created_at: datetime


# --- Benefit Usage schemas ---


class BenefitUsageCreate(BaseModel):
    benefit_template_id: int
    amount_used: float = Field(ge=0)
    notes: str | None = None
    target_date: date | None = None


class BenefitUsageUpdate(BaseModel):
    amount_used: float | None = Field(default=None, ge=0)
    notes: str | None = None


class BenefitUsageOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    benefit_template_id: int
    benefit_name: str
    period_start_date: date
    period_end_date: date
    amount_used: float
    notes: str | None
    created_at: datetime


# --- Benefit Setting schemas ---


class BenefitSettingUpdate(BaseModel):
    perceived_max_value: float = Field(ge=0)


# --- Benefit Status (for card detail) ---


class PeriodSegment(BaseModel):
    label: str
    period_start_date: date
    period_end_date: date
    amount_used: float
    usage_id: int | None = None
    is_used: bool
    is_current: bool
    is_future: bool


class BenefitStatusOut(BaseModel):
    benefit_template_id: int
    usage_id: int | None = None
    name: str
    description: str | None
    max_value: float
    period_type: str
    redemption_type: str
    category: str
    period_start_date: date
    period_end_date: date
    days_remaining: int
    amount_used: float
    remaining: float
    perceived_max_value: float
    utilized_perceived_value: float
    is_used: bool
    periods: list[PeriodSegment] = []


class UserCardDetailOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    card_template_id: int
    card_name: str
    issuer: str
    annual_fee: float
    nickname: str | None
    member_since_date: date | None
    is_active: bool
    benefits_status: list[BenefitStatusOut]


# --- Summary / ROI ---


class UserCardSummaryOut(BaseModel):
    id: int
    card_name: str
    issuer: str
    annual_fee: float
    total_max_annual_value: float
    total_perceived_annual_value: float
    ytd_actual_used: float
    ytd_perceived_value: float
    net_actual: float
    net_perceived: float
    utilization_pct: float
    benefit_count: int
    benefits_used_count: int


# --- Auth schemas ---


class UserRegister(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=72)  # bcrypt truncates at 72 bytes
    display_name: str = Field(min_length=1)


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class RefreshRequest(BaseModel):
    refresh_token: str


class PasswordResetRequest(BaseModel):
    email: EmailStr


class PasswordReset(BaseModel):
    token: str
    new_password: str = Field(min_length=8, max_length=72)


class PasswordChange(BaseModel):
    current_password: str
    new_password: str = Field(min_length=8, max_length=72)


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    email: str
    display_name: str
    preferred_currency: str
    timezone: str
    notification_preferences: dict | None
    is_active: bool
    created_at: datetime


class UserUpdate(BaseModel):
    display_name: str | None = None
    preferred_currency: str | None = None
    timezone: str | None = None
    notification_preferences: dict | None = None


class AuthResponse(BaseModel):
    user: UserOut
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
