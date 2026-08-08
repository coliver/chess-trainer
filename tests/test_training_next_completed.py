from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from fastapi.testclient import TestClient


def test_get_next_after_completion_does_not_fallback(tmp_path):
    # Self-contained: isolated SQLite DB with the app's schema, and point the
    # app's get_db at it, so the test needs no external Postgres / seeded user.
    from backend.app.modules.shared.db import Base, get_db
    from backend.app.modules.training.models import (
        TrainingSession,
        TrainingItem,
        TrainingResponse,
    )
    from backend.app.app import app

    engine = create_engine(f"sqlite+pysqlite:///{tmp_path / 'test.sqlite'}")
    Base.metadata.create_all(bind=engine)
    db = sessionmaker(bind=engine)()

    app.dependency_overrides[get_db] = lambda: db
    client = TestClient(app)
    try:
        session = TrainingSession(status="active", user_id=1)
        db.add(session)
        db.flush()

        # two items
        item1 = TrainingItem(
            session_id=session.id,
            order_index=0,
            fen="rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
            correct_move_uci="e2e4",
        )
        item2 = TrainingItem(
            session_id=session.id,
            order_index=1,
            fen="rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
            correct_move_uci="d2d4",
        )
        db.add_all([item1, item2])
        db.flush()

        # mark both answered => session should be completed
        db.add_all(
            [
                TrainingResponse(
                    item_id=item1.id,
                    submitted_move_uci="e2e4",
                    is_correct=True,
                    reason="ok",
                    fen_after=None,
                ),
                TrainingResponse(
                    item_id=item2.id,
                    submitted_move_uci="d2d4",
                    is_correct=True,
                    reason="ok",
                    fen_after=None,
                ),
            ]
        )
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
        app.dependency_overrides.pop(get_db, None)
