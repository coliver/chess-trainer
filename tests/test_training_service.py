# tests/test_training_service.py
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from fastapi import HTTPException

from backend.app.modules.training import service as service_module
from backend.app.modules.training.service import (
    create_training_session,
    get_current_training_item,
    submit_training_response,
    create_training_items,
)
from backend.app.modules.training.models import (
    Base,
    TrainingSession,
    TrainingItem,
    TrainingResponse,
)


@pytest.fixture
def db_session():
    engine = create_engine(
        "sqlite:///:memory:", connect_args={"check_same_thread": False}
    )
    Base.metadata.create_all(engine)
    SessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False)
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@pytest.fixture
def active_session(db_session):
    s = TrainingSession(status="active")
    db_session.add(s)
    db_session.commit()
    db_session.refresh(s)
    return s


def test_create_training_session_inserts_mvp_items(db_session, monkeypatch):
    monkeypatch.setattr(
        service_module,
        "MVP_ITEMS",
        [
            {"fen": "fen1", "correct_move_uci": "e2e4"},
            {"fen": "fen2", "correct_move_uci": "d2d4"},
            {"fen": "fen3", "correct_move_uci": "g1f3"},
        ],
    )

    sess = create_training_session(db_session, batch_size=2)

    items = (
        db_session.query(TrainingItem)
        .filter(TrainingItem.session_id == sess.id)
        .order_by(TrainingItem.order_index.asc())
        .all()
    )
    assert sess.id is not None
    assert sess.status == "active"
    assert [i.fen for i in items] == ["fen1", "fen2"]
    assert [i.correct_move_uci for i in items] == ["e2e4", "d2d4"]


def test_get_current_training_item_returns_first_unanswered(db_session, active_session):
    item0 = TrainingItem(
        session_id=active_session.id, order_index=0, fen="fen0", correct_move_uci="e2e4"
    )
    item1 = TrainingItem(
        session_id=active_session.id, order_index=1, fen="fen1", correct_move_uci="d2d4"
    )
    db_session.add_all([item0, item1])
    db_session.commit()
    db_session.refresh(item0)
    db_session.refresh(item1)

    # mark item0 answered
    db_session.add(
        TrainingResponse(
            item_id=item0.id,
            submitted_move_uci="e2e4",
            is_correct=True,
            reason="ok",
            fen_after="after0",
        )
    )
    db_session.commit()

    current = get_current_training_item(db_session, session_id=active_session.id)
    assert current is not None
    assert current.id == item1.id


def test_get_current_training_item_returns_none_when_all_answered(
    db_session, active_session
):
    item0 = TrainingItem(
        session_id=active_session.id, order_index=0, fen="fen0", correct_move_uci="e2e4"
    )
    db_session.add(item0)
    db_session.commit()
    db_session.refresh(item0)

    db_session.add(
        TrainingResponse(
            item_id=item0.id,
            submitted_move_uci="e2e4",
            is_correct=True,
            reason="ok",
            fen_after="after0",
        )
    )
    db_session.commit()

    current = get_current_training_item(db_session, session_id=active_session.id)
    assert current is None


def test_submit_training_response_session_not_found(db_session):
    res = submit_training_response(
        db_session, session_id=999, item_id=1, move_uci="e2e4"
    )
    assert res.http_status == 404
    assert res.correct is False
    assert res.reason == "training session not found"


def test_submit_training_response_item_not_found_when_no_items(
    db_session, active_session
):
    res = submit_training_response(
        db_session, session_id=active_session.id, item_id=1, move_uci="e2e4"
    )
    assert res.http_status == 404
    assert res.correct is False
    assert res.reason == "training item not found"
    assert res.error_message == "Training items not found for this session."


def test_submit_training_response_item_id_mismatch_returns_404(
    db_session, active_session
):
    item0 = TrainingItem(
        session_id=active_session.id, order_index=0, fen="fen0", correct_move_uci="e2e4"
    )
    db_session.add(item0)
    db_session.commit()
    db_session.refresh(item0)

    res = submit_training_response(
        db_session,
        session_id=active_session.id,
        item_id=item0.id + 123,  # mismatch
        move_uci="e2e4",
    )
    assert res.http_status == 404
    assert res.correct is False
    assert res.reason == "training item not found"


def test_submit_training_response_wrong_move_creates_response(
    db_session, active_session, monkeypatch
):
    item0 = TrainingItem(
        session_id=active_session.id, order_index=0, fen="fen0", correct_move_uci="e2e4"
    )
    db_session.add(item0)
    db_session.commit()
    db_session.refresh(item0)

    class FakeResult:
        http_status = 200
        correct = False
        reason = "illegal or wrong move"
        fen_after = None
        error_message = "bad move"

    def fake_validate_and_apply(*, fen, move_uci, expected_correct_uci):
        assert fen == item0.fen
        assert expected_correct_uci == item0.correct_move_uci
        return FakeResult()

    monkeypatch.setattr(service_module, "validate_and_apply", fake_validate_and_apply)

    res = submit_training_response(
        db_session,
        session_id=active_session.id,
        item_id=item0.id,
        move_uci="e2e5",
    )

    assert res.http_status == 200
    assert res.correct is False
    assert res.reason == "illegal or wrong move"
    assert res.fen_after is None
    assert res.error_message == "bad move"

    r = (
        db_session.query(TrainingResponse)
        .filter(TrainingResponse.item_id == item0.id)
        .one()
    )
    assert r.submitted_move_uci == "e2e5"
    assert r.is_correct is False


