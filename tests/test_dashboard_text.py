# tests/test_dashboard_text.py
from fastapi.testclient import TestClient

from backend.app.app import app
from backend.app.modules.progress import service as progress_service
from backend.app.modules.shared.text_mode import KNIGHT_SCHOOL_BANNER
from backend.app.routers.auth import get_current_user_or_none


def test_dashboard_text_requires_auth():
    with TestClient(app) as client:
        r = client.get("/dashboard.text")
        assert r.status_code == 401
        assert r.headers["content-type"].startswith("text/plain")
        assert "Not authenticated" in r.text
        assert "auth/login" in r.text
        assert KNIGHT_SCHOOL_BANNER in r.text


def test_dashboard_text_combines_progress_and_puzzles(db, test_user):
    progress_service.record_attempt(
        db,
        user_id=test_user.id,
        fen="fen1",
        correct_move_uci="e2e4",
        is_correct=True,
        opening_name="French Defense",
    )

    app.dependency_overrides[get_current_user_or_none] = lambda: test_user
    try:
        with TestClient(app) as client:
            r = client.get("/dashboard.text")
            assert r.status_code == 200
            assert r.headers["content-type"].startswith("text/plain")
            assert KNIGHT_SCHOOL_BANNER in r.text
            assert test_user.email in r.text
            assert "Progress" in r.text
            assert "positions seen:   1" in r.text
            assert "Puzzles" in r.text
            assert "puzzles seen:     0" in r.text
    finally:
        app.dependency_overrides.pop(get_current_user_or_none, None)
