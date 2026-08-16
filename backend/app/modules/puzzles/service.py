import datetime
from dataclasses import dataclass

import chess
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from backend.app.modules.progress.service import record_streak
from backend.app.modules.progress.srs import SrsState, next_state, quality_from_correctness
from backend.app.modules.puzzles.models import Puzzle, PuzzleProgress
from backend.app.modules.training.chess_rules import validate_and_apply


@dataclass
class PuzzlePosition:
    puzzle_id: str
    fen: str
    correct_move_uci: str
    setup_move_uci: str
    rating: int
    themes: str | None


def _solve_position(puzzle: Puzzle) -> tuple[str, str, str]:
    """Apply the opponent's setup move and return (fen_to_solve, setup_move_uci, correct_move_uci)."""
    moves = puzzle.moves.split()
    if len(moves) < 2:
        raise ValueError(f"Puzzle {puzzle.id} has too few moves to solve")

    board = chess.Board(puzzle.fen)
    board.push(chess.Move.from_uci(moves[0]))
    return board.fen(), moves[0], moves[1]


def get_next_puzzle(db: Session, user_id: int) -> PuzzlePosition | None:
    """Pick a due review puzzle first, otherwise an unseen one (highest popularity)."""
    now = datetime.datetime.now(datetime.timezone.utc)

    due = db.execute(
        select(Puzzle)
        .join(PuzzleProgress, PuzzleProgress.puzzle_id == Puzzle.id)
        .where(PuzzleProgress.user_id == user_id, PuzzleProgress.due_at <= now)
        .order_by(PuzzleProgress.due_at.asc())
        .limit(1)
    ).scalar_one_or_none()

    puzzle = due
    if puzzle is None:
        seen_ids = select(PuzzleProgress.puzzle_id).where(PuzzleProgress.user_id == user_id)
        puzzle = db.execute(
            select(Puzzle)
            .where(Puzzle.id.not_in(seen_ids))
            .order_by(Puzzle.popularity.desc(), func.random())
            .limit(1)
        ).scalar_one_or_none()

    if puzzle is None:
        return None

    fen, setup_move_uci, correct_move_uci = _solve_position(puzzle)
    return PuzzlePosition(
        puzzle_id=puzzle.id,
        fen=fen,
        correct_move_uci=correct_move_uci,
        setup_move_uci=setup_move_uci,
        rating=puzzle.rating,
        themes=puzzle.themes,
    )


def submit_puzzle_attempt(db: Session, user_id: int, puzzle_id: str, move_uci: str):
    puzzle = db.get(Puzzle, puzzle_id)
    if puzzle is None:
        return None

    fen, _setup_move_uci, correct_move_uci = _solve_position(puzzle)
    result = validate_and_apply(fen=fen, move_uci=move_uci, expected_correct_uci=correct_move_uci)

    row = db.execute(
        select(PuzzleProgress).where(
            PuzzleProgress.user_id == user_id, PuzzleProgress.puzzle_id == puzzle_id
        )
    ).scalar_one_or_none()

    now = datetime.datetime.now(datetime.timezone.utc)
    if row is None:
        row = PuzzleProgress(
            user_id=user_id,
            puzzle_id=puzzle_id,
            attempts=0,
            correct_count=0,
            incorrect_count=0,
            ease_factor=2.5,
            interval_days=0,
            repetitions=0,
        )
        db.add(row)

    row.attempts += 1
    if result.correct:
        row.correct_count += 1
    else:
        row.incorrect_count += 1

    quality = quality_from_correctness(result.correct)
    srs_result = next_state(
        quality,
        SrsState(
            ease_factor=row.ease_factor,
            interval_days=row.interval_days,
            repetitions=row.repetitions,
        ),
        now=now,
    )
    row.ease_factor = srs_result.ease_factor
    row.interval_days = srs_result.interval_days
    row.repetitions = srs_result.repetitions
    row.due_at = srs_result.due_at
    row.last_seen_at = now

    db.flush()
    record_streak(db, user_id=user_id, today=now.date())
    db.commit()

    return result


def get_puzzle_summary(db: Session, user_id: int) -> dict:
    rows = list(db.scalars(select(PuzzleProgress).where(PuzzleProgress.user_id == user_id)).all())

    puzzles_seen = len(rows)
    total_attempts = sum(r.attempts for r in rows)
    total_correct = sum(r.correct_count for r in rows)
    overall_accuracy = (total_correct / total_attempts) if total_attempts else 0.0
    mastered = sum(1 for r in rows if r.repetitions >= 2)

    return {
        "puzzles_seen": puzzles_seen,
        "overall_accuracy": overall_accuracy,
        "mastered": mastered,
    }
