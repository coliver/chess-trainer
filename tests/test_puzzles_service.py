import datetime

from backend.app.modules.puzzles import service
from backend.app.modules.puzzles.models import Puzzle, PuzzleProgress


def make_puzzle(db, id="p1", rating=1200, popularity=90):
    # moves[0] is the opponent setup move (auto-played to reach the puzzle
    # position), moves[1] is the move the solver must find.
    puzzle = Puzzle(
        id=id,
        fen="rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
        moves="e2e4 e7e5",
        rating=rating,
        popularity=popularity,
        nb_plays=100,
        themes="opening",
    )
    db.add(puzzle)
    db.commit()
    return puzzle


def test_get_next_puzzle_returns_unseen_puzzle(db, test_user):
    make_puzzle(db)

    result = service.get_next_puzzle(db, test_user.id)

    assert result is not None
    assert result.puzzle_id == "p1"
    assert result.correct_move_uci == "e7e5"


def test_get_next_puzzle_none_when_no_puzzles(db, test_user):
    result = service.get_next_puzzle(db, test_user.id)
    assert result is None


def test_submit_puzzle_attempt_correct_updates_progress_and_streak(db, test_user):
    make_puzzle(db)

    result = service.submit_puzzle_attempt(
        db, user_id=test_user.id, puzzle_id="p1", move_uci="e7e5"
    )

    assert result.correct is True

    row = (
        db.query(PuzzleProgress)
        .filter(PuzzleProgress.user_id == test_user.id, PuzzleProgress.puzzle_id == "p1")
        .first()
    )
    assert row.attempts == 1
    assert row.correct_count == 1
    assert row.due_at > datetime.datetime.now(datetime.timezone.utc)

    from backend.app.modules.progress.service import get_streak

    streak = get_streak(db, test_user.id)
    assert streak.current_streak == 1


def test_submit_puzzle_attempt_wrong_move(db, test_user):
    make_puzzle(db)

    result = service.submit_puzzle_attempt(
        db, user_id=test_user.id, puzzle_id="p1", move_uci="e7e6"
    )

    assert result.correct is False


def test_submit_puzzle_attempt_unknown_puzzle_returns_none(db, test_user):
    result = service.submit_puzzle_attempt(
        db, user_id=test_user.id, puzzle_id="does-not-exist", move_uci="e7e5"
    )
    assert result is None


def test_get_next_puzzle_prefers_due_review_over_unseen(db, test_user):
    make_puzzle(db, id="p1")
    make_puzzle(db, id="p2")

    service.submit_puzzle_attempt(db, user_id=test_user.id, puzzle_id="p1", move_uci="e7e5")
    row = (
        db.query(PuzzleProgress)
        .filter(PuzzleProgress.user_id == test_user.id, PuzzleProgress.puzzle_id == "p1")
        .first()
    )
    row.due_at = datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(days=1)
    db.commit()

    result = service.get_next_puzzle(db, test_user.id)
    assert result.puzzle_id == "p1"
