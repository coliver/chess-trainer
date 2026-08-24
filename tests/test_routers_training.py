# tests/test_routers_training.py
from types import SimpleNamespace

import pytest
from fastapi.testclient import TestClient

import backend.app.routers.training as training_router
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


def test_post_training_sessions_returns_id(client: any, monkeypatch: pytest.MonkeyPatch):
    class FakeSession:
        id = 123

    monkeypatch.setattr(
        training_router,
        "create_training_session",
        lambda db, user_id, opening_eco=None, opening_name=None, player_color="w": FakeSession(),
    )

    r = client.post("/training-sessions", json={})
    assert r.status_code == 200
    assert r.json() == {"id": 123}


def test_post_training_sessions_from_due_returns_id(client: any, monkeypatch: pytest.MonkeyPatch):
    class FakeSession:
        id = 456

    monkeypatch.setattr(
        training_router,
        "create_session_from_due",
        lambda db, user_id: FakeSession(),
    )

    r = client.post("/training-sessions/from-due")
    assert r.status_code == 200
    assert r.json() == {"id": 456}


def test_get_training_next_404_when_session_missing(client: any, monkeypatch: pytest.MonkeyPatch):
    class FakeDB:
        def get(self, model, id):
            return None

    def _get_db_override():
        yield FakeDB()

    app.dependency_overrides[get_db] = _get_db_override

    r = client.get("/training-sessions/999/next")
    assert r.status_code == 404
    assert r.json()["detail"] == "Training session not found"


def test_get_training_next_404_when_no_current_item(client: any, monkeypatch: pytest.MonkeyPatch):
    class FakeSession:
        id = 10
        user_id = 1
        opening_eco = "C20"
        opening_name = "Test Opening"
        player_color = "w"

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

    monkeypatch.setattr(
        training_router,
        "get_current_training_item",
        lambda db, training_session, all_items: None,
    )

    r = client.get("/training-sessions/10/next")
    assert r.status_code == 404
    assert r.json()["detail"] == "No current training item"


def test_get_training_next_success_maps_fields(client: any, monkeypatch: pytest.MonkeyPatch):
    class FakeSession:
        id = 10
        user_id = 1
        opening_eco = "C20"
        opening_name = "Test Opening"
        player_color = "b"

    class FakeItem:
        id = 55
        session_id = 10
        order_index = 2
        fen = "the-fen"
        correct_move_uci = "e2e4"
        opening_eco = None
        opening_name = None

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
        "sessionId": 10,
        "itemId": 55,
        "orderIndex": 2,
        "fen": "the-fen",
        "moveCountLimit": None,
        "openingEco": "C20",
        "openingName": "Test Opening",
        "correctMoveUci": "e2e4",
        "playerColor": "b",
    }


@pytest.mark.parametrize(
    "fen, expected_player_color",
    [
        ("rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1", "w"),
        (
            "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1",
            "b",
        ),
    ],
)
def test_get_training_next_review_item_derives_player_color_from_fen(
    client: any,
    monkeypatch: pytest.MonkeyPatch,
    fen: str,
    expected_player_color: str,
):
    """A "Review" session (created via /training-sessions/from-due, see
    create_session_from_due) is seeded from due positions that may have come
    from either a White- or a Black-training session, but the session row
    itself always defaults player_color to "w". Each review item's fen is,
    by construction, always the trainee's own move to solve — so the
    response's player_color must be derived from the item's fen, not
    inherited from the session, for both a White-to-move and a
    Black-to-move due position.
    """

    class FakeSession:
        id = 10
        user_id = 1
        opening_eco = None
        opening_name = "Review"
        player_color = "w"  # always "w" on a review session — see create_session_from_due

    class FakeItem:
        id = 55
        session_id = 10
        order_index = 2
        correct_move_uci = "e2e4"
        # Review items carry their own opening_eco/opening_name per-item
        # (see create_session_from_due) — that's the signal used to detect
        # a review item and switch to fen-derived player_color.
        opening_eco = "C20"
        opening_name = "King's Pawn Game"

    FakeItem.fen = fen

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

    monkeypatch.setattr(
        training_router,
        "get_current_training_item",
        lambda db, training_session, all_items: FakeItem(),
    )

    r = client.get("/training-sessions/10/next")
    assert r.status_code == 200
    assert r.json()["playerColor"] == expected_player_color


