# backend/app/routers/puzzles.py
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, ConfigDict
from sqlalchemy.orm import Session

from backend.app.modules.puzzles.service import (
    get_next_puzzle,
    get_puzzle_summary,
    submit_puzzle_attempt,
)
from backend.app.modules.shared.db import get_db
from backend.app.routers.auth import get_current_user
from backend.app.utils import to_camel


class CamelModel(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)


router = APIRouter()


class PuzzleNextResponse(CamelModel):
    puzzle_id: str
    fen: str
    rating: int
    themes: str | None = None
    correct_move_uci: str  # used client-side for move validation (matches training/next)
    last_move_uci: str  # opponent's setup move that produced `fen`, for board highlighting


class PuzzleAttemptRequest(CamelModel):
    move_uci: str


class PuzzleAttemptResponse(CamelModel):
    correct: bool
    reason: str
    fen_after: str | None = None


class PuzzleSummaryResponse(CamelModel):
    puzzles_seen: int
    overall_accuracy: float
    mastered: int


@router.get("/puzzles/next", response_model=PuzzleNextResponse)
def get_puzzles_next(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    puzzle = get_next_puzzle(db, current_user.id)
    if puzzle is None:
        raise HTTPException(status_code=404, detail="No puzzles available")

    return PuzzleNextResponse(
        puzzle_id=puzzle.puzzle_id,
        fen=puzzle.fen,
        rating=puzzle.rating,
        themes=puzzle.themes,
        correct_move_uci=puzzle.correct_move_uci,
        last_move_uci=puzzle.setup_move_uci,
    )


@router.post("/puzzles/{puzzle_id}/attempts", response_model=PuzzleAttemptResponse)
def post_puzzle_attempt(
    puzzle_id: str,
    req: PuzzleAttemptRequest,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    result = submit_puzzle_attempt(
        db, user_id=current_user.id, puzzle_id=puzzle_id, move_uci=req.move_uci
    )
    if result is None:
        raise HTTPException(status_code=404, detail="Puzzle not found")
    if result.http_status == 400:
        raise HTTPException(status_code=400, detail=result.error_message)

    return PuzzleAttemptResponse(
        correct=result.correct,
        reason=result.reason,
        fen_after=result.fen_after,
    )


@router.get("/puzzles/summary", response_model=PuzzleSummaryResponse)
def get_puzzles_summary(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    return PuzzleSummaryResponse(**get_puzzle_summary(db, current_user.id))
