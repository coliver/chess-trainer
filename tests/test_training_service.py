# tests/test_training_service.py
import pytest
import chess
from types import SimpleNamespace

from fastapi import HTTPException

from backend.app.modules.training import service
from backend.app.modules.training.models import (
    TrainingItem,
    TrainingSession,
    TrainingResponse,
)


class FakeQuery:
    def __init__(self, *, first_iter=None, count_iter=None):
        self._first_iter = iter(first_iter) if first_iter is not None else None
        self._count_iter = iter(count_iter) if count_iter is not None else None

    def filter(self, *args, **kwargs):
        return self

    def first(self):
        if self._first_iter is None:
            raise AssertionError("first() called but no first side effects configured")
        return next(self._first_iter)

    def count(self):
        if self._count_iter is None:
            raise AssertionError("count() called but no count side effects configured")
        return next(self._count_iter)


class FakeScalars:
    def __init__(self, all_items):
        self._all_items = all_items

    def all(self):
        return self._all_items


class FakeDB:
    """
    Fake DB for submit_training_response + create_training_items.
    """

    def __init__(
        self,
        *,
        get_return=None,
        scalars_all=None,
        training_item_count_side_effects=None,
        training_response_first_side_effects=None,
    ):
        self._get_return = get_return
        self._scalars_all = scalars_all or []

        self._training_item_count_side_effects = (
            list(training_item_count_side_effects)
            if training_item_count_side_effects is not None
            else []
        )
        self._training_response_first_side_effects = (
            list(training_response_first_side_effects)
            if training_response_first_side_effects is not None
            else []
        )

        self._training_item_count_iter = iter(self._training_item_count_side_effects)
        self._training_response_first_iter = iter(self._training_response_first_side_effects)

        self.add_calls = 0
        self.added = []
        self.flush_calls = 0
        self.commit_calls = 0

    def get(self, *args, **kwargs):
        return self._get_return

    def scalars(self, *args, **kwargs):
        return FakeScalars(self._scalars_all)

    def query(self, model_cls, *args, **kwargs):
        if model_cls is TrainingItem:
            return FakeQuery(count_iter=self._training_item_count_iter)
        if model_cls is TrainingResponse:
            return FakeQuery(first_iter=self._training_response_first_iter)
        raise AssertionError(f"Unexpected query model: {model_cls}")

    def add(self, obj):
        self.add_calls += 1
        self.added.append(obj)

    def flush(self):
        self.flush_calls += 1

    def commit(self):
        self.commit_calls += 1


class FakeScalarResult:
    def __init__(self, scalar_one_or_none_return):
        self._ret = scalar_one_or_none_return

    def scalar_one_or_none(self):
        return self._ret


class FakeDBCreateSession:
    """
    Fake DB for create_training_session:
    - db.execute(...).scalar_one_or_none()
    - db.add / db.flush (to assign TrainingSession.id)
    - db.commit
    - db.refresh
    """

    def __init__(self, opening):
        self._opening = opening
        self.added = []
        self.add_calls = 0
        self.commit_calls = 0
        self.flush_calls = 0
        self.refresh_calls = 0

    def execute(self, *args, **kwargs):
        return FakeScalarResult(self._opening)

    def add(self, obj):
        self.add_calls += 1
        self.added.append(obj)

    def flush(self):
        self.flush_calls += 1
        # create_training_session needs session.id before adding TrainingItem rows
        for obj in self.added:
            if isinstance(obj, TrainingSession) and getattr(obj, "id", None) is None:
                obj.id = 1

    def commit(self):
        self.commit_calls += 1

    def refresh(self, obj):
        self.refresh_calls += 1


# ---------------- submit_training_response tests ----------------


def test_submit_training_response_session_not_found():
    db = FakeDB(get_return=None)

    res = service.submit_training_response(db=db, session_id=123, item_id=1, move_uci="e2e4")

    assert res.http_status == 404
    assert res.correct is False
    assert res.reason == "training session not found"
    assert res.fen_after is None
    assert res.error_message == "Training session not found."


