import datetime

import pytest

from backend.app.modules.progress import service


def test_record_attempt_creates_row_and_tracks_counts(db, test_user):
    row = service.record_attempt(
        db,
        user_id=test_user.id,
        fen="fen1",
        correct_move_uci="e2e4",
        is_correct=False,
        opening_eco="C00",
        opening_name="French Defense",
    )
    assert row.attempts == 1
    assert row.correct_count == 0
    assert row.incorrect_count == 1
    assert row.repetitions == 0
    assert row.due_at is not None

    row2 = service.record_attempt(
        db,
        user_id=test_user.id,
        fen="fen1",
        correct_move_uci="e2e4",
        is_correct=True,
        opening_eco="C00",
        opening_name="French Defense",
    )
    assert row2.id == row.id
    assert row2.attempts == 2
    assert row2.correct_count == 1
    assert row2.incorrect_count == 1
    assert row2.repetitions == 1
    assert row2.due_at > datetime.datetime.now(datetime.timezone.utc)


def test_get_summary_aggregates_across_positions(db, test_user):
    service.record_attempt(
        db,
        user_id=test_user.id,
        fen="fen1",
        correct_move_uci="e2e4",
        is_correct=True,
        opening_name="French Defense",
    )
    service.record_attempt(
        db,
        user_id=test_user.id,
        fen="fen2",
        correct_move_uci="d2d4",
        is_correct=False,
        opening_name="Queen's Gambit",
    )

    summary = service.get_summary(db, test_user.id)

    assert summary["positions_seen"] == 2
    assert summary["overall_accuracy"] == 0.5
    assert len(summary["opening_breakdown"]) == 2


def test_get_due_returns_only_due_rows(db, test_user):
    service.record_attempt(
        db, user_id=test_user.id, fen="fen1", correct_move_uci="e2e4", is_correct=True
    )
    due = service.get_due(
        db,
        test_user.id,
        now=datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(days=2),
    )
    assert len(due) == 1

    not_due = service.get_due(db, test_user.id, now=datetime.datetime.now(datetime.timezone.utc))
    assert len(not_due) == 0


def test_get_weak_spots_orders_by_lowest_accuracy(db, test_user):
    service.record_attempt(
        db, user_id=test_user.id, fen="good", correct_move_uci="e2e4", is_correct=True
    )
    service.record_attempt(
        db, user_id=test_user.id, fen="bad", correct_move_uci="d2d4", is_correct=False
    )

    weak = service.get_weak_spots(db, test_user.id)
    assert weak[0].fen == "bad"


def test_get_weak_spots_groups_by_opening_name(db, test_user):
    service.record_attempt(
        db,
        user_id=test_user.id,
        fen="fen1",
        correct_move_uci="e2e4",
        is_correct=False,
        opening_name="French Defense",
    )
    service.record_attempt(
        db,
        user_id=test_user.id,
        fen="fen2",
        correct_move_uci="d2d4",
        is_correct=True,
        opening_name="French Defense",
    )

    weak = service.get_weak_spots(db, test_user.id)
    assert len(weak) == 1
    assert weak[0].opening_name == "French Defense"
    assert weak[0].attempts == 2
    assert weak[0].correct_count == 1
    assert weak[0].incorrect_count == 1
    assert weak[0].fen is None


def test_record_attempt_advances_streak(db, test_user):
    service.record_attempt(
        db, user_id=test_user.id, fen="fen1", correct_move_uci="e2e4", is_correct=True
    )
    streak = service.get_streak(db, test_user.id)
    assert streak.current_streak == 1
    assert streak.longest_streak == 1

    summary = service.get_summary(db, test_user.id)
    assert summary["current_streak"] == 1
    assert summary["longest_streak"] == 1


def test_create_session_from_due_seeds_items_from_due_positions(db, test_user):
    from backend.app.modules.training import service as training_service

    row = service.record_attempt(
        db,
        user_id=test_user.id,
        fen="fen1",
        correct_move_uci="e2e4",
        is_correct=True,
        opening_eco="C00",
        opening_name="French Defense",
    )
    # simulate the review interval having already elapsed
    row.due_at = datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(days=1)
    db.commit()

    session = training_service.create_session_from_due(db, test_user.id)

    assert session.opening_name == "Review"
    items = list(session.items)
    assert len(items) == 1
    assert items[0].fen == "fen1"
    assert items[0].correct_move_uci == "e2e4"


def test_create_session_from_due_404_when_nothing_due(db, test_user):
    import pytest
    from fastapi import HTTPException

    from backend.app.modules.training import service as training_service

    with pytest.raises(HTTPException):
        training_service.create_session_from_due(db, test_user.id)


def _seed_training_response(
    db,
    user_id: int,
    order_index: int,
    correct_move_uci: str,
    submitted_move_uci: str,
    is_correct: bool,
    opening_eco: str | None = "C00",
    opening_name: str | None = "French Defense",
    player_color: str = "w",
    is_review_item: bool = False,
):
    """Seeds one scored TrainingResponse. For a normal (non-review) session
    the opening lives on the TrainingSession, matching real usage
    (create_training_session) - only review-session items carry their own
    opening_eco/opening_name (create_session_from_due)."""
    from backend.app.modules.training.models import TrainingItem, TrainingResponse, TrainingSession

    session = TrainingSession(
        status="active",
        user_id=user_id,
        opening_eco=None if is_review_item else opening_eco,
        opening_name="Review" if is_review_item else opening_name,
        player_color=player_color,
    )
    db.add(session)
    db.flush()

    item = TrainingItem(
        session_id=session.id,
        order_index=order_index,
        fen="rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
        correct_move_uci=correct_move_uci,
        opening_eco=opening_eco if is_review_item else None,
        opening_name=opening_name if is_review_item else None,
    )
    db.add(item)
    db.flush()

    db.add(
        TrainingResponse(
            item_id=item.id,
            submitted_move_uci=submitted_move_uci,
            is_correct=is_correct,
            reason="ok" if is_correct else "wrong",
        )
    )
    db.commit()


