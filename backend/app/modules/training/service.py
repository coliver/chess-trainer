from dataclasses import dataclass
from sqlalchemy.orm import Session
from sqlalchemy import select

from backend.app.modules.training.models import TrainingSession, TrainingItem, TrainingResponse
from backend.app.modules.training.chess_rules import validate_and_apply

# MVP: static first item(s). Later, replace with openings dataset selection.
MVP_ITEMS = [
    # Example: starting position, best reply e4 is legal
    {
        "fen": "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
        "correct_move_uci": "e2e4",
    }
]

@dataclass
class SubmitResult:
    http_status: int
    correct: bool
    reason: str
    fen_after: str | None = None
    error_message: str | None = None

def create_training_session(db: Session, batch_size: int = 1) -> TrainingSession:
    session = TrainingSession(status="active")
    db.add(session)
    db.flush()  # get session.id

    items = MVP_ITEMS[:batch_size]
    for idx, it in enumerate(items):
        db.add(
            TrainingItem(
                session_id=session.id,
                order_index=idx,
                fen=it["fen"],
                correct_move_uci=it["correct_move_uci"],
            )
        )

    db.commit()
    db.refresh(session)
    return session

def get_next_training_item(db: Session, session_id: int) -> TrainingItem | None:
    stmt = (
        select(TrainingItem)
        .where(TrainingItem.session_id == session_id)
        .order_by(TrainingItem.order_index.asc())
    )
    items = list(db.scalars(stmt).all())
    if not items:
        return None

    for item in items:
        exists = db.query(TrainingResponse).filter(TrainingResponse.item_id == item.id).first()
        if exists is None:
            return item

    # all items already responded; return first item deterministically
    return items[0]


def submit_training_response(db: Session, session_id: int, move_uci: str) -> SubmitResult:
    session = db.get(TrainingSession, session_id)
    if session is None:
        return SubmitResult(
            http_status=404,
            correct=False,
            reason="training session not found",
            fen_after=None,
            error_message="Training session not found.",
        )

    item = get_next_training_item(db, session_id=session_id)
    if item is None:
        return SubmitResult(
            http_status=404,
            correct=False,
            reason="training item not found",
            fen_after=None,
            error_message="Training items not found for this session.",
        )

    result = validate_and_apply(
        fen=item.fen,
        move_uci=move_uci,
        expected_correct_uci=item.correct_move_uci,
    )

    db.add(
        TrainingResponse(
            item_id=item.id,
            submitted_move_uci=move_uci.strip(),
            is_correct=result.correct,
            reason=result.reason,
            fen_after=result.fen_after,
        )
    )

    all_items = list(db.scalars(
        select(TrainingItem)
        .where(TrainingItem.session_id == session_id)
        .order_by(TrainingItem.order_index.asc())
    ).all())

    all_responded = all(
        db.query(TrainingResponse).filter(TrainingResponse.item_id == it.id).first() is not None
        for it in all_items
    )
    if all_responded:
        session.status = "completed"

    db.commit()
    return SubmitResult(
        http_status=result.http_status,
        correct=result.correct,
        reason=result.reason,
        fen_after=result.fen_after,
        error_message=result.error_message,
    )
