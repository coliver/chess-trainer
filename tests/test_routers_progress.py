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
