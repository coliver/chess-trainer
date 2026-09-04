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
    monkeypatch.setattr(
        puzzles_router,
        "get_next_puzzle",
        lambda db, user_id, theme=None, exclude_id=None: None,
    )

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
        move_index: int = 0
        solver_moves_total: int = 1

    monkeypatch.setattr(
        puzzles_router,
        "get_next_puzzle",
        lambda db, user_id, theme=None, exclude_id=None: FakePosition(),
    )

    r = client.get("/puzzles/next")
    assert r.status_code == 200
    assert r.json() == {
        "puzzleId": "p1",
        "fen": "the-fen",
        "rating": 1200,
        "themes": "opening",
        "correctMoveUci": "e7e5",
        "lastMoveUci": "e2e4",
        "moveIndex": 0,
        "solverMovesTotal": 1,
    }


def test_get_puzzles_next_passes_theme_query_param(client, monkeypatch: pytest.MonkeyPatch):
    captured = {}

    def fake_get_next_puzzle(db, user_id, theme=None, exclude_id=None):
        captured["theme"] = theme

    monkeypatch.setattr(puzzles_router, "get_next_puzzle", fake_get_next_puzzle)

    r = client.get("/puzzles/next", params={"theme": "fork"})
    assert r.status_code == 404
    assert captured["theme"] == "fork"


def test_get_puzzles_next_passes_exclude_id_query_param(client, monkeypatch: pytest.MonkeyPatch):
    captured = {}

    def fake_get_next_puzzle(db, user_id, theme=None, exclude_id=None):
        captured["exclude_id"] = exclude_id

    monkeypatch.setattr(puzzles_router, "get_next_puzzle", fake_get_next_puzzle)

    r = client.get("/puzzles/next", params={"excludeId": "p1"})
    assert r.status_code == 404
    assert captured["exclude_id"] == "p1"


def test_get_puzzles_themes_maps_fields(client, monkeypatch: pytest.MonkeyPatch):
    monkeypatch.setattr(
        puzzles_router, "get_theme_counts", lambda db: [("endgame", 4688), ("fork", 873)]
    )

    r = client.get("/puzzles/themes")
    assert r.status_code == 200
    assert r.json() == [
        {"theme": "endgame", "count": 4688},
        {"theme": "fork", "count": 873},
    ]


def test_post_puzzle_attempt_404_when_puzzle_missing(client, monkeypatch: pytest.MonkeyPatch):
    monkeypatch.setattr(
        puzzles_router,
        "submit_puzzle_attempt",
        lambda db, user_id, puzzle_id, move_uci, move_index, used_hint=False: None,
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
        puzzle_complete = True
        opponent_reply_uci = None
        next_correct_move_uci = None

    monkeypatch.setattr(
        puzzles_router,
        "submit_puzzle_attempt",
        lambda db, user_id, puzzle_id, move_uci, move_index, used_hint=False: Result(),
    )

    r = client.post("/puzzles/p1/attempts", json={"moveUci": "e7e5"})
    assert r.status_code == 200
    assert r.json() == {
        "correct": True,
        "reason": "correct move",
        "fenAfter": "after-fen",
        "puzzleComplete": True,
        "opponentReplyUci": None,
        "nextCorrectMoveUci": None,
    }


def test_post_puzzle_attempt_intermediate_move_maps_opponent_reply(
    client, monkeypatch: pytest.MonkeyPatch
):
    class Result:
        http_status = 200
        correct = True
        reason = "correct move"
        fen_after = "after-fen"
        error_message = None
        puzzle_complete = False
        opponent_reply_uci = "g1f3"
        next_correct_move_uci = "b8c6"

    captured = {}

    def fake_submit(db, user_id, puzzle_id, move_uci, move_index, used_hint=False):
        captured["move_index"] = move_index
        return Result()

    monkeypatch.setattr(puzzles_router, "submit_puzzle_attempt", fake_submit)

    r = client.post("/puzzles/p1/attempts", json={"moveUci": "e7e5", "moveIndex": 0})
    assert r.status_code == 200
    assert captured["move_index"] == 0
    assert r.json() == {
        "correct": True,
        "reason": "correct move",
        "fenAfter": "after-fen",
        "puzzleComplete": False,
        "opponentReplyUci": "g1f3",
        "nextCorrectMoveUci": "b8c6",
    }


def test_post_puzzle_attempt_passes_used_hint(client, monkeypatch: pytest.MonkeyPatch):
    class Result:
        http_status = 200
        correct = True
        reason = "correct move"
        fen_after = "after-fen"
        error_message = None
        puzzle_complete = True
        opponent_reply_uci = None
        next_correct_move_uci = None

    captured = {}

    def fake_submit(db, user_id, puzzle_id, move_uci, move_index, used_hint=False):
        captured["used_hint"] = used_hint
        return Result()

    monkeypatch.setattr(puzzles_router, "submit_puzzle_attempt", fake_submit)

    r = client.post("/puzzles/p1/attempts", json={"moveUci": "e7e5", "usedHint": True})
    assert r.status_code == 200
    assert captured["used_hint"] is True


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
