from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import or_
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
    CardCloseRequest,
    PeriodSegment,
    UserCardCreate,
    UserCardDetailOut,
    UserCardOut,
    UserCardSummaryOut,
    UserCardUpdate,
)
from ..utils import compute_annual_max, get_all_periods_in_year, get_current_period

router = APIRouter(prefix="/api/user-cards", tags=["user-cards"])


def _get_user_card(
    db: Session,
    card_id: int,
    user_id: int,
    *,
    load_benefits: bool = False,
) -> UserCard | None:
    query = db.query(UserCard).filter(UserCard.id == card_id, UserCard.user_id == user_id)
    if load_benefits:
        query = query.options(
            joinedload(UserCard.card_template).joinedload(CardTemplate.benefits),
            joinedload(UserCard.usages),
            joinedload(UserCard.benefit_settings),
        )
    else:
        query = query.options(joinedload(UserCard.card_template))
    return query.first()


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

    user_card.card_template = card_template
    return _to_user_card_out(user_card)


@router.patch("/{user_card_id}", response_model=UserCardOut)
def update_user_card(
    user_card_id: int,
    data: UserCardUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    uc = _get_user_card(db, user_card_id, current_user.id)
    if not uc:
        raise HTTPException(status_code=404, detail="User card not found")
    if data.renewal_date is not None:
        uc.renewal_date = data.renewal_date
    elif "renewal_date" in data.model_fields_set:
        uc.renewal_date = None
    db.commit()
    db.refresh(uc)
    return _to_user_card_out(uc)


def _to_user_card_out(uc: UserCard) -> UserCardOut:
    """Build UserCardOut from a UserCard with card_template loaded."""
    ct = uc.card_template
    return UserCardOut(
        id=uc.id,
        card_template_id=uc.card_template_id,
        card_name=ct.name,
        issuer=ct.issuer,
        annual_fee=ct.annual_fee,
        nickname=uc.nickname,
        member_since_date=uc.member_since_date,
        renewal_date=uc.renewal_date,
        closed_date=uc.closed_date,
        is_active=uc.is_active,
        created_at=uc.created_at,
    )


def _get_available_years(uc: UserCard) -> list[int]:
    """Compute available years for a card based on member_since and closed_date."""
    today = date.today()
    start_year = uc.member_since_date.year if uc.member_since_date else uc.created_at.year
    end_year = uc.closed_date.year if uc.closed_date else today.year
    return list(range(start_year, end_year + 1))


def _query_user_cards(db: Session, user_id: int, year: int):
    """Query user cards with year-aware filtering (includes closed cards active in the given year)."""
    return (
        db.query(UserCard)
        .filter(
            UserCard.user_id == user_id,
            # Show cards that were active at any point during the requested year
            or_(
                UserCard.closed_date.is_(None),
                UserCard.closed_date >= date(year, 1, 1),
            ),
            # Exclude cards opened after the requested year
            or_(
                UserCard.member_since_date.is_(None),
                UserCard.member_since_date <= date(year, 12, 31),
            ),
        )
        .options(
            joinedload(UserCard.card_template).joinedload(CardTemplate.benefits),
            joinedload(UserCard.usages),
            joinedload(UserCard.benefit_settings),
        )
        .all()
    )


@router.get("/", response_model=list[UserCardSummaryOut])
def list_user_cards(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    year: int | None = Query(default=None, ge=2000, le=2100, description="Year to compute summary for"),
):
    year = year or date.today().year
    user_cards = _query_user_cards(db, current_user.id, year)

    result = []
    for uc in user_cards:
        summary = _compute_summary(uc, year)
        summary.available_years = _get_available_years(uc)
        result.append(summary)
    return result


@router.get("/details", response_model=list[UserCardDetailOut])
def list_user_card_details(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    year: int | None = Query(default=None, ge=2000, le=2100, description="Year to compute details for"),
):
    year = year or date.today().year
    user_cards = _query_user_cards(db, current_user.id, year)

    result = []
    for uc in user_cards:
        summary = _compute_summary(uc, year)
        benefits_status = _compute_benefits_status(uc, year)
        result.append(
            UserCardDetailOut(
                id=uc.id,
                card_template_id=uc.card_template_id,
                card_name=uc.card_template.name,
                issuer=uc.card_template.issuer,
                annual_fee=uc.card_template.annual_fee,
                nickname=uc.nickname,
                member_since_date=uc.member_since_date,
                renewal_date=uc.renewal_date,
                closed_date=uc.closed_date,
                is_active=uc.is_active,
                available_years=_get_available_years(uc),
                ytd_actual_used=summary.ytd_actual_used,
                utilization_pct=summary.utilization_pct,
                benefits_status=benefits_status,
            )
        )

    result.sort(key=lambda x: x.utilization_pct)
    return result


@router.get("/{user_card_id}", response_model=UserCardDetailOut)
def get_user_card_detail(
    user_card_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    year: int | None = Query(default=None, ge=2000, le=2100, description="Year to compute details for"),
):
    year = year or date.today().year
    uc = _get_user_card(db, user_card_id, current_user.id, load_benefits=True)
    if not uc:
        raise HTTPException(status_code=404, detail="User card not found")

    summary = _compute_summary(uc, year)
    benefits_status = _compute_benefits_status(uc, year)

    return UserCardDetailOut(
        id=uc.id,
        card_template_id=uc.card_template_id,
        card_name=uc.card_template.name,
        issuer=uc.card_template.issuer,
        annual_fee=uc.card_template.annual_fee,
        nickname=uc.nickname,
        member_since_date=uc.member_since_date,
        renewal_date=uc.renewal_date,
        closed_date=uc.closed_date,
        is_active=uc.is_active,
        available_years=_get_available_years(uc),
        ytd_actual_used=summary.ytd_actual_used,
        utilization_pct=summary.utilization_pct,
        benefits_status=benefits_status,
    )


@router.delete("/{user_card_id}", status_code=204)
def delete_user_card(
    user_card_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    uc = _get_user_card(db, user_card_id, current_user.id)
    if not uc:
        raise HTTPException(status_code=404, detail="User card not found")
    db.delete(uc)
    db.commit()


@router.put("/{user_card_id}/close", response_model=UserCardOut)
def close_user_card(
    user_card_id: int,
    data: CardCloseRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    uc = _get_user_card(db, user_card_id, current_user.id)
    if not uc:
        raise HTTPException(status_code=404, detail="User card not found")
    if uc.closed_date is not None:
        raise HTTPException(status_code=400, detail="Card is already closed")
    if uc.member_since_date and data.closed_date < uc.member_since_date:
        raise HTTPException(status_code=400, detail="Close date cannot be before membership date")

    uc.closed_date = data.closed_date
    uc.is_active = False  # backward compat
    db.commit()
    db.refresh(uc)

    return _to_user_card_out(uc)


@router.put("/{user_card_id}/reopen", response_model=UserCardOut)
def reopen_user_card(
    user_card_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    uc = _get_user_card(db, user_card_id, current_user.id)
    if not uc:
        raise HTTPException(status_code=404, detail="User card not found")
    if uc.closed_date is None:
        raise HTTPException(status_code=400, detail="Card is not closed")

    uc.closed_date = None
    uc.is_active = True  # backward compat
    db.commit()
    db.refresh(uc)

    return _to_user_card_out(uc)


@router.post("/{user_card_id}/usage", response_model=BenefitUsageOut, status_code=201)
def log_usage(
    user_card_id: int,
    data: BenefitUsageCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    uc = _get_user_card(db, user_card_id, current_user.id)
    if not uc:
        raise HTTPException(status_code=404, detail="User card not found")

    # Date-range validation (replaces blanket is_active gate)
    target = data.target_date or date.today()
    if uc.member_since_date and target < uc.member_since_date:
        raise HTTPException(status_code=400, detail="Cannot log usage before card membership date")
    if uc.closed_date and target > uc.closed_date:
        raise HTTPException(status_code=400, detail="Cannot log usage after card close date")

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
    uc = _get_user_card(db, user_card_id, current_user.id)
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
    year: int | None = Query(default=None, ge=2000, le=2100, description="Year to compute summary for"),
):
    year = year or date.today().year
    uc = _get_user_card(db, user_card_id, current_user.id, load_benefits=True)
    if not uc:
        raise HTTPException(status_code=404, detail="User card not found")

    summary = _compute_summary(uc, year)
    summary.available_years = _get_available_years(uc)
    return summary


def _compute_benefits_status(uc: UserCard, year: int) -> list[BenefitStatusOut]:
    settings_map = {s.benefit_template_id: s.perceived_max_value for s in uc.benefit_settings}
    today = date.today()
    is_current_year = year == today.year

    # For past/future years, use last day of year as reference for "current period"
    reference_date = today if is_current_year else date(year, 12, 31)

    # Index usages by (benefit_id, period_start)
    usage_map: dict[tuple[int, date], "BenefitUsage"] = {}
    for u in uc.usages:
        usage_map[(u.benefit_template_id, u.period_start_date)] = u

    result = []

    for benefit in uc.card_template.benefits:
        period_start, period_end = get_current_period(benefit.period_type, reference_date)
        days_remaining = max(0, (period_end - today).days) if is_current_year else 0

        usage = usage_map.get((benefit.id, period_start))

        amount_used = usage.amount_used if usage else 0.0
        perceived_max = settings_map.get(benefit.id, benefit.max_value)

        if benefit.max_value > 0:
            utilized_perceived = amount_used * (perceived_max / benefit.max_value)
        else:
            utilized_perceived = 0.0

        # Build period segments for the year
        all_periods = get_all_periods_in_year(benefit.period_type, year)
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


def _compute_summary(uc: UserCard, year: int) -> UserCardSummaryOut:
    settings_map = {s.benefit_template_id: s.perceived_max_value for s in uc.benefit_settings}
    today = date.today()
    is_current_year = year == today.year
    is_past_year = year < today.year

    total_annual_max = sum(
        compute_annual_max(b.max_value, b.period_type) for b in uc.card_template.benefits
    )
    total_perceived_annual = sum(
        compute_annual_max(settings_map.get(b.id, b.max_value), b.period_type)
        for b in uc.card_template.benefits
    )

    # YTD: sum all usage in the requested year
    ytd_actual = 0.0
    ytd_perceived = 0.0
    benefits_used_ids = set()
    benefits_by_id = {b.id: b for b in uc.card_template.benefits}

    for usage in uc.usages:
        if usage.period_start_date.year == year:
            ytd_actual += usage.amount_used
            benefit = benefits_by_id.get(usage.benefit_template_id)
            if benefit and benefit.max_value > 0:
                perceived_max = settings_map.get(benefit.id, benefit.max_value)
                ytd_perceived += usage.amount_used * (perceived_max / benefit.max_value)

            if is_current_year:
                # Check if benefit is used in current period
                period_start, _ = get_current_period(
                    benefit.period_type if benefit else "annual", today
                )
                if usage.period_start_date == period_start and usage.amount_used > 0:
                    benefits_used_ids.add(usage.benefit_template_id)
            else:
                # For past/future years, count any benefit with usage as "used"
                if usage.amount_used > 0:
                    benefits_used_ids.add(usage.benefit_template_id)

    # Prorated max: only count periods that have started
    prorated_max = 0.0
    for benefit in uc.card_template.benefits:
        annual_max = compute_annual_max(benefit.max_value, benefit.period_type)
        if is_past_year:
            # Past year: all periods have elapsed
            prorated_max += annual_max
        elif is_current_year:
            # Current year: count periods that have started
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
        # Future year: prorated_max stays 0

    utilization_pct = (ytd_actual / prorated_max * 100) if prorated_max > 0 else 0.0

    return UserCardSummaryOut(
        id=uc.id,
        card_name=uc.card_template.name,
        issuer=uc.card_template.issuer,
        nickname=uc.nickname,
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
