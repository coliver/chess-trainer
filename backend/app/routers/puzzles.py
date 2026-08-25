# backend/app/routers/puzzles.py
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import PlainTextResponse
from pydantic import BaseModel, ConfigDict
from sqlalchemy.orm import Session

from backend.app.modules.puzzles.service import (
    get_next_puzzle,
    get_puzzle_summary,
    get_theme_counts,
    submit_puzzle_attempt,
)
from backend.app.modules.puzzles.text_rendering import render_puzzle_attempt, render_puzzle_next
from backend.app.modules.shared.ansi import FG_GOLD, sgr
from backend.app.modules.shared.db import get_db
from backend.app.modules.shared.text_mode import LOGIN_INSTRUCTIONS, text_response
from backend.app.routers.auth import get_current_user, get_current_user_or_none
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


@router.get("/puzzles/next.text", response_class=PlainTextResponse)
def get_puzzles_next_text(
    theme: str | None = Query(None),
    ansi: bool = Query(True),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user_or_none),
):
    if current_user is None:
        return text_response(LOGIN_INSTRUCTIONS, ansi, status_code=401)
    puzzle = get_next_puzzle(db, current_user.id, theme=theme)
    if puzzle is None:
        raise HTTPException(status_code=404, detail="No puzzles available")
    return text_response(render_puzzle_next(puzzle, ansi) + "\n", ansi)


@router.post("/puzzles/{puzzle_id}/attempts.text", response_class=PlainTextResponse)
def post_puzzle_attempt_text(
    puzzle_id: str,
    move_uci: str = Query(..., alias="moveUci"),
    move_index: int = Query(0, alias="moveIndex"),
    ansi: bool = Query(True),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user_or_none),
):
    if current_user is None:
        return text_response(LOGIN_INSTRUCTIONS, ansi, status_code=401)
    result = submit_puzzle_attempt(
        db,
        user_id=current_user.id,
        puzzle_id=puzzle_id,
        move_uci=move_uci,
        move_index=move_index,
    )
    if result is None:
        raise HTTPException(status_code=404, detail="Puzzle not found")
    if result.http_status == 400:
        raise HTTPException(status_code=400, detail=result.error_message)
    return text_response(render_puzzle_attempt(result, ansi) + "\n", ansi)


@router.get("/puzzles/summary", response_model=PuzzleSummaryResponse)
def get_puzzles_summary(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    return PuzzleSummaryResponse(**get_puzzle_summary(db, current_user.id))


def render_puzzle_summary(summary: dict) -> str:
    lines = [
        sgr("Puzzles", FG_GOLD),
        f"  puzzles seen:     {summary['puzzles_seen']}",
        f"  overall accuracy: {summary['overall_accuracy']:.0%}",
        f"  mastered:         {summary['mastered']}",
    ]
    return "\n".join(lines)


@router.get("/puzzles/summary.text", response_class=PlainTextResponse)
def get_puzzles_summary_text(
    ansi: bool = Query(True),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user_or_none),
):
    if current_user is None:
        return text_response(LOGIN_INSTRUCTIONS, ansi, status_code=401)
    summary = get_puzzle_summary(db, current_user.id)
    return text_response(render_puzzle_summary(summary) + "\n", ansi)


@router.get("/puzzles/themes", response_model=list[PuzzleThemeCount])
def get_puzzles_themes(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    return [PuzzleThemeCount(theme=theme, count=count) for theme, count in get_theme_counts(db)]


def render_puzzle_themes(counts: list[tuple[str, int]]) -> str:
    lines = [sgr("Puzzle themes", FG_GOLD), ""]
    lines += [f"  {theme:<20} {count}" for theme, count in counts]
    lines.append("")
    lines.append("Pick one with GET /puzzles/next.text?theme=<name>")
    return "\n".join(lines)


@router.get("/puzzles/themes.text", response_class=PlainTextResponse)
def get_puzzles_themes_text(
    ansi: bool = Query(True),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user_or_none),
):
    if current_user is None:
        return text_response(LOGIN_INSTRUCTIONS, ansi, status_code=401)
    counts = get_theme_counts(db)
    return text_response(render_puzzle_themes(counts) + "\n", ansi)
