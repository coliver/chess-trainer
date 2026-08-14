import datetime

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
