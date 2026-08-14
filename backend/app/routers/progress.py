# /backend/app/routers/progress.py
from fastapi import APIRouter, Depends
from pydantic import BaseModel, ConfigDict
from sqlalchemy.orm import Session

from backend.app.modules.progress.service import get_due, get_summary, get_weak_spots
from backend.app.modules.shared.db import get_db
from backend.app.routers.auth import get_current_user
from backend.app.utils import to_camel


class CamelModel(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)


router = APIRouter()


class OpeningBreakdown(CamelModel):
    opening_name: str
    attempts: int
    accuracy: float


class ProgressSummaryResponse(CamelModel):
    positions_seen: int
    overall_accuracy: float
    mastered: int
    opening_breakdown: list[OpeningBreakdown]
    current_streak: int
    longest_streak: int


class DuePositionResponse(CamelModel):
    fen: str
    correct_move_uci: str
    opening_eco: str | None = None
    opening_name: str | None = None
    due_at: str | None = None


class WeakSpotResponse(CamelModel):
    fen: str | None = None
    correct_move_uci: str | None = None
    opening_eco: str | None = None
    opening_name: str | None = None
    attempts: int
    correct_count: int
    incorrect_count: int


@router.get("/progress/summary", response_model=ProgressSummaryResponse)
def get_progress_summary(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    return get_summary(db, current_user.id)


@router.get("/progress/due", response_model=list[DuePositionResponse])
def get_progress_due(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    rows = get_due(db, current_user.id)
    return [
        DuePositionResponse(
            fen=r.fen,
            correct_move_uci=r.correct_move_uci,
            opening_eco=r.opening_eco,
            opening_name=r.opening_name,
            due_at=r.due_at.isoformat() if r.due_at else None,
        )
        for r in rows
    ]


@router.get("/progress/weak-spots", response_model=list[WeakSpotResponse])
def get_progress_weak_spots(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    rows = get_weak_spots(db, current_user.id)
    return [
        WeakSpotResponse(
            fen=r.fen,
            correct_move_uci=r.correct_move_uci,
            opening_eco=r.opening_eco,
            opening_name=r.opening_name,
            attempts=r.attempts,
            correct_count=r.correct_count,
            incorrect_count=r.incorrect_count,
        )
        for r in rows
    ]
