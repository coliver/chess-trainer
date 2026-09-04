import datetime

import pytest
from sqlalchemy import delete

from backend.app.modules.puzzles import service
from backend.app.modules.puzzles.models import Puzzle, PuzzleProgress


@pytest.fixture(autouse=True)
def _empty_puzzles_table(db):
    # The dev DB carries a real seeded puzzle dataset (thousands of rows) that
    # the `db` fixture's transaction rollback doesn't hide, since it was
    # committed outside any test. Clear it here so selection/count
    # assertions are deterministic; this runs inside the same rolled-back
    # transaction, so nothing here persists past the test.
    db.execute(delete(Puzzle))
    db.commit()


def make_puzzle(db, id="p1", rating=1200, popularity=90, moves="e2e4 e7e5", themes="opening"):
    # moves[0] is the opponent setup move (auto-played to reach the puzzle
    # position); moves[1], moves[3], ... are the solver moves; moves[2],
    # moves[4], ... are the opponent's auto-played replies in between.
    puzzle = Puzzle(
        id=id,
        fen="rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
        moves=moves,
        rating=rating,
        popularity=popularity,
        nb_plays=100,
        themes=themes,
    )
    db.add(puzzle)
    db.commit()
    return puzzle


def make_2_solver_move_puzzle(db, id="p1"):
    # 4-ply sequence from the start position: e2e4 (opponent setup), e7e5
    # (solver move 1), g1f3 (opponent auto-played reply), b8c6 (solver move 2).
    # Every move is a genuine legal move at each step (verified against
    # python-chess); it doesn't need to be an actual checkmate, since the
    # solving logic only cares about position in the sequence, not game end.
    return make_puzzle(db, id=id, moves="e2e4 e7e5 g1f3 b8c6", themes="mateIn2")


def test_get_next_puzzle_returns_unseen_puzzle(db, test_user):
    make_puzzle(db)

    result = service.get_next_puzzle(db, test_user.id)

    assert result is not None
    assert result.puzzle_id == "p1"
    assert result.correct_move_uci == "e7e5"
    assert result.move_index == 0
    assert result.solver_moves_total == 1


def test_get_next_puzzle_reports_solver_moves_total_for_multimove_puzzle(db, test_user):
    make_2_solver_move_puzzle(db)

    result = service.get_next_puzzle(db, test_user.id)

    assert result.solver_moves_total == 2
    assert result.move_index == 0
    assert result.correct_move_uci == "e7e5"


def test_get_next_puzzle_none_when_no_puzzles(db, test_user):
    result = service.get_next_puzzle(db, test_user.id)
    assert result is None


def test_submit_puzzle_attempt_correct_updates_progress_and_streak(db, test_user):
    make_puzzle(db)

    result = service.submit_puzzle_attempt(
        db, user_id=test_user.id, puzzle_id="p1", move_uci="e7e5", move_index=0
    )

    assert result.correct is True
    assert result.puzzle_complete is True

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
        db, user_id=test_user.id, puzzle_id="p1", move_uci="e7e6", move_index=0
    )

    assert result.correct is False
    assert result.puzzle_complete is False


def test_submit_puzzle_attempt_records_hint_used_column_exists(db, test_user):
    make_puzzle(db)

    service.submit_puzzle_attempt(
        db, user_id=test_user.id, puzzle_id="p1", move_uci="e7e5", move_index=0
    )

    row = (
        db.query(PuzzleProgress)
        .filter(PuzzleProgress.user_id == test_user.id, PuzzleProgress.puzzle_id == "p1")
        .first()
    )
    assert row.hint_used is False


def test_submit_puzzle_attempt_used_hint_true_sets_hint_used(db, test_user):
    make_puzzle(db)

    service.submit_puzzle_attempt(
        db, user_id=test_user.id, puzzle_id="p1", move_uci="e7e5", move_index=0, used_hint=True
    )

    row = (
        db.query(PuzzleProgress)
        .filter(PuzzleProgress.user_id == test_user.id, PuzzleProgress.puzzle_id == "p1")
        .first()
    )
    assert row.hint_used is True


def test_submit_puzzle_attempt_hint_used_is_sticky_across_later_attempts(db, test_user):
    make_puzzle(db)

    service.submit_puzzle_attempt(
        db, user_id=test_user.id, puzzle_id="p1", move_uci="e7e6", move_index=0, used_hint=True
    )
    service.submit_puzzle_attempt(
        db, user_id=test_user.id, puzzle_id="p1", move_uci="e7e5", move_index=0, used_hint=False
    )

    row = (
        db.query(PuzzleProgress)
        .filter(PuzzleProgress.user_id == test_user.id, PuzzleProgress.puzzle_id == "p1")
        .first()
    )
    assert row.hint_used is True


def test_submit_puzzle_attempt_no_hint_leaves_hint_used_false(db, test_user):
    make_puzzle(db)

    service.submit_puzzle_attempt(
        db, user_id=test_user.id, puzzle_id="p1", move_uci="e7e5", move_index=0
    )

    row = (
        db.query(PuzzleProgress)
        .filter(PuzzleProgress.user_id == test_user.id, PuzzleProgress.puzzle_id == "p1")
        .first()
    )
    assert row.hint_used is False


