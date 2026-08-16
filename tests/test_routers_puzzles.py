# tests/test_routers_puzzles.py
from dataclasses import dataclass
from types import SimpleNamespace

import pytest
from fastapi.testclient import TestClient

import backend.app.routers.puzzles as puzzles_router
from backend.app.app import app
from backend.app.modules.shared.db import get_db
from backend.app.routers.auth import get_current_user


@pytest.fixture
def client():
    def _get_db_override():
        yield None

    def _get_current_user_override():
        return SimpleNamespace(id=1)

    app.dependency_overrides[get_db] = _get_db_override
    app.dependency_overrides[get_current_user] = _get_current_user_override

    with TestClient(app) as c:
        yield c

    app.dependency_overrides.clear()


def test_get_puzzles_next_404_when_none_available(client, monkeypatch: pytest.MonkeyPatch):
    monkeypatch.setattr(puzzles_router, "get_next_puzzle", lambda db, user_id: None)

    r = client.get("/puzzles/next")
    assert r.status_code == 404


def test_get_puzzles_next_success_maps_fields(client, monkeypatch: pytest.MonkeyPatch):
    @dataclass
    class FakePosition:
        puzzle_id: str = "p1"
        fen: str = "the-fen"
        correct_move_uci: str = "e7e5"
        setup_move_uci: str = "e2e4"
        rating: int = 1200
        themes: str | None = "opening"

    monkeypatch.setattr(puzzles_router, "get_next_puzzle", lambda db, user_id: FakePosition())

    r = client.get("/puzzles/next")
    assert r.status_code == 200
    assert r.json() == {
        "puzzleId": "p1",
        "fen": "the-fen",
        "rating": 1200,
        "themes": "opening",
        "correctMoveUci": "e7e5",
        "lastMoveUci": "e2e4",
    }


def test_post_puzzle_attempt_404_when_puzzle_missing(client, monkeypatch: pytest.MonkeyPatch):
    monkeypatch.setattr(
        puzzles_router,
        "submit_puzzle_attempt",
        lambda db, user_id, puzzle_id, move_uci: None,
    )

    r = client.post("/puzzles/missing/attempts", json={"moveUci": "e7e5"})
    assert r.status_code == 404


def test_post_puzzle_attempt_success_maps_fields(client, monkeypatch: pytest.MonkeyPatch):
    class Result:
        http_status = 200
        correct = True
        reason = "correct move"
        fen_after = "after-fen"
        error_message = None

    monkeypatch.setattr(
        puzzles_router,
        "submit_puzzle_attempt",
        lambda db, user_id, puzzle_id, move_uci: Result(),
    )

    r = client.post("/puzzles/p1/attempts", json={"moveUci": "e7e5"})
    assert r.status_code == 200
    assert r.json() == {
        "correct": True,
        "reason": "correct move",
        "fenAfter": "after-fen",
    }


def test_get_puzzles_summary_maps_fields(client, monkeypatch: pytest.MonkeyPatch):
    monkeypatch.setattr(
        puzzles_router,
        "get_puzzle_summary",
        lambda db, user_id: {"puzzles_seen": 4, "overall_accuracy": 0.75, "mastered": 1},
    )

    r = client.get("/puzzles/summary")
    assert r.status_code == 200
    assert r.json() == {
        "puzzlesSeen": 4,
        "overallAccuracy": 0.75,
        "mastered": 1,
    }
