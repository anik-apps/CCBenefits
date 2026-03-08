from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload

from ..database import get_db
from ..models import CardTemplate
from ..schemas import CardTemplateListItem, CardTemplateOut
from ..utils import compute_annual_max

router = APIRouter(prefix="/api/card-templates", tags=["card-templates"])


@router.get("/", response_model=list[CardTemplateListItem])
def list_card_templates(db: Session = Depends(get_db)):
    cards = db.query(CardTemplate).options(joinedload(CardTemplate.benefits)).all()
    result = []
    for card in cards:
        total = sum(
            compute_annual_max(b.max_value, b.period_type) for b in card.benefits
        )
        result.append(
            CardTemplateListItem(
                id=card.id,
                name=card.name,
                issuer=card.issuer,
                annual_fee=card.annual_fee,
                image_url=card.image_url,
                benefit_count=len(card.benefits),
                total_annual_value=round(total, 2),
            )
        )
    return result


@router.get("/{card_template_id}", response_model=CardTemplateOut)
def get_card_template(card_template_id: int, db: Session = Depends(get_db)):
    card = (
        db.query(CardTemplate)
        .options(joinedload(CardTemplate.benefits))
        .filter(CardTemplate.id == card_template_id)
        .first()
    )
    if not card:
        raise HTTPException(status_code=404, detail="Card template not found")

    total = sum(
        compute_annual_max(b.max_value, b.period_type) for b in card.benefits
    )
    return CardTemplateOut(
        id=card.id,
        name=card.name,
        issuer=card.issuer,
        annual_fee=card.annual_fee,
        image_url=card.image_url,
        benefits=[b for b in card.benefits],
        total_annual_value=round(total, 2),
    )
