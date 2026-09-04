import datetime
from dataclasses import dataclass

import chess
from sqlalchemy import func, select, text
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
    move_index: int
    solver_moves_total: int


def _solver_moves(puzzle: Puzzle) -> list[str]:
    """Every solver-side move in the sequence: moves[1], moves[3], moves[5], ..."""
    moves = puzzle.moves.split()
    if len(moves) < 2:
        raise ValueError(f"Puzzle {puzzle.id} has too few moves to solve")
    return moves[1::2]


def _solve_position(puzzle: Puzzle, move_index: int) -> tuple[str, str, str]:
    """Replay the puzzle up to solver move `move_index` (0-based).

    Returns (fen_to_solve, last_move_uci, correct_move_uci) where last_move_uci is
    whichever move (opponent setup or opponent reply) most recently landed on the
    board, for client-side "last move" highlighting.
    """
    moves = puzzle.moves.split()
    solver_moves = _solver_moves(puzzle)
    if move_index < 0 or move_index >= len(solver_moves):
        raise ValueError(f"Puzzle {puzzle.id} has no solver move at index {move_index}")

    board = chess.Board(puzzle.fen)
    last_move_uci = moves[0]
    board.push(chess.Move.from_uci(moves[0]))
    for uci in moves[1 : 2 * move_index + 1]:
        board.push(chess.Move.from_uci(uci))
        last_move_uci = uci

    return board.fen(), last_move_uci, solver_moves[move_index]


def get_next_puzzle(
    db: Session, user_id: int, theme: str | None = None, exclude_id: str | None = None
) -> PuzzlePosition | None:
    """Pick a due review puzzle first, otherwise an unseen one (highest popularity).

    When `theme` is given, switch to free-practice mode: ignore due-dates and
    just pick a random puzzle carrying that theme tag. Attempts still flow
    through the normal SRS/progress bookkeeping.

    `exclude_id` skips a specific puzzle (the one just shown), so that
    "skip"/"next" can't hand back the same due puzzle it was just given.
    """
    if theme is not None:
        solved_ids = select(PuzzleProgress.puzzle_id).where(
            PuzzleProgress.user_id == user_id, PuzzleProgress.correct_count > 0
        )
        query = (
            select(Puzzle)
            .where(text("string_to_array(themes, ' ') @> ARRAY[:theme]"))
            .params(theme=theme)
            .where(Puzzle.id.not_in(solved_ids))
        )
        if exclude_id is not None:
            query = query.where(Puzzle.id != exclude_id)
        puzzle = db.execute(query.order_by(func.random()).limit(1)).scalar_one_or_none()

        if puzzle is None:
            return None

        return _build_puzzle_position(puzzle)

    now = datetime.datetime.now(datetime.timezone.utc)

    due_query = (
        select(Puzzle)
        .join(PuzzleProgress, PuzzleProgress.puzzle_id == Puzzle.id)
        .where(PuzzleProgress.user_id == user_id, PuzzleProgress.due_at <= now)
    )
    if exclude_id is not None:
        due_query = due_query.where(Puzzle.id != exclude_id)
    due = db.execute(due_query.order_by(PuzzleProgress.due_at.asc()).limit(1)).scalar_one_or_none()

    puzzle = due
    if puzzle is None:
        seen_ids = select(PuzzleProgress.puzzle_id).where(PuzzleProgress.user_id == user_id)
        unseen_query = select(Puzzle).where(Puzzle.id.not_in(seen_ids))
        if exclude_id is not None:
            unseen_query = unseen_query.where(Puzzle.id != exclude_id)
        puzzle = db.execute(
            unseen_query.order_by(Puzzle.popularity.desc(), func.random()).limit(1)
        ).scalar_one_or_none()

    if puzzle is None:
        return None

    return _build_puzzle_position(puzzle)


def _build_puzzle_position(puzzle: Puzzle) -> PuzzlePosition:
    solver_moves = _solver_moves(puzzle)
    fen, setup_move_uci, correct_move_uci = _solve_position(puzzle, move_index=0)
    return PuzzlePosition(
        puzzle_id=puzzle.id,
        fen=fen,
        correct_move_uci=correct_move_uci,
        setup_move_uci=setup_move_uci,
        rating=puzzle.rating,
        themes=puzzle.themes,
        move_index=0,
        solver_moves_total=len(solver_moves),
    )


def submit_puzzle_attempt(
    db: Session, user_id: int, puzzle_id: str, move_uci: str, move_index: int
):
    puzzle = db.get(Puzzle, puzzle_id)
    if puzzle is None:
        return None

    solver_moves = _solver_moves(puzzle)
    fen, _last_move_uci, correct_move_uci = _solve_position(puzzle, move_index=move_index)
    result = validate_and_apply(fen=fen, move_uci=move_uci, expected_correct_uci=correct_move_uci)

    is_final_move = move_index == len(solver_moves) - 1
    puzzle_complete = result.correct and is_final_move
    result.puzzle_complete = puzzle_complete

    if result.correct and not is_final_move:
        # Auto-play the opponent's reply and hand back the resulting position;
        # SRS/attempt bookkeeping only happens once the sequence is finished
        # (either the puzzle is fully solved or the solver gets a move wrong).
        moves = puzzle.moves.split()
        opponent_reply_uci = moves[2 * move_index + 2]
        board = chess.Board(result.fen_after)
        board.push(chess.Move.from_uci(opponent_reply_uci))
        result.fen_after = board.fen()
        result.opponent_reply_uci = opponent_reply_uci
        result.next_correct_move_uci = solver_moves[move_index + 1]
        return result

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


def get_theme_counts(db: Session) -> list[tuple[str, int]]:
    """Distinct theme tags across all puzzles, with counts, sorted by count desc."""
    query = text("""
        SELECT theme, COUNT(*) AS count
        FROM (SELECT unnest(string_to_array(themes, ' ')) AS theme FROM puzzles) t
        GROUP BY theme
        ORDER BY count DESC
        """)
    rows = db.execute(query).all()
    return [(row.theme, row.count) for row in rows]


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
