# /backend/app/routers/progress.py
from fastapi import APIRouter, Depends
from fastapi.responses import PlainTextResponse
from pydantic import BaseModel, ConfigDict
from sqlalchemy.orm import Session

from backend.app.modules.progress.service import (
    get_due,
    get_global_step_accuracy,
    get_step_accuracy,
    get_summary,
    get_weak_spots,
)
from backend.app.modules.shared.db import get_db
from backend.app.modules.shared.text_auth import LOGIN_INSTRUCTIONS
from backend.app.routers.auth import get_current_user, get_current_user_or_none
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


def render_progress_summary(summary: dict) -> str:
    lines = [
        "Progress",
        f"  positions seen:   {summary['positions_seen']}",
        f"  overall accuracy: {summary['overall_accuracy']:.0%}",
        f"  mastered:         {summary['mastered']}",
        f"  current streak:   {summary['current_streak']}",
        f"  longest streak:   {summary['longest_streak']}",
    ]
    return "\n".join(lines)


@router.get("/progress/summary.text", response_class=PlainTextResponse)
def get_progress_summary_text(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user_or_none),
):
    if current_user is None:
        return PlainTextResponse(LOGIN_INSTRUCTIONS, status_code=401)
    summary = get_summary(db, current_user.id)
    return render_progress_summary(summary)


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


class WrongMoveCountResponse(CamelModel):
    move_uci: str
    count: int


class StepAccuracyResponse(CamelModel):
    opening_eco: str | None = None
    opening_name: str | None = None
    order_index: int
    correct_move_uci: str
    attempts: int
    correct_count: int
    incorrect_count: int
    accuracy: float
    common_wrong_moves: list[WrongMoveCountResponse]


def _to_step_accuracy_response(rows) -> list[StepAccuracyResponse]:
    return [
        StepAccuracyResponse(
            opening_eco=r.opening_eco,
            opening_name=r.opening_name,
            order_index=r.order_index,
            correct_move_uci=r.correct_move_uci,
            attempts=r.attempts,
            correct_count=r.correct_count,
            incorrect_count=r.incorrect_count,
            accuracy=r.accuracy,
            common_wrong_moves=[
                WrongMoveCountResponse(move_uci=w.move_uci, count=w.count)
                for w in r.common_wrong_moves
            ],
        )
        for r in rows
    ]


@router.get("/progress/step-accuracy", response_model=list[StepAccuracyResponse])
def get_progress_step_accuracy(
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Where in each opening's move sequence this user fails, ranked worst
    accuracy first (e.g. order_index=1 means the 2nd move of the line)."""
    rows = get_step_accuracy(db, current_user.id, limit=limit)
    return _to_step_accuracy_response(rows)


@router.get("/progress/step-accuracy/global", response_model=list[StepAccuracyResponse])
def get_progress_step_accuracy_global(
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Same as /progress/step-accuracy but aggregated across all trainees, to
    find which steps are broadly confusing rather than one user's weak spots."""
    rows = get_global_step_accuracy(db, limit=limit)
    return _to_step_accuracy_response(rows)


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
