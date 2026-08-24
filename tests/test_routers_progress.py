# tests/test_routers_progress.py
from fastapi.testclient import TestClient

from backend.app.app import app
from backend.app.modules.progress import service
from backend.app.routers.auth import get_current_user


def test_progress_summary_shape_and_scoping(db, test_user):
    service.record_attempt(
        db,
        user_id=test_user.id,
        fen="fen1",
        correct_move_uci="e2e4",
        is_correct=True,
        opening_name="French Defense",
    )

    app.dependency_overrides[get_current_user] = lambda: test_user
    try:
        with TestClient(app) as client:
            r = client.get("/progress/summary")
            assert r.status_code == 200
            body = r.json()
            assert body["positionsSeen"] == 1
            assert body["overallAccuracy"] == 1.0
            assert "openingBreakdown" in body

            r_weak = client.get("/progress/weak-spots")
            assert r_weak.status_code == 200
            assert isinstance(r_weak.json(), list)

            r_due = client.get("/progress/due")
            assert r_due.status_code == 200
            assert isinstance(r_due.json(), list)
    finally:
        app.dependency_overrides.pop(get_current_user, None)


def test_progress_step_accuracy_endpoints_shape(db, test_user):
    from backend.app.modules.training.models import TrainingItem, TrainingResponse, TrainingSession

    # order_index=98 avoids colliding with rows left behind by other tests/dev
    # usage sharing this DB (see project_test_db_isolation_todo memory).
    session = TrainingSession(
        status="active", user_id=test_user.id, opening_eco="C00", opening_name="French Defense"
    )
    db.add(session)
    db.flush()
    item = TrainingItem(
        session_id=session.id,
        order_index=98,
        fen="rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
        correct_move_uci="e7e5",
    )
    db.add(item)
    db.flush()
    db.add(
        TrainingResponse(
            item_id=item.id, submitted_move_uci="e7e6", is_correct=False, reason="wrong"
        )
    )
    db.commit()

    app.dependency_overrides[get_current_user] = lambda: test_user
    try:
        with TestClient(app) as client:
            r = client.get("/progress/step-accuracy")
            assert r.status_code == 200
            body = next(s for s in r.json() if s["orderIndex"] == 98)
            assert body["accuracy"] == 0.0
            assert body["commonWrongMoves"][0]["moveUci"] == "e7e6"

            r_global = client.get("/progress/step-accuracy/global")
            assert r_global.status_code == 200
            assert any(s["orderIndex"] == 98 for s in r_global.json())
    finally:
        app.dependency_overrides.pop(get_current_user, None)


def test_progress_summary_does_not_leak_other_users_data(db, test_user):
    from backend.app.modules.users.models import User
    from backend.app.routers.auth import hash_password

    other = User(
        username="otheruser",
        email="otheruser@example.com",
        password_hash=hash_password("password123"),
        is_active=True,
    )
    db.add(other)
    db.commit()

    service.record_attempt(
        db, user_id=other.id, fen="fen1", correct_move_uci="e2e4", is_correct=True
    )

    app.dependency_overrides[get_current_user] = lambda: test_user
    try:
        with TestClient(app) as client:
            r = client.get("/progress/summary")
            assert r.status_code == 200
            assert r.json()["positionsSeen"] == 0
    finally:
        app.dependency_overrides.pop(get_current_user, None)
