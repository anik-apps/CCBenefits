from datetime import date

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload

from ..database import get_db
from ..dependencies import get_current_user
from ..metrics import cards_added_counter
from ..models import (
    BenefitTemplate,
    BenefitUsage,
    CardTemplate,
    RedemptionType,
    User,
    UserBenefitSetting,
    UserCard,
)
from ..schemas import (
    BenefitSettingUpdate,
    BenefitStatusOut,
    BenefitUsageCreate,
    BenefitUsageOut,
    PeriodSegment,
    UserCardCreate,
    UserCardDetailOut,
    UserCardOut,
    UserCardSummaryOut,
)
from ..utils import compute_annual_max, get_all_periods_in_year, get_current_period

router = APIRouter(prefix="/api/user-cards", tags=["user-cards"])


@router.post("/", response_model=UserCardOut, status_code=201)
def create_user_card(
    data: UserCardCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    card_template = db.query(CardTemplate).filter(CardTemplate.id == data.card_template_id).first()
    if not card_template:
        raise HTTPException(status_code=404, detail="Card template not found")

    user_card = UserCard(
        user_id=current_user.id,
        card_template_id=data.card_template_id,
        nickname=data.nickname,
        member_since_date=data.member_since_date,
    )
    db.add(user_card)
    db.commit()
    db.refresh(user_card)
    cards_added_counter.add(1)

    return UserCardOut(
        id=user_card.id,
        card_template_id=user_card.card_template_id,
        card_name=card_template.name,
        issuer=card_template.issuer,
        annual_fee=card_template.annual_fee,
        nickname=user_card.nickname,
        member_since_date=user_card.member_since_date,
        is_active=user_card.is_active,
        created_at=user_card.created_at,
    )


@router.get("/", response_model=list[UserCardSummaryOut])
def list_user_cards(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    user_cards = (
        db.query(UserCard)
        .filter(UserCard.user_id == current_user.id, UserCard.is_active == True)
        .options(
            joinedload(UserCard.card_template).joinedload(CardTemplate.benefits),
            joinedload(UserCard.usages),
            joinedload(UserCard.benefit_settings),
        )
        .all()
    )

    result = []
    for uc in user_cards:
        summary = _compute_summary(uc)
        result.append(summary)
    return result


@router.get("/{user_card_id}", response_model=UserCardDetailOut)
def get_user_card_detail(
    user_card_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    uc = (
        db.query(UserCard)
        .options(
            joinedload(UserCard.card_template).joinedload(CardTemplate.benefits),
            joinedload(UserCard.usages),
            joinedload(UserCard.benefit_settings),
        )
        .filter(UserCard.id == user_card_id, UserCard.user_id == current_user.id)
        .first()
    )
    if not uc:
        raise HTTPException(status_code=404, detail="User card not found")

    benefits_status = _compute_benefits_status(uc)

    return UserCardDetailOut(
        id=uc.id,
        card_template_id=uc.card_template_id,
        card_name=uc.card_template.name,
        issuer=uc.card_template.issuer,
        annual_fee=uc.card_template.annual_fee,
        nickname=uc.nickname,
        member_since_date=uc.member_since_date,
        is_active=uc.is_active,
        benefits_status=benefits_status,
    )


@router.delete("/{user_card_id}", status_code=204)
def delete_user_card(
    user_card_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    uc = db.query(UserCard).filter(UserCard.id == user_card_id, UserCard.user_id == current_user.id).first()
    if not uc:
        raise HTTPException(status_code=404, detail="User card not found")
    db.delete(uc)
    db.commit()


@router.post("/{user_card_id}/usage", response_model=BenefitUsageOut, status_code=201)
def log_usage(
    user_card_id: int,
    data: BenefitUsageCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    uc = db.query(UserCard).filter(UserCard.id == user_card_id, UserCard.user_id == current_user.id).first()
    if not uc:
        raise HTTPException(status_code=404, detail="User card not found")
    if not uc.is_active:
        raise HTTPException(status_code=400, detail="Cannot log usage for inactive card")

    benefit = db.query(BenefitTemplate).filter(BenefitTemplate.id == data.benefit_template_id).first()
    if not benefit:
        raise HTTPException(status_code=404, detail="Benefit template not found")
    if benefit.card_template_id != uc.card_template_id:
        raise HTTPException(status_code=400, detail="Benefit does not belong to this card")

    # Coerce binary benefits
    amount = data.amount_used
    if benefit.redemption_type == RedemptionType.binary:
        amount = benefit.max_value if amount > 0 else 0.0

    if amount > benefit.max_value:
        raise HTTPException(
            status_code=400,
            detail=f"Amount {amount} exceeds max value {benefit.max_value}",
        )

    target = data.target_date or date.today()
    period_start, period_end = get_current_period(benefit.period_type, target)

    # Check for existing usage in this period
    existing = (
        db.query(BenefitUsage)
        .filter(
            BenefitUsage.user_card_id == user_card_id,
            BenefitUsage.benefit_template_id == data.benefit_template_id,
            BenefitUsage.period_start_date == period_start,
        )
        .first()
    )
    if existing:
        raise HTTPException(
            status_code=409,
            detail="Usage already logged for this benefit in this period. Use PUT to update.",
        )

    usage = BenefitUsage(
        user_card_id=user_card_id,
        benefit_template_id=data.benefit_template_id,
        period_start_date=period_start,
        period_end_date=period_end,
        amount_used=amount,
        notes=data.notes,
    )
    db.add(usage)
    db.commit()
    db.refresh(usage)

    return BenefitUsageOut(
        id=usage.id,
        benefit_template_id=usage.benefit_template_id,
        benefit_name=benefit.name,
        period_start_date=usage.period_start_date,
        period_end_date=usage.period_end_date,
        amount_used=usage.amount_used,
        notes=usage.notes,
        created_at=usage.created_at,
    )


@router.put(
    "/{user_card_id}/benefits/{benefit_template_id}/setting",
    response_model=dict,
)
def upsert_benefit_setting(
    user_card_id: int,
    benefit_template_id: int,
    data: BenefitSettingUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    uc = db.query(UserCard).filter(UserCard.id == user_card_id, UserCard.user_id == current_user.id).first()
    if not uc:
        raise HTTPException(status_code=404, detail="User card not found")

    benefit = db.query(BenefitTemplate).filter(BenefitTemplate.id == benefit_template_id).first()
    if not benefit:
        raise HTTPException(status_code=404, detail="Benefit template not found")
    if benefit.card_template_id != uc.card_template_id:
        raise HTTPException(status_code=400, detail="Benefit does not belong to this card")

    setting = (
        db.query(UserBenefitSetting)
        .filter(
            UserBenefitSetting.user_card_id == user_card_id,
            UserBenefitSetting.benefit_template_id == benefit_template_id,
        )
        .first()
    )

    if setting:
        setting.perceived_max_value = data.perceived_max_value
    else:
        setting = UserBenefitSetting(
            user_card_id=user_card_id,
            benefit_template_id=benefit_template_id,
            perceived_max_value=data.perceived_max_value,
        )
        db.add(setting)

    db.commit()
    return {"perceived_max_value": data.perceived_max_value}


@router.get("/{user_card_id}/summary", response_model=UserCardSummaryOut)
def get_card_summary(
    user_card_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    uc = (
        db.query(UserCard)
        .options(
            joinedload(UserCard.card_template).joinedload(CardTemplate.benefits),
            joinedload(UserCard.usages),
            joinedload(UserCard.benefit_settings),
        )
        .filter(UserCard.id == user_card_id, UserCard.user_id == current_user.id)
        .first()
    )
    if not uc:
        raise HTTPException(status_code=404, detail="User card not found")

    return _compute_summary(uc)


def _compute_benefits_status(uc: UserCard) -> list[BenefitStatusOut]:
    settings_map = {s.benefit_template_id: s.perceived_max_value for s in uc.benefit_settings}
    today = date.today()
    current_year = today.year

    # Index usages by (benefit_id, period_start)
    usage_map: dict[tuple[int, date], "BenefitUsage"] = {}
    for u in uc.usages:
        usage_map[(u.benefit_template_id, u.period_start_date)] = u

    result = []

    for benefit in uc.card_template.benefits:
        period_start, period_end = get_current_period(benefit.period_type, today)
        days_remaining = max(0, (period_end - today).days)

        usage = usage_map.get((benefit.id, period_start))

        amount_used = usage.amount_used if usage else 0.0
        perceived_max = settings_map.get(benefit.id, benefit.max_value)

        if benefit.max_value > 0:
            utilized_perceived = amount_used * (perceived_max / benefit.max_value)
        else:
            utilized_perceived = 0.0

        # Build period segments for the year
        all_periods = get_all_periods_in_year(benefit.period_type, current_year)
        segments = []
        for p_start, p_end, label in all_periods:
            p_usage = usage_map.get((benefit.id, p_start))
            is_future = p_start > today
            segments.append(
                PeriodSegment(
                    label=label,
                    period_start_date=p_start,
                    period_end_date=p_end,
                    amount_used=p_usage.amount_used if p_usage else 0.0,
                    usage_id=p_usage.id if p_usage else None,
                    is_used=p_usage is not None and p_usage.amount_used > 0,
                    is_current=p_start == period_start,
                    is_future=is_future,
                )
            )

        result.append(
            BenefitStatusOut(
                benefit_template_id=benefit.id,
                usage_id=usage.id if usage else None,
                name=benefit.name,
                description=benefit.description,
                max_value=benefit.max_value,
                period_type=benefit.period_type,
                redemption_type=benefit.redemption_type,
                category=benefit.category,
                period_start_date=period_start,
                period_end_date=period_end,
                days_remaining=days_remaining,
                amount_used=amount_used,
                remaining=max(0, benefit.max_value - amount_used),
                perceived_max_value=perceived_max,
                utilized_perceived_value=round(utilized_perceived, 2),
                is_used=usage is not None and usage.amount_used > 0,
                periods=segments,
            )
        )

    return result


def _compute_summary(uc: UserCard) -> UserCardSummaryOut:
    settings_map = {s.benefit_template_id: s.perceived_max_value for s in uc.benefit_settings}
    today = date.today()
    current_year = today.year

    total_annual_max = sum(
        compute_annual_max(b.max_value, b.period_type) for b in uc.card_template.benefits
    )
    total_perceived_annual = sum(
        compute_annual_max(settings_map.get(b.id, b.max_value), b.period_type)
        for b in uc.card_template.benefits
    )

    # YTD: sum all usage in the current calendar year
    ytd_actual = 0.0
    ytd_perceived = 0.0
    benefits_used_ids = set()
    benefits_by_id = {b.id: b for b in uc.card_template.benefits}

    for usage in uc.usages:
        if usage.period_start_date.year == current_year:
            ytd_actual += usage.amount_used
            benefit = benefits_by_id.get(usage.benefit_template_id)
            if benefit and benefit.max_value > 0:
                perceived_max = settings_map.get(benefit.id, benefit.max_value)
                ytd_perceived += usage.amount_used * (perceived_max / benefit.max_value)

            # Check if benefit is used in current period
            period_start, _ = get_current_period(
                benefit.period_type if benefit else "annual", today
            )
            if usage.period_start_date == period_start and usage.amount_used > 0:
                benefits_used_ids.add(usage.benefit_template_id)

    # Prorated max: only count periods that have started
    prorated_max = 0.0
    for benefit in uc.card_template.benefits:
        annual_max = compute_annual_max(benefit.max_value, benefit.period_type)
        # How many periods have elapsed or are current this year?
        if benefit.period_type == "monthly":
            periods_elapsed = today.month
            prorated_max += benefit.max_value * periods_elapsed
        elif benefit.period_type == "quarterly":
            quarters_elapsed = ((today.month - 1) // 3) + 1
            prorated_max += benefit.max_value * quarters_elapsed
        elif benefit.period_type == "semiannual":
            halves_elapsed = 1 if today.month <= 6 else 2
            prorated_max += benefit.max_value * halves_elapsed
        else:  # annual
            prorated_max += annual_max

    utilization_pct = (ytd_actual / prorated_max * 100) if prorated_max > 0 else 0.0

    return UserCardSummaryOut(
        id=uc.id,
        card_name=uc.card_template.name,
        issuer=uc.card_template.issuer,
        annual_fee=uc.card_template.annual_fee,
        total_max_annual_value=round(total_annual_max, 2),
        total_perceived_annual_value=round(total_perceived_annual, 2),
        ytd_actual_used=round(ytd_actual, 2),
        ytd_perceived_value=round(ytd_perceived, 2),
        net_actual=round(ytd_actual - uc.card_template.annual_fee, 2),
        net_perceived=round(ytd_perceived - uc.card_template.annual_fee, 2),
        utilization_pct=round(utilization_pct, 2),
        benefit_count=len(uc.card_template.benefits),
        benefits_used_count=len(benefits_used_ids),
    )