def test_submit_training_response_completes_when_all_items_answered(
    db_session, active_session, monkeypatch
):
    item0 = TrainingItem(
        session_id=active_session.id, order_index=0, fen="fen0", correct_move_uci="e2e4"
    )
    item1 = TrainingItem(
        session_id=active_session.id, order_index=1, fen="fen1", correct_move_uci="d2d4"
    )
    db_session.add_all([item0, item1])
    db_session.commit()
    db_session.refresh(item0)
    db_session.refresh(item1)
    db_session.refresh(active_session)

    # Pre-answer item1 so that after submitting item0, completion triggers.
    db_session.add(
        TrainingResponse(
            item_id=item1.id,
            submitted_move_uci="d2d4",
            is_correct=True,
            reason="correct",
            fen_after="after1",
        )
    )
    db_session.commit()

    class FakeResult:
        http_status = 200
        correct = True
        reason = "correct"
        fen_after = "after0"
        error_message = None

    def fake_validate_and_apply(*, fen, move_uci, expected_correct_uci):
        assert fen == item0.fen
        assert expected_correct_uci == item0.correct_move_uci
        return FakeResult()

    monkeypatch.setattr(service_module, "validate_and_apply", fake_validate_and_apply)

    res = submit_training_response(
        db_session,
        session_id=active_session.id,
        item_id=item0.id,
        move_uci="e2e4",
    )
    assert res.http_status == 200
    assert res.correct is True

    db_session.refresh(active_session)
    assert active_session.status == "completed"


def test_create_training_items_inserts_and_rejects_duplicate_order_index(
    db_session, active_session
):
    class TrainingItemCreate:
        def __init__(self, order_index, fen, correct_move_uci):
            self.order_index = order_index
            self.fen = fen
            self.correct_move_uci = correct_move_uci

    dup_items = [
        TrainingItemCreate(0, "fen0a", "e2e4"),
        TrainingItemCreate(0, "fen0b", "d2d4"),
    ]

    with pytest.raises(HTTPException) as excinfo:
        create_training_items(db_session, session_id=active_session.id, items=dup_items)

    assert excinfo.value.status_code == 400
    assert excinfo.value.detail == "Duplicate order_index"


def test_create_training_items_raises_404_when_session_not_found(db_session):
    class TrainingItemCreate:
        def __init__(self, order_index, fen, correct_move_uci):
            self.order_index = order_index
            self.fen = fen
            self.correct_move_uci = correct_move_uci

    items = [TrainingItemCreate(0, "fen0", "e2e4")]

    with pytest.raises(HTTPException) as excinfo:
        create_training_items(db_session, session_id=123456, items=items)

    assert excinfo.value.status_code == 404
    assert excinfo.value.detail == "Training session not found"


def test_create_training_items_raises_400_on_duplicate_order_index(
    db_session, active_session
):
    class TrainingItemCreate:
        def __init__(self, order_index, fen, correct_move_uci):
            self.order_index = order_index
            self.fen = fen
            self.correct_move_uci = correct_move_uci

    dup_items = [
        TrainingItemCreate(0, "fen0a", "e2e4"),
        TrainingItemCreate(0, "fen0b", "d2d4"),
    ]

    with pytest.raises(HTTPException) as excinfo:
        create_training_items(db_session, session_id=active_session.id, items=dup_items)

    assert excinfo.value.status_code == 400
    assert excinfo.value.detail == "Duplicate order_index"

def test_create_training_items_inserts_each_item_for_loop_runs(db_session, active_session):
    class TrainingItemCreate:
        def __init__(self, order_index, fen, correct_move_uci):
            self.order_index = order_index
            self.fen = fen
            self.correct_move_uci = correct_move_uci

    items = [
        TrainingItemCreate(0, "fen0", "e2e4"),
        TrainingItemCreate(1, "fen1", "d2d4"),
    ]

    n = create_training_items(db_session, session_id=active_session.id, items=items)
    assert n == 2

    rows = (
        db_session.query(TrainingItem)
        .filter(TrainingItem.session_id == active_session.id)
        .order_by(TrainingItem.order_index.asc())
        .all()
    )
    assert len(rows) == 2
    assert rows[0].fen == "fen0"
    assert rows[0].correct_move_uci == "e2e4"
    assert rows[1].fen == "fen1"
    assert rows[1].correct_move_uci == "d2d4"