def test_submit_puzzle_attempt_unknown_puzzle_returns_none(db, test_user):
    result = service.submit_puzzle_attempt(
        db, user_id=test_user.id, puzzle_id="does-not-exist", move_uci="e7e5", move_index=0
    )
    assert result is None


def test_submit_puzzle_attempt_first_of_two_moves_not_complete_and_no_srs_update(db, test_user):
    make_2_solver_move_puzzle(db)

    result = service.submit_puzzle_attempt(
        db, user_id=test_user.id, puzzle_id="p1", move_uci="e7e5", move_index=0
    )

    assert result.correct is True
    assert result.puzzle_complete is False
    assert result.opponent_reply_uci == "g1f3"
    assert result.next_correct_move_uci == "b8c6"

    # SRS/attempt bookkeeping must not fire until the puzzle is actually finished.
    row = (
        db.query(PuzzleProgress)
        .filter(PuzzleProgress.user_id == test_user.id, PuzzleProgress.puzzle_id == "p1")
        .first()
    )
    assert row is None


def test_submit_puzzle_attempt_second_of_two_moves_completes_and_updates_srs_once(db, test_user):
    make_2_solver_move_puzzle(db)

    service.submit_puzzle_attempt(
        db, user_id=test_user.id, puzzle_id="p1", move_uci="e7e5", move_index=0
    )
    result = service.submit_puzzle_attempt(
        db, user_id=test_user.id, puzzle_id="p1", move_uci="b8c6", move_index=1
    )

    assert result.correct is True
    assert result.puzzle_complete is True

    row = (
        db.query(PuzzleProgress)
        .filter(PuzzleProgress.user_id == test_user.id, PuzzleProgress.puzzle_id == "p1")
        .first()
    )
    # Exactly one attempt recorded for the whole puzzle, not one per solver move.
    assert row.attempts == 1
    assert row.correct_count == 1


def test_submit_puzzle_attempt_wrong_move_mid_sequence_fails_whole_attempt(db, test_user):
    make_2_solver_move_puzzle(db)

    result = service.submit_puzzle_attempt(
        db, user_id=test_user.id, puzzle_id="p1", move_uci="e7e5", move_index=0
    )
    assert result.correct is True

    result = service.submit_puzzle_attempt(
        db, user_id=test_user.id, puzzle_id="p1", move_uci="b8a6", move_index=1
    )

    assert result.correct is False
    assert result.puzzle_complete is False

    row = (
        db.query(PuzzleProgress)
        .filter(PuzzleProgress.user_id == test_user.id, PuzzleProgress.puzzle_id == "p1")
        .first()
    )
    assert row.attempts == 1
    assert row.incorrect_count == 1
    assert row.correct_count == 0


def test_get_next_puzzle_prefers_due_review_over_unseen(db, test_user):
    make_puzzle(db, id="p1")
    make_puzzle(db, id="p2")

    service.submit_puzzle_attempt(
        db, user_id=test_user.id, puzzle_id="p1", move_uci="e7e5", move_index=0
    )
    row = (
        db.query(PuzzleProgress)
        .filter(PuzzleProgress.user_id == test_user.id, PuzzleProgress.puzzle_id == "p1")
        .first()
    )
    row.due_at = datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(days=1)
    db.commit()

    result = service.get_next_puzzle(db, test_user.id)
    assert result.puzzle_id == "p1"


def test_get_next_puzzle_exclude_id_skips_the_only_due_puzzle(db, test_user):
    make_puzzle(db, id="p1")

    service.submit_puzzle_attempt(
        db, user_id=test_user.id, puzzle_id="p1", move_uci="e7e5", move_index=0
    )
    row = (
        db.query(PuzzleProgress)
        .filter(PuzzleProgress.user_id == test_user.id, PuzzleProgress.puzzle_id == "p1")
        .first()
    )
    row.due_at = datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(days=1)
    db.commit()

    # Without exclusion, skip would keep handing back the same due puzzle.
    result = service.get_next_puzzle(db, test_user.id, exclude_id="p1")
    assert result is None


def test_get_next_puzzle_exclude_id_falls_back_to_next_due_puzzle(db, test_user):
    make_puzzle(db, id="p1")
    make_puzzle(db, id="p2")

    for pid in ("p1", "p2"):
        service.submit_puzzle_attempt(
            db, user_id=test_user.id, puzzle_id=pid, move_uci="e7e5", move_index=0
        )
    now = datetime.datetime.now(datetime.timezone.utc)
    for pid, offset in (("p1", 2), ("p2", 1)):
        row = (
            db.query(PuzzleProgress)
            .filter(PuzzleProgress.user_id == test_user.id, PuzzleProgress.puzzle_id == pid)
            .first()
        )
        row.due_at = now - datetime.timedelta(days=offset)
    db.commit()

    result = service.get_next_puzzle(db, test_user.id, exclude_id="p1")
    assert result.puzzle_id == "p2"


