from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker


def test_submit_response_non_current_item_id_returns_404(tmp_path):
    # Self-contained: build an isolated SQLite DB with the app's schema so the
    # test needs no external Postgres and no pre-existing user row.
    from backend.app.modules.shared.db import Base
    from backend.app.modules.training.models import (
        TrainingItem,
        TrainingResponse,
        TrainingSession,
    )
    from backend.app.modules.training.service import submit_training_response

    engine = create_engine(f"sqlite+pysqlite:///{tmp_path / 'test.sqlite'}")
    Base.metadata.create_all(bind=engine)
    db = sessionmaker(bind=engine)()
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
            item_id=item1.id,  # NOT the current item
            move_uci="thiswon'tbeparsedbutshouldnotmatter",
            current_user_id=1,
        )

        assert res.http_status == 404
    finally:
        db.close()
