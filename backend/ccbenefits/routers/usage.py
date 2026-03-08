from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database import get_db
from ..dependencies import get_current_user
from ..models import BenefitTemplate, BenefitUsage, RedemptionType, User
from ..schemas import BenefitUsageOut, BenefitUsageUpdate

router = APIRouter(prefix="/api/usage", tags=["usage"])


def _verify_usage_ownership(usage: BenefitUsage, current_user: User) -> None:
    """Verify the usage record belongs to the current user via UserCard relationship."""
    if not usage.user_card or usage.user_card.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Usage record not found")


@router.put("/{usage_id}", response_model=BenefitUsageOut)
def update_usage(
    usage_id: int,
    data: BenefitUsageUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    usage = db.query(BenefitUsage).filter(BenefitUsage.id == usage_id).first()
    if not usage:
        raise HTTPException(status_code=404, detail="Usage record not found")

    _verify_usage_ownership(usage, current_user)

    benefit = db.query(BenefitTemplate).filter(BenefitTemplate.id == usage.benefit_template_id).first()

    if data.amount_used is not None:
        amount = data.amount_used
        if benefit and benefit.redemption_type == RedemptionType.binary:
            amount = benefit.max_value if amount > 0 else 0.0
        if benefit and amount > benefit.max_value:
            raise HTTPException(
                status_code=400,
                detail=f"Amount {amount} exceeds max value {benefit.max_value}",
            )
        usage.amount_used = amount

    if data.notes is not None:
        usage.notes = data.notes

    db.commit()
    db.refresh(usage)

    return BenefitUsageOut(
        id=usage.id,
        benefit_template_id=usage.benefit_template_id,
        benefit_name=benefit.name if benefit else "Unknown",
        period_start_date=usage.period_start_date,
        period_end_date=usage.period_end_date,
        amount_used=usage.amount_used,
        notes=usage.notes,
        created_at=usage.created_at,
    )


@router.delete("/{usage_id}", status_code=204)
def delete_usage(
    usage_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    usage = db.query(BenefitUsage).filter(BenefitUsage.id == usage_id).first()
    if not usage:
        raise HTTPException(status_code=404, detail="Usage record not found")
    _verify_usage_ownership(usage, current_user)
    db.delete(usage)
    db.commit()