def test_submit_training_response_item_id_mismatch_returns_404(monkeypatch):
    session = SimpleNamespace(id=123, status="active")
    current = SimpleNamespace(id=2, fen="fen_before", correct_move_uci="e2e4")
    all_items = [SimpleNamespace(id=1), current]

    db = FakeDB(
        get_return=session,
        scalars_all=all_items,
        training_item_count_side_effects=[len(all_items), len(all_items)],
    )

    monkeypatch.setattr(service, "get_current_training_item", lambda *a, **k: current)

    validate_called = {"called": False}

    def validate_spy(*args, **kwargs):
        validate_called["called"] = True
        return None

    monkeypatch.setattr(service, "validate_and_apply", validate_spy)

    res = service.submit_training_response(db=db, session_id=123, item_id=1, move_uci="e2e4")

    assert res.http_status == 404
    assert res.correct is False
    assert res.reason == "training item not found"
    assert res.error_message == "Training item not found."
    assert validate_called["called"] is False


def test_submit_training_response_correct_creates_training_response_and_commits(
    monkeypatch,
):
    session = SimpleNamespace(id=123, status="active")

    current = SimpleNamespace(id=10, fen="fen_before", correct_move_uci="e2e4")
    other = SimpleNamespace(id=11, fen="fen_other", correct_move_uci="d2d4")
    all_items = [current, other]

    db = FakeDB(
        get_return=session,
        scalars_all=all_items,
        training_item_count_side_effects=[len(all_items), len(all_items)],
        training_response_first_side_effects=[None, object(), object()],
    )

    monkeypatch.setattr(service, "get_current_training_item", lambda *a, **k: current)

    result = SimpleNamespace(
        correct=True,
        reason="Correct",
        fen_after="fen_after",
        http_status=200,
        error_message=None,
    )
    monkeypatch.setattr(service, "validate_and_apply", lambda *a, **k: result)

    res = service.submit_training_response(db=db, session_id=123, item_id=10, move_uci="e2e4")

    assert res.http_status == 200
    assert res.correct is True
    assert res.reason == "Correct"
    assert res.fen_after == "fen_after"
    assert res.error_message is None

    assert db.commit_calls == 1
    assert db.flush_calls == 1
    assert db.add_calls == 1  # created TrainingResponse


def test_submit_training_response_marks_session_completed_when_all_correct(monkeypatch):
    session = SimpleNamespace(id=123, status="active")

    item1 = SimpleNamespace(id=1, fen="f1", correct_move_uci="e2e4")
    item2 = SimpleNamespace(id=2, fen="f2", correct_move_uci="d2d4")
    all_items = [item1, item2]

    db = FakeDB(
        get_return=session,
        scalars_all=all_items,
        training_item_count_side_effects=[len(all_items), len(all_items)],
        training_response_first_side_effects=[None, object(), object()],
    )

    monkeypatch.setattr(service, "get_current_training_item", lambda *a, **k: item1)

    result = SimpleNamespace(
        correct=True,
        reason="Correct",
        fen_after="after",
        http_status=200,
        error_message=None,
    )
    monkeypatch.setattr(service, "validate_and_apply", lambda *a, **k: result)

    res = service.submit_training_response(db=db, session_id=123, item_id=1, move_uci="e2e4")

    assert res.http_status == 200
    assert session.status == "completed"
    assert db.commit_calls == 1


def test_submit_training_response_updates_existing_response_instead_of_creating(
    monkeypatch,
):
    session = SimpleNamespace(id=123, status="active")

    current = SimpleNamespace(id=10, fen="fen_before", correct_move_uci="e2e4")
    all_items = [current]

    existing_response = SimpleNamespace(
        submitted_move_uci="old",
        is_correct=False,
        reason="old",
        fen_after="old_fen_after",
    )

    db = FakeDB(
        get_return=session,
        scalars_all=all_items,
        training_item_count_side_effects=[len(all_items), len(all_items)],
        training_response_first_side_effects=[existing_response, None],
    )

    monkeypatch.setattr(service, "get_current_training_item", lambda *a, **k: current)

    result = SimpleNamespace(
        correct=False,
        reason="Wrong move",
        fen_after=None,
        http_status=200,
        error_message=None,
    )
    monkeypatch.setattr(service, "validate_and_apply", lambda *a, **k: result)

    res = service.submit_training_response(db=db, session_id=123, item_id=10, move_uci="e2e4")

    assert res.http_status == 200
    assert res.correct is False
    assert res.reason == "Wrong move"
    assert res.fen_after is None
    assert res.error_message is None

    assert db.add_calls == 0  # updated existing, did not create
    assert db.commit_calls == 1

    assert existing_response.submitted_move_uci == "e2e4"
    assert existing_response.is_correct is False
    assert existing_response.reason == "Wrong move"
    assert existing_response.fen_after is None
    assert session.status == "active"


