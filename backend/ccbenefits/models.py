import enum
from datetime import date, datetime, timezone

from sqlalchemy import (
    Boolean,
    Date,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .database import Base


class PeriodType(str, enum.Enum):
    monthly = "monthly"
    quarterly = "quarterly"
    semiannual = "semiannual"
    annual = "annual"


class RedemptionType(str, enum.Enum):
    binary = "binary"
    continuous = "continuous"


class CardTemplate(Base):
    __tablename__ = "card_templates"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    issuer: Mapped[str] = mapped_column(String, nullable=False)
    annual_fee: Mapped[float] = mapped_column(Float, nullable=False)
    image_url: Mapped[str | None] = mapped_column(String, nullable=True)

    benefits: Mapped[list["BenefitTemplate"]] = relationship(
        back_populates="card_template", cascade="all, delete-orphan"
    )
    user_cards: Mapped[list["UserCard"]] = relationship(
        back_populates="card_template"
    )


class BenefitTemplate(Base):
    __tablename__ = "benefit_templates"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    card_template_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("card_templates.id", ondelete="CASCADE"), nullable=False
    )
    name: Mapped[str] = mapped_column(String, nullable=False)
    description: Mapped[str | None] = mapped_column(String, nullable=True)
    max_value: Mapped[float] = mapped_column(Float, nullable=False)
    period_type: Mapped[str] = mapped_column(String, nullable=False)
    redemption_type: Mapped[str] = mapped_column(String, nullable=False, default="continuous")
    category: Mapped[str] = mapped_column(String, nullable=False)

    card_template: Mapped["CardTemplate"] = relationship(back_populates="benefits")


class UserCard(Base):
    __tablename__ = "user_cards"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    card_template_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("card_templates.id"), nullable=False
    )
    nickname: Mapped[str | None] = mapped_column(String, nullable=True)
    member_since_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(timezone.utc), nullable=False
    )

    card_template: Mapped["CardTemplate"] = relationship(back_populates="user_cards")
    usages: Mapped[list["BenefitUsage"]] = relationship(
        back_populates="user_card", cascade="all, delete-orphan"
    )
    benefit_settings: Mapped[list["UserBenefitSetting"]] = relationship(
        back_populates="user_card", cascade="all, delete-orphan"
    )


class UserBenefitSetting(Base):
    __tablename__ = "user_benefit_settings"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_card_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("user_cards.id", ondelete="CASCADE"), nullable=False
    )
    benefit_template_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("benefit_templates.id", ondelete="CASCADE"), nullable=False
    )
    perceived_max_value: Mapped[float] = mapped_column(Float, nullable=False)

    user_card: Mapped["UserCard"] = relationship(back_populates="benefit_settings")
    benefit_template: Mapped["BenefitTemplate"] = relationship()

    __table_args__ = (
        UniqueConstraint("user_card_id", "benefit_template_id", name="uq_user_benefit_setting"),
    )


class BenefitUsage(Base):
    __tablename__ = "benefit_usages"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_card_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("user_cards.id", ondelete="CASCADE"), nullable=False
    )
    benefit_template_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("benefit_templates.id", ondelete="CASCADE"), nullable=False
    )
    period_start_date: Mapped[date] = mapped_column(Date, nullable=False)
    period_end_date: Mapped[date] = mapped_column(Date, nullable=False)
    amount_used: Mapped[float] = mapped_column(Float, nullable=False)
    notes: Mapped[str | None] = mapped_column(String, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(timezone.utc), nullable=False
    )

    user_card: Mapped["UserCard"] = relationship(back_populates="usages")
    benefit_template: Mapped["BenefitTemplate"] = relationship()

    __table_args__ = (
        UniqueConstraint(
            "user_card_id", "benefit_template_id", "period_start_date",
            name="uq_usage_per_period"
        ),
    )
