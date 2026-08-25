# backend/app/routers/puzzles.py
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, ConfigDict
from sqlalchemy.orm import Session

from backend.app.modules.puzzles.service import (
    get_next_puzzle,
    get_puzzle_summary,
    get_theme_counts,
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
    move_index: int  # 0-based index of this solver move within the puzzle's sequence
    solver_moves_total: int  # total solver moves needed to finish the puzzle


class PuzzleAttemptRequest(CamelModel):
    move_uci: str
    move_index: int = 0


class PuzzleAttemptResponse(CamelModel):
    correct: bool
    reason: str
    fen_after: str | None = None
    puzzle_complete: bool | None = None
    opponent_reply_uci: str | None = None
    next_correct_move_uci: str | None = None


class PuzzleSummaryResponse(CamelModel):
    puzzles_seen: int
    overall_accuracy: float
    mastered: int


class PuzzleThemeCount(CamelModel):
    theme: str
    count: int


@router.get("/puzzles/next", response_model=PuzzleNextResponse)
def get_puzzles_next(
    theme: str | None = Query(None),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    puzzle = get_next_puzzle(db, current_user.id, theme=theme)
    if puzzle is None:
        raise HTTPException(status_code=404, detail="No puzzles available")

    return PuzzleNextResponse(
        puzzle_id=puzzle.puzzle_id,
        fen=puzzle.fen,
        rating=puzzle.rating,
        themes=puzzle.themes,
        correct_move_uci=puzzle.correct_move_uci,
        last_move_uci=puzzle.setup_move_uci,
        move_index=puzzle.move_index,
        solver_moves_total=puzzle.solver_moves_total,
    )


@router.post("/puzzles/{puzzle_id}/attempts", response_model=PuzzleAttemptResponse)
def post_puzzle_attempt(
    puzzle_id: str,
    req: PuzzleAttemptRequest,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    result = submit_puzzle_attempt(
        db,
        user_id=current_user.id,
        puzzle_id=puzzle_id,
        move_uci=req.move_uci,
        move_index=req.move_index,
    )
    if result is None:
        raise HTTPException(status_code=404, detail="Puzzle not found")
    if result.http_status == 400:
        raise HTTPException(status_code=400, detail=result.error_message)

    return PuzzleAttemptResponse(
        correct=result.correct,
        reason=result.reason,
        fen_after=result.fen_after,
        puzzle_complete=result.puzzle_complete,
        opponent_reply_uci=result.opponent_reply_uci,
        next_correct_move_uci=result.next_correct_move_uci,
    )


@router.get("/puzzles/summary", response_model=PuzzleSummaryResponse)
def get_puzzles_summary(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    return PuzzleSummaryResponse(**get_puzzle_summary(db, current_user.id))


@router.get("/puzzles/themes", response_model=list[PuzzleThemeCount])
def get_puzzles_themes(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    return [PuzzleThemeCount(theme=theme, count=count) for theme, count in get_theme_counts(db)]