def test_submit_training_response_current_none_all_items_responded_returns_completed(
    monkeypatch,
):
    session = SimpleNamespace(id=123, status="active")
    item1 = SimpleNamespace(id=1, fen="f1", correct_move_uci="e2e4")
    item2 = SimpleNamespace(id=2, fen="f2", correct_move_uci="d2d4")
    all_items = [item1, item2]

    db = FakeDB(
        get_return=session,
        scalars_all=all_items,
        training_item_count_side_effects=[len(all_items), len(all_items)],
        training_response_first_side_effects=[object(), object()],
    )

    monkeypatch.setattr(service, "get_current_training_item", lambda *a, **k: None)

    res = service.submit_training_response(db=db, session_id=123, item_id=999, move_uci="e2e4")

    assert res.http_status == 200
    assert res.correct is True
    assert res.reason == "training session completed"
    assert res.error_message == "Training session already completed."
    assert res.fen_after is None
    assert res.session_completed is True
    assert db.commit_calls == 0  # early return



def test_submit_training_response_current_none_not_all_items_responded_returns_item_not_found(
    monkeypatch,
):
    session = SimpleNamespace(id=123, status="active")
    item1 = SimpleNamespace(id=1, fen="f1", correct_move_uci="e2e4")
    item2 = SimpleNamespace(id=2, fen="f2", correct_move_uci="d2d4")
    all_items = [item1, item2]

    db = FakeDB(
        get_return=session,
        scalars_all=all_items,
        training_item_count_side_effects=[len(all_items), len(all_items)],
        training_response_first_side_effects=[object(), None],
    )

    monkeypatch.setattr(service, "get_current_training_item", lambda *a, **k: None)

    res = service.submit_training_response(db=db, session_id=123, item_id=999, move_uci="e2e4")

    assert res.http_status == 404
    assert res.correct is False
    assert res.reason == "training item not found"
    assert res.error_message == "Training items not found for this session."
    assert res.fen_after is None
    assert db.commit_calls == 0  # early return


# ---------------- get_current_training_item tests ----------------


def test_get_current_training_item_returns_first_incorrect_item():
    item1 = SimpleNamespace(id=1)
    item2 = SimpleNamespace(id=2)
    all_items = [item1, item2]

    db = FakeDB(training_response_first_side_effects=[None])

    out = service.get_current_training_item(db=db, training_session=None, all_items=all_items)
    assert out is item1


def test_get_current_training_item_returns_none_when_all_items_correct():
    item1 = SimpleNamespace(id=1)
    item2 = SimpleNamespace(id=2)
    all_items = [item1, item2]

    db = FakeDB(training_response_first_side_effects=[object(), object()])

    out = service.get_current_training_item(db=db, training_session=None, all_items=all_items)
    assert out is None


def test_get_current_training_item_empty_all_items_returns_none():
    db = FakeDB()
    out = service.get_current_training_item(db=db, training_session=None, all_items=[])
    assert out is None


# ---------------- create_training_items tests ----------------


def test_create_training_items_session_not_found_404():
    db = FakeDB(get_return=None)

    with pytest.raises(HTTPException) as exc:
        service.create_training_items(db=db, session_id=999, items=[])

    assert exc.value.status_code == 404
    assert exc.value.detail == "Training session not found"


def test_create_training_items_duplicate_order_index_400():
    session = SimpleNamespace(id=1)
    db = FakeDB(get_return=session)

    item1 = SimpleNamespace(order_index=0, fen="f0", correct_move_uci="e2e4")
    item2 = SimpleNamespace(order_index=0, fen="f1", correct_move_uci="d2d4")

    with pytest.raises(HTTPException) as exc:
        service.create_training_items(db=db, session_id=1, items=[item1, item2])

    assert exc.value.status_code == 400
    assert exc.value.detail == "Duplicate order_index"


def test_create_training_items_adds_and_returns_count():
    session = SimpleNamespace(id=1)
    db = FakeDB(get_return=session)

    item1 = SimpleNamespace(order_index=0, fen="f0", correct_move_uci="e2e4")
    item2 = SimpleNamespace(order_index=1, fen="f1", correct_move_uci="d2d4")

    out = service.create_training_items(db=db, session_id=1, items=[item1, item2])

    assert out == 2
    assert db.add_calls == 2
    assert db.commit_calls == 1