def test_get_step_accuracy_groups_by_order_index(db, test_user):
    # Trainee plays White: order_index 0 (White's move) is theirs, mostly
    # right; order_index 2 (their 2nd move) is theirs too, mostly wrong ->
    # should rank worst first. order_index 1 is Black's auto-played reply
    # (not the trainee's), so it must never appear in the results at all.
    _seed_training_response(db, test_user.id, 0, "e2e4", "e2e4", True)
    _seed_training_response(db, test_user.id, 0, "e2e4", "e2e4", True)
    _seed_training_response(db, test_user.id, 1, "e7e5", "e7e5", True)
    _seed_training_response(db, test_user.id, 2, "g1f3", "d1h5", False)
    _seed_training_response(db, test_user.id, 2, "g1f3", "d1h5", False)
    _seed_training_response(db, test_user.id, 2, "g1f3", "g1f3", True)

    steps = service.get_step_accuracy(db, test_user.id)

    assert [s.order_index for s in steps] == [2, 0]

    worst = steps[0]
    assert worst.attempts == 3
    assert worst.correct_count == 1
    assert worst.incorrect_count == 2
    assert worst.accuracy == pytest.approx(1 / 3)
    assert worst.common_wrong_moves[0].move_uci == "d1h5"
    assert worst.common_wrong_moves[0].count == 2

    best = steps[1]
    assert best.accuracy == 1.0
    assert best.common_wrong_moves == []


def test_get_step_accuracy_excludes_opponent_auto_played_plies(db, test_user):
    # Trainee plays Black: order_index 0 (White's move) is the opponent's
    # auto-played reply and must be excluded even though a TrainingResponse
    # row exists for it (the frontend silently submits it - see
    # useTrainingSession's silent submitMove call).
    _seed_training_response(db, test_user.id, 0, "e2e4", "e2e4", True, player_color="b")
    _seed_training_response(db, test_user.id, 1, "e7e5", "c7c5", True, player_color="b")

    steps = service.get_step_accuracy(db, test_user.id)
    assert [s.order_index for s in steps] == [1]


def test_get_step_accuracy_review_items_always_count_as_trainee_ply(db, test_user):
    # Review-session items are each an independent due position the trainee
    # must solve, regardless of order_index parity or the session's nominal
    # player_color (see create_session_from_due).
    _seed_training_response(
        db,
        test_user.id,
        0,
        "e2e4",
        "d2d4",
        False,
        opening_eco="C00",
        opening_name="French Defense",
        is_review_item=True,
    )

    steps = service.get_step_accuracy(db, test_user.id)
    assert len(steps) == 1
    assert steps[0].incorrect_count == 1


def test_get_step_accuracy_scoped_to_user(db, test_user):
    from backend.app.modules.users.models import User
    from backend.app.routers.auth import hash_password

    other = User(
        username="other2",
        email="other2@example.com",
        password_hash=hash_password("password123"),
        is_active=True,
    )
    db.add(other)
    db.commit()

    _seed_training_response(db, other.id, 0, "e2e4", "d2d4", False)

    steps = service.get_step_accuracy(db, test_user.id)
    assert steps == []


def test_get_global_step_accuracy_aggregates_across_users(db, test_user):
    from backend.app.modules.users.models import User
    from backend.app.routers.auth import hash_password

    other = User(
        username="other3",
        email="other3@example.com",
        password_hash=hash_password("password123"),
        is_active=True,
    )
    db.add(other)
    db.commit()

    # order_index=98 (even -> White's move, matching the default player_color
    # "w" so it counts as the trainee's ply) is used only by this test, so it
    # can't collide with rows left behind by other tests/dev usage sharing
    # this DB (see project_test_db_isolation_todo memory).
    _seed_training_response(db, test_user.id, 98, "e2e4", "d2d4", False)
    _seed_training_response(db, other.id, 98, "e2e4", "d2d4", False)

    steps = service.get_global_step_accuracy(db)
    step99 = next(s for s in steps if s.order_index == 98)
    assert step99.attempts == 2
    assert step99.incorrect_count == 2
    assert step99.common_wrong_moves[0].move_uci == "d2d4"
    assert step99.common_wrong_moves[0].count == 2


def test_progress_scoped_to_user(db, test_user):
    from backend.app.modules.users.models import User
    from backend.app.routers.auth import hash_password

    other = User(
        username="other",
        email="other@example.com",
        password_hash=hash_password("password123"),
        is_active=True,
    )
    db.add(other)
    db.commit()

    service.record_attempt(
        db, user_id=other.id, fen="fen1", correct_move_uci="e2e4", is_correct=True
    )

    summary = service.get_summary(db, test_user.id)
    assert summary["positions_seen"] == 0
