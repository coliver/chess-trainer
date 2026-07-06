import os
from fastapi.testclient import TestClient

def setup_db_sqlite(tmp_path):
    db_file = tmp_path / "test.sqlite"
    os.environ["DATABASE_URL"] = f"sqlite+pysqlite:///{db_file}"

    from backend.app.modules.shared import db as shared_db
    return shared_db

def test_get_next_after_completion_does_not_fallback(tmp_path):
    shared_db = setup_db_sqlite(tmp_path)

    from backend.app.modules.training.models import (
        TrainingSession, TrainingItem, TrainingResponse
    )
    from backend.app.app import app

    shared_db.Base.metadata.create_all(bind=shared_db.engine)

    client = TestClient(app)

    db = shared_db.SessionLocal()
    try:
        session = TrainingSession(status="active")
        db.add(session)
        db.flush()

        # two items
        item1 = TrainingItem(
            session_id=session.id, order_index=0,
            fen="rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
            correct_move_uci="e2e4",
        )
        item2 = TrainingItem(
            session_id=session.id, order_index=1,
            fen="rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
            correct_move_uci="d2d4",
        )
        db.add_all([item1, item2])
        db.flush()

        # mark both answered => session should be completed
        db.add_all([
            TrainingResponse(item_id=item1.id, submitted_move_uci="e2e4", is_correct=True, reason="ok", fen_after=None),
            TrainingResponse(item_id=item2.id, submitted_move_uci="d2d4", is_correct=True, reason="ok", fen_after=None),
        ])
        session.status = "completed"
        db.commit()

        res = client.get(f"/api/training-sessions/{session.id}/next")
        assert res.status_code in (200, 404)

        # key check: it must not return a "fallback" unanswered item
        # (i.e., response should not include an item_id)
        data = res.json()
        assert "item_id" not in data
    finally:
        db.close()