# ---------------- create_training_session tests (missing coverage) ----------------


def test_create_training_session_success_creates_session_and_items():
    # legal from initial position
    moves = "e2e4 e7e5 g1f3"

    opening = SimpleNamespace(
        eco="A00",
        name="Test Opening",
        uci_moves=moves,
        epd=None,
    )

    db = FakeDBCreateSession(opening=opening)

    session = service.create_training_session(db=db, user_id=1)

    assert isinstance(session, TrainingSession)
    assert session.status == "active"
    assert session.opening_eco == "A00"
    assert session.opening_name == "Test Opening"
    assert db.commit_calls == 1
    assert db.refresh_calls == 1

    # session.id must be set during flush so TrainingItem.session_id is correct
    added_items = [o for o in db.added if isinstance(o, TrainingItem)]
    assert len(added_items) == 3

    # check first item's fen equals initial board fen
    start_board = chess.Board()
    assert added_items[0].order_index == 0
    assert added_items[0].correct_move_uci == "e2e4"
    assert added_items[0].session_id == session.id
    assert added_items[0].fen == start_board.fen()


def test_create_training_session_no_opening_returns_404():
    db = FakeDBCreateSession(opening=None)

    with pytest.raises(HTTPException) as exc:
        service.create_training_session(db=db, user_id=1)

    assert exc.value.status_code == 404
    assert exc.value.detail == "No openings found in database"


def test_create_training_session_no_opening_moves_found_returns_404():
    # whitespace is truthy, but split() -> []
    opening = SimpleNamespace(
        eco="A00",
        name="Whitespace Moves Opening",
        uci_moves="   ",
        epd=None,
    )
    db = FakeDBCreateSession(opening=opening)

    with pytest.raises(HTTPException) as exc:
        service.create_training_session(db=db, user_id=1)

    assert exc.value.status_code == 404
    assert exc.value.detail == "No opening moves found"


def test_create_training_session_inconsistent_epd_falls_back_to_initial():
    # epd position that cannot apply the move sequence, but initial position can
    epd_empty_board = "8/8/8/8/8/8/8/8 w - - 0 1"
    opening = SimpleNamespace(
        eco="B00",
        name="EPD Fallback Opening",
        uci_moves="e2e4 e7e5",
        epd=epd_empty_board,
    )

    db = FakeDBCreateSession(opening=opening)
    session = service.create_training_session(db=db, user_id=1)

    assert session.status == "active"

    added_items = [o for o in db.added if isinstance(o, TrainingItem)]
    assert len(added_items) == 2

    # If fallback-to-initial happened, first fen must match initial board fen.
    assert added_items[0].fen == chess.Board().fen()
    assert added_items[0].correct_move_uci == "e2e4"


def test_create_training_session_can_apply_except_hits_500():
    opening = SimpleNamespace(
        eco="A00",
        name="Invalid UCI Opening",
        uci_moves="e2e9",  # invalid UCI -> chess.Move.from_uci throws -> can_apply() except
        epd=None,
    )
    db = FakeDBCreateSession(opening=opening)

    with pytest.raises(HTTPException) as exc:
        service.create_training_session(db=db, user_id=1)

    assert exc.value.status_code == 500
    assert "Opening dataset inconsistent" in exc.value.detail


def test_create_training_session_dataset_mismatch_hits_500(monkeypatch):
    opening = SimpleNamespace(
        eco="A00",
        name="Mismatch Opening",
        uci_moves="e2e4",  # at start, e2e4 is legal
        epd=None,
    )
    db = FakeDBCreateSession(opening=opening)

    import chess

    orig = chess.Move.from_uci
    calls = {"n": 0}

    def fake_from_uci(s: str):
        calls["n"] += 1
        # call #1 happens inside can_apply()
        if calls["n"] == 1:
            return orig("e2e4")  # legal at start
        # call #2 happens inside the main loop -> should be illegal at start
        return orig("e2e5")  # illegal for the start position

    monkeypatch.setattr(chess.Move, "from_uci", fake_from_uci)

    with pytest.raises(HTTPException) as exc:
        service.create_training_session(db=db, user_id=1)

    assert exc.value.status_code == 500
    assert "Dataset mismatch" in exc.value.detail
    assert "idx=0" in exc.value.detail
