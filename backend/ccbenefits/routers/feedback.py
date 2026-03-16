from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload

from ..config import ADMIN_EMAILS
from ..database import get_db
from ..dependencies import get_current_user
from ..metrics import feedback_submitted_counter
from ..models import Feedback, User
from ..schemas import FeedbackCreate, FeedbackOut

router = APIRouter(prefix="/api/feedback", tags=["feedback"])


@router.post("/", response_model=FeedbackOut, status_code=201)
def submit_feedback(
    data: FeedbackCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    fb = Feedback(
        user_id=current_user.id,
        category=data.category,
        message=data.message,
    )
    db.add(fb)
    db.commit()
    db.refresh(fb)
    feedback_submitted_counter.add(1, {"category": data.category})

    return FeedbackOut(
        id=fb.id,
        user_email=current_user.email,
        category=fb.category,
        message=fb.message,
        created_at=fb.created_at,
    )


@router.get("/", response_model=list[FeedbackOut])
def list_feedback(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.email.lower() not in ADMIN_EMAILS:
        raise HTTPException(status_code=403, detail="Admin access required")

    feedbacks = (
        db.query(Feedback)
        .options(joinedload(Feedback.user))
        .order_by(Feedback.created_at.desc())
        .offset(skip)
        .limit(min(limit, 500))
        .all()
    )

    return [
        FeedbackOut(
            id=fb.id,
            user_email=fb.user.email,
            category=fb.category,
            message=fb.message,
            created_at=fb.created_at,
        )
        for fb in feedbacks
    ]
