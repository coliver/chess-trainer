# tests/test_routers_training.py
import pytest
from fastapi.testclient import TestClient
from backend.app.routers.auth import get_current_user
from backend.app.app import app
from backend.app.modules.shared.db import get_db

import backend.app.routers.training as training_router


@pytest.fixture
def client():
    def _get_db_override():
        yield None

    def _get_current_user_override():
        return {"id": 1}  # or SimpleNamespace(id=1)

    app.dependency_overrides[get_db] = _get_db_override
    app.dependency_overrides[get_current_user] = _get_current_user_override

    with TestClient(app) as c:
        yield c

    app.dependency_overrides.clear()


def test_post_training_sessions_returns_id(client, monkeypatch):
    class FakeSession:
        id = 123

    monkeypatch.setattr(training_router, "create_training_session", lambda db: FakeSession)

    r = client.post("/training-sessions")
    assert r.status_code == 200
    assert r.json() == {"id": 123}


def test_get_training_next_404_when_session_missing(client, monkeypatch):
    class FakeDB:
        def get(self, model, id):
            return None

    def _get_db_override():
        yield FakeDB()

    app.dependency_overrides[get_db] = _get_db_override

    r = client.get("/training-sessions/999/next")
    assert r.status_code == 404
    assert r.json()["detail"] == "Training session not found"


def test_get_training_next_404_when_no_current_item(client, monkeypatch):
    class FakeSession:
        id = 10
        opening_eco = "C20"
        opening_name = "Test Opening"

    class FakeScalarResult:
        def all(self):
            return []

    class FakeDB:
        def get(self, model, id):
            return FakeSession()

        def scalars(self, stmt):
            return FakeScalarResult()

    def _get_db_override():
        yield FakeDB()

    app.dependency_overrides[get_db] = _get_db_override

    monkeypatch.setattr(training_router, "get_current_training_item", lambda db, training_session, all_items: None)

    r = client.get("/training-sessions/10/next")
    assert r.status_code == 404
    assert r.json()["detail"] == "No current training item"


def test_get_training_next_success_maps_fields(client, monkeypatch):
    class FakeSession:
        id = 10
        opening_eco = "C20"
        opening_name = "Test Opening"

    class FakeItem:
        id = 55
        session_id = 10
        order_index = 2
        fen = "the-fen"

    class FakeScalarResult:
        def all(self):
            return [
                FakeItem(),  # not used directly because get_current_training_item is mocked
            ]

    class FakeDB:
        def get(self, model, id):
            return FakeSession()

        def scalars(self, stmt):
            return FakeScalarResult()

    def _get_db_override():
        yield FakeDB()

    app.dependency_overrides[get_db] = _get_db_override

    monkeypatch.setattr(
        training_router,
        "get_current_training_item",
        lambda db, training_session, all_items: FakeItem(),
    )

    r = client.get("/training-sessions/10/next")
    assert r.status_code == 200
    assert r.json() == {
        "session_id": 10,
        "item_id": 55,
        "order_index": 2,
        "fen": "the-fen",
        "move_count_limit": None,
        "opening_eco": "C20",
        "opening_name": "Test Opening",
    }


def test_post_training_response_400_when_service_returns_400(client, monkeypatch):
    class Result:
        http_status = 400
        error_message = "invalid uci"
        correct = False
        reason = "ignored"
        fen_after = None

    monkeypatch.setattr(training_router, "submit_training_response", lambda db, session_id, item_id, move_uci: Result())

    r = client.post(
        "/training-sessions/1/responses",
        json={"move_uci": "bad", "item_id": 2},
    )
    assert r.status_code == 400
    assert r.json()["detail"] == "invalid uci"


def test_post_training_response_404_uses_reason_when_error_message_missing(client, monkeypatch):
    class Result:
        http_status = 404
        error_message = None
        correct = False
        reason = "session not found"
        fen_after = None

    monkeypatch.setattr(training_router, "submit_training_response", lambda db, session_id, item_id, move_uci: Result())

    r = client.post(
        "/training-sessions/1/responses",
        json={"move_uci": "e2e4", "item_id": 999},
    )
    assert r.status_code == 404
    assert r.json()["detail"] == "session not found"


def test_post_training_response_success_maps_fields(client, monkeypatch):
    class Result:
        http_status = 200
        error_message = None
        correct = False
        reason = "wrong move"
        fen_after = "afterfen"

    monkeypatch.setattr(training_router, "submit_training_response", lambda db, session_id, item_id, move_uci: Result())

    r = client.post(
        "/training-sessions/1/responses",
        json={"move_uci": "e2e4", "item_id": 2},
    )
    assert r.status_code == 200
    assert r.json() == {
        "correct": False,
        "reason": "wrong move",
        "fen_after": "afterfen",
    }


def test_post_training_items_404_when_session_missing(client, monkeypatch):
    class FakeDB:
        def get(self, model, id):
            return None

    def _get_db_override():
        yield FakeDB()

    app.dependency_overrides[get_db] = _get_db_override

    r = client.post(
        "/training-sessions/123/items",
        json=[{"order_index": 0, "fen": "f", "correct_move_uci": "e2e4"}],
    )
    assert r.status_code == 404
    assert r.json()["detail"] == "Training session not found"


def test_post_training_items_400_when_session_not_initialized(client, monkeypatch):
    class FakeSession:
        id = 10
        opening_eco = None
        opening_name = None

    class FakeDB:
        def get(self, model, id):
            return FakeSession()

    def _get_db_override():
        yield FakeDB()

    app.dependency_overrides[get_db] = _get_db_override

    r = client.post(
        "/training-sessions/10/items",
        json=[{"order_index": 0, "fen": "f", "correct_move_uci": "e2e4"}],
    )
    assert r.status_code == 400
    assert (
        r.json()["detail"]
        == "Training session not initialized. Create it via POST /training-sessions first."
    )


def test_post_training_items_success_returns_created_and_session_id(client, monkeypatch):
    class FakeSession:
        id = 10
        opening_eco = "C20"
        opening_name = "Test Opening"

    class FakeDB:
        def get(self, model, id):
            return FakeSession()

    def _get_db_override():
        yield FakeDB()

    app.dependency_overrides[get_db] = _get_db_override

    monkeypatch.setattr(training_router, "create_training_items", lambda db, session_id, items: 7)

    r = client.post(
        "/training-sessions/10/items",
        json=[{"order_index": 0, "fen": "f", "correct_move_uci": "e2e4"}],
    )
    assert r.status_code == 200
    assert r.json() == {"created": 7, "session_id": 10}