def test_get_next_puzzle_exclude_id_skips_the_only_unseen_puzzle(db, test_user):
    make_puzzle(db, id="p1")

    result = service.get_next_puzzle(db, test_user.id, exclude_id="p1")
    assert result is None


def test_get_next_puzzle_with_theme_exclude_id_skips_the_only_match(db, test_user):
    make_puzzle(db, id="p1", themes="fork")

    result = service.get_next_puzzle(db, test_user.id, theme="fork", exclude_id="p1")
    assert result is None


def test_get_puzzle_summary_no_puzzles_is_all_zero(db, test_user):
    summary = service.get_puzzle_summary(db, test_user.id)
    assert summary == {"puzzles_seen": 0, "overall_accuracy": 0.0, "mastered": 0}


def test_get_puzzle_summary_aggregates_across_puzzles(db, test_user):
    make_puzzle(db, id="p1")
    make_puzzle(db, id="p2")

    service.submit_puzzle_attempt(
        db, user_id=test_user.id, puzzle_id="p1", move_uci="e7e5", move_index=0
    )
    service.submit_puzzle_attempt(
        db, user_id=test_user.id, puzzle_id="p2", move_uci="e7e6", move_index=0
    )

    summary = service.get_puzzle_summary(db, test_user.id)

    assert summary["puzzles_seen"] == 2
    assert summary["overall_accuracy"] == 0.5
    assert summary["mastered"] == 0


def test_get_next_puzzle_with_theme_filters_by_exact_token(db, test_user):
    make_puzzle(db, id="p1", themes="fork middlegame")
    make_puzzle(db, id="p2", themes="mateIn2 endgame")

    result = service.get_next_puzzle(db, test_user.id, theme="fork")

    assert result is not None
    assert result.puzzle_id == "p1"


def test_get_next_puzzle_with_theme_does_not_substring_match(db, test_user):
    # "mate" must not match "mateIn2" — themes are matched as exact tokens.
    make_puzzle(db, id="p1", themes="mateIn2 endgame")

    result = service.get_next_puzzle(db, test_user.id, theme="mate")

    assert result is None


def test_get_next_puzzle_with_theme_excludes_solved_puzzles(db, test_user):
    make_puzzle(db, id="p1", themes="fork")
    make_puzzle(db, id="p2", themes="fork")

    service.submit_puzzle_attempt(
        db, user_id=test_user.id, puzzle_id="p1", move_uci="e7e5", move_index=0
    )

    result = service.get_next_puzzle(db, test_user.id, theme="fork")
    assert result is not None
    assert result.puzzle_id == "p2"


def test_get_next_puzzle_with_theme_still_returns_skipped_but_unsolved_puzzle(db, test_user):
    make_puzzle(db, id="p1", themes="fork")

    # A wrong (unsolved) attempt must not exclude the puzzle from theme mode.
    service.submit_puzzle_attempt(
        db, user_id=test_user.id, puzzle_id="p1", move_uci="e7e6", move_index=0
    )

    result = service.get_next_puzzle(db, test_user.id, theme="fork")
    assert result is not None
    assert result.puzzle_id == "p1"


def test_get_next_puzzle_with_theme_none_when_all_matches_solved(db, test_user):
    make_puzzle(db, id="p1", themes="fork")

    service.submit_puzzle_attempt(
        db, user_id=test_user.id, puzzle_id="p1", move_uci="e7e5", move_index=0
    )

    result = service.get_next_puzzle(db, test_user.id, theme="fork")
    assert result is None


def test_get_next_puzzle_with_theme_ignores_due_dates_for_unsolved_puzzles(db, test_user):
    make_puzzle(db, id="p1", themes="fork")

    # A due_at in the future must not block an unsolved puzzle from theme mode.
    row = PuzzleProgress(
        user_id=test_user.id,
        puzzle_id="p1",
        attempts=1,
        correct_count=0,
        incorrect_count=1,
        due_at=datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(days=5),
    )
    db.add(row)
    db.commit()

    result = service.get_next_puzzle(db, test_user.id, theme="fork")
    assert result is not None
    assert result.puzzle_id == "p1"


def test_get_next_puzzle_with_theme_none_when_no_match(db, test_user):
    make_puzzle(db, id="p1", themes="fork")

    result = service.get_next_puzzle(db, test_user.id, theme="skewer")
    assert result is None


def test_get_theme_counts_aggregates_across_puzzles(db, test_user):
    make_puzzle(db, id="p1", themes="fork middlegame")
    make_puzzle(db, id="p2", themes="fork endgame")

    counts = dict(service.get_theme_counts(db))

    assert counts["fork"] == 2
    assert counts["middlegame"] == 1
    assert counts["endgame"] == 1


def test_get_puzzle_summary_counts_mastered_puzzles(db, test_user):
    make_puzzle(db, id="p1")

    row = PuzzleProgress(
        user_id=test_user.id,
        puzzle_id="p1",
        attempts=3,
        correct_count=3,
        incorrect_count=0,
        repetitions=2,
    )
    db.add(row)
    db.commit()

    summary = service.get_puzzle_summary(db, test_user.id)
    assert summary["mastered"] == 1
