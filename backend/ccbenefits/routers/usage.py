from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload

from ..database import get_db
from ..models import BenefitUsage
from ..schemas import BenefitUsageOut, BenefitUsageUpdate
from ..utils import coerce_binary_amount

router = APIRouter(prefix="/api/usage", tags=["usage"])


@router.put("/{usage_id}", response_model=BenefitUsageOut)
def update_usage(usage_id: int, data: BenefitUsageUpdate, db: Session = Depends(get_db)):
    usage = (
        db.query(BenefitUsage)
        .options(joinedload(BenefitUsage.benefit_template))
        .filter(BenefitUsage.id == usage_id)
        .first()
    )
    if not usage:
        raise HTTPException(status_code=404, detail="Usage record not found")

    benefit = usage.benefit_template
    if not benefit:
        raise HTTPException(status_code=404, detail="Benefit template not found")

    if data.amount_used is not None:
        amount = coerce_binary_amount(data.amount_used, benefit)
        if amount > benefit.max_value:
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
        benefit_name=benefit.name,
        period_start_date=usage.period_start_date,
        period_end_date=usage.period_end_date,
        amount_used=usage.amount_used,
        notes=usage.notes,
        created_at=usage.created_at,
    )


@router.delete("/{usage_id}", status_code=204)
def delete_usage(usage_id: int, db: Session = Depends(get_db)):
    usage = db.query(BenefitUsage).filter(BenefitUsage.id == usage_id).first()
    if not usage:
        raise HTTPException(status_code=404, detail="Usage record not found")
    db.delete(usage)
    db.commit()
