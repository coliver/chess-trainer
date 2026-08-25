# tests/test_progress_puzzles_summary_text.py
from fastapi.testclient import TestClient

from backend.app.app import app
from backend.app.modules.progress import service as progress_service
from backend.app.routers.auth import get_current_user


def test_progress_summary_text_requires_auth():
    with TestClient(app) as client:
        r = client.get("/progress/summary.text")
        assert r.status_code == 401


def test_progress_summary_text_renders_stats(db, test_user):
    progress_service.record_attempt(
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
            r = client.get("/progress/summary.text")
            assert r.status_code == 200
            assert r.headers["content-type"].startswith("text/plain")
            assert "Progress" in r.text
            assert "positions seen:   1" in r.text
    finally:
        app.dependency_overrides.pop(get_current_user, None)


def test_puzzles_summary_text_requires_auth():
    with TestClient(app) as client:
        r = client.get("/puzzles/summary.text")
        assert r.status_code == 401


def test_puzzles_summary_text_renders_stats(db, test_user):
    app.dependency_overrides[get_current_user] = lambda: test_user
    try:
        with TestClient(app) as client:
            r = client.get("/puzzles/summary.text")
            assert r.status_code == 200
            assert r.headers["content-type"].startswith("text/plain")
            assert "Puzzles" in r.text
            assert "puzzles seen:     0" in r.text
    finally:
        app.dependency_overrides.pop(get_current_user, None)
