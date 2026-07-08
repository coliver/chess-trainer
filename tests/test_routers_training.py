import pytest
from fastapi.testclient import TestClient

from backend.app.app import app
from backend.app.modules.shared.db import get_db

import backend.app.routers.training as training_router


@pytest.fixture
def client():
    def _get_db_override():
        yield None

    app.dependency_overrides[get_db] = _get_db_override
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


def test_post_training_sessions_returns_id(client, monkeypatch):
    class FakeSession:
        id = 123

    monkeypatch.setattr(training_router, "create_training_session", lambda db: FakeSession)

    r = client.post("/api/training-sessions")
    assert r.status_code == 200
    assert r.json() == {"id": 123}


def test_get_training_next_404_when_no_item(client, monkeypatch):
    monkeypatch.setattr(training_router, "get_current_training_item", lambda db, session_id: None)

    r = client.get("/api/training-sessions/1/next")
    assert r.status_code == 404
    assert r.json() == {"detail": "No current training item"}


def test_get_training_next_200(client, monkeypatch):
    class Item:
        session_id = 1
        id = 7
        order_index = 0
        fen = "fen"

    monkeypatch.setattr(training_router, "get_current_training_item", lambda db, session_id: Item())

    r = client.get("/api/training-sessions/1/next")
    assert r.status_code == 200
    assert r.json() == {
        "session_id": 1,
        "item_id": 7,
        "order_index": 0,
        "fen": "fen",
        "move_count_limit": None,
    }


def test_post_training_response_200_correct(client, monkeypatch):
    class FakeResult:
        http_status = 200
        correct = True
        reason = "ok"
        fen_after = "after"

    monkeypatch.setattr(
        training_router,
        "submit_training_response",
        lambda db, session_id, item_id, move_uci: FakeResult(),
    )

    payload = {"move_uci": "e2e4", "item_id": 9}
    r = client.post("/api/training-sessions/1/responses", json=payload)
    assert r.status_code == 200
    assert r.json() == {"correct": True, "reason": "ok", "fen_after": "after"}


def test_post_training_response_maps_400(client, monkeypatch):
    class FakeResult:
        http_status = 400
        error_message = "bad move"
        correct = False
        reason = "ignored"
        fen_after = None

    monkeypatch.setattr(
        training_router,
        "submit_training_response",
        lambda db, session_id, item_id, move_uci: FakeResult(),
    )

    payload = {"move_uci": "e2e5", "item_id": 9}
    r = client.post("/api/training-sessions/1/responses", json=payload)
    assert r.status_code == 400
    assert r.json() == {"detail": "bad move"}


def test_post_training_response_maps_404(client, monkeypatch):
    class FakeResult:
        http_status = 404
        error_message = None
        reason = "not found"
        correct = False
        fen_after = None

    monkeypatch.setattr(
        training_router,
        "submit_training_response",
        lambda db, session_id, item_id, move_uci: FakeResult(),
    )

    payload = {"move_uci": "e2e5", "item_id": 9}
    r = client.post("/api/training-sessions/1/responses", json=payload)
    assert r.status_code == 404
    assert r.json() == {"detail": "not found"}


def test_post_training_items_200(client, monkeypatch):
    monkeypatch.setattr(
        training_router,
        "create_training_items",
        lambda db, session_id, items: 2,
    )

    payload = [
        {"order_index": 0, "fen": "fen0", "correct_move_uci": "e2e4"},
        {"order_index": 1, "fen": "fen1", "correct_move_uci": "d2d4"},
    ]
    r = client.post("/api/training-sessions/1/items", json=payload)
    assert r.status_code == 200
    assert r.json() == {"created": 2, "session_id": 1}