def test_get_training_next_non_review_item_keeps_session_player_color(
    client: any, monkeypatch: pytest.MonkeyPatch
):
    """A normal (single-opening) session's items have no per-item
    opening_eco/opening_name, so player_color must keep coming from the
    session even when the fen's side-to-move differs (e.g. mid-line, or the
    opponent's ply that the frontend is about to autoplay)."""

    class FakeSession:
        id = 10
        user_id = 1
        opening_eco = "C20"
        opening_name = "King's Pawn Game"
        player_color = "b"

    class FakeItem:
        id = 55
        session_id = 10
        order_index = 0
        # White to move here, but this is a Black-training session's item
        # (the auto-played opponent ply) — player_color must stay "b".
        fen = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"
        correct_move_uci = "e2e4"
        opening_eco = None
        opening_name = None

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

    monkeypatch.setattr(
        training_router,
        "get_current_training_item",
        lambda db, training_session, all_items: FakeItem(),
    )

    r = client.get("/training-sessions/10/next")
    assert r.status_code == 200
    assert r.json()["playerColor"] == "b"


def test_post_training_response_400_when_service_returns_400(
    client: any, monkeypatch: pytest.MonkeyPatch
):
    class FakeSession:
        id = 1
        user_id = 1

    class FakeDB:
        def get(self, model, id):
            return FakeSession()

    def _get_db_override():
        yield FakeDB()

    app.dependency_overrides[get_db] = _get_db_override

    class Result:
        http_status = 400
        error_message = "invalid uci"
        correct = False
        reason = "ignored"
        fen_after = None

    monkeypatch.setattr(
        training_router,
        "submit_training_response",
        lambda db, session_id, item_id, move_uci, current_user_id: Result(),
    )

    r = client.post(
        "/training-sessions/1/responses",
        json={"move_uci": "bad", "item_id": 2},
    )
    assert r.status_code == 400
    assert r.json()["detail"] == "invalid uci"


def test_post_training_response_404_uses_reason_when_error_message_missing(
    client: any, monkeypatch: pytest.MonkeyPatch
):
    class FakeSession:
        id = 1
        user_id = 1

    class FakeDB:
        def get(self, model, id):
            return FakeSession()

    def _get_db_override():
        yield FakeDB()

    app.dependency_overrides[get_db] = _get_db_override

    class Result:
        http_status = 404
        error_message = None
        correct = False
        reason = "session not found"
        fen_after = None

    monkeypatch.setattr(
        training_router,
        "submit_training_response",
        lambda db, session_id, item_id, move_uci, current_user_id: Result(),
    )

    r = client.post(
        "/training-sessions/1/responses",
        json={"move_uci": "e2e4", "item_id": 999},
    )
    assert r.status_code == 404
    assert r.json()["detail"] == "session not found"


def test_post_training_response_success_maps_fields(client: any, monkeypatch: pytest.MonkeyPatch):
    class FakeSession:
        id = 1
        user_id = 1

    class FakeDB:
        def get(self, model, id):
            return FakeSession()

    def _get_db_override():
        yield FakeDB()

    app.dependency_overrides[get_db] = _get_db_override

    class Result:
        http_status = 200
        error_message = None
        correct = False
        reason = "wrong move"
        fen_after = "afterfen"
        session_completed = False

    monkeypatch.setattr(
        training_router,
        "submit_training_response",
        lambda db, session_id, item_id, move_uci, current_user_id: Result(),
    )

    r = client.post(
        "/training-sessions/1/responses",
        json={"move_uci": "e2e4", "item_id": 2},
    )
    assert r.status_code == 200
    assert r.json() == {
        "correct": False,
        "reason": "wrong move",
        "fenAfter": "afterfen",
        "sessionCompleted": False,
    }


def test_post_training_items_404_when_session_missing(client: any, monkeypatch: pytest.MonkeyPatch):
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


def test_post_training_items_400_when_session_not_initialized(
    client: any, monkeypatch: pytest.MonkeyPatch
):
    class FakeSession:
        id = 10
        user_id = 1
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


def test_post_training_items_success_returns_created_and_session_id(
    client: any, monkeypatch: pytest.MonkeyPatch
):
    class FakeSession:
        id = 10
        user_id = 1
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
    assert r.json() == {"created": 7, "sessionId": 10}
