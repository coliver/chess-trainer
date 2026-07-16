import os

def setup_db_sqlite(tmp_path):
    # Must be set BEFORE importing anything that reads DATABASE_URL at import-time.
    db_file = tmp_path / "test.sqlite"
    os.environ["DATABASE_URL"] = f"sqlite+pysqlite:///{db_file}"

    from backend.app.modules.shared import db as shared_db
    return shared_db

def test_submit_response_non_current_item_id_returns_404(tmp_path):
    shared_db = setup_db_sqlite(tmp_path)

    # Imports after DATABASE_URL is set
    from sqlalchemy.orm import Session
    from backend.app.modules.training.models import TrainingSession, TrainingItem, TrainingResponse
    from backend.app.modules.training.service import submit_training_response

    # Create schema
    shared_db.Base.metadata.create_all(bind=shared_db.engine)

    db: Session = shared_db.SessionLocal()
    try:
        # Session + two items
        session = TrainingSession(status="active", user_id=1)
        db.add(session)
        db.flush()

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

        # Mark item1 responded => current should be item2
        db.add(
            TrainingResponse(
                item_id=item1.id,
                submitted_move_uci="e2e4",
                is_correct=True,
                reason="ok",
                fen_after=None,
            )
        )
        db.commit()

        # Submit response for non-current item1 => expect 404
        res = submit_training_response(
            db=db,
            session_id=session.id,
            item_id=item1.id,     # NOT the current item
            move_uci="thiswon'tbeparsedbutshouldnotmatter",
        )

        assert res.http_status == 404
    finally:
        db.close()
