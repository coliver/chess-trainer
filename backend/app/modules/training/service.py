# backend/app/modules/training/service.py
import logging
from dataclasses import dataclass
from typing import TYPE_CHECKING

import chess
from fastapi import HTTPException
from sqlalchemy import and_, func, select
from sqlalchemy.orm import Session

from backend.app.modules.openings.models import Opening
from backend.app.modules.progress.service import get_due, record_attempt
from backend.app.modules.training.chess_rules import validate_and_apply
from backend.app.modules.training.models import (
    TrainingItem,
    TrainingResponse,
    TrainingSession,
)

if TYPE_CHECKING:
    from backend.app.routers.training import TrainingItemCreate

logger = logging.getLogger(__name__)


@dataclass
class SubmitResult:
    http_status: int
    correct: bool
    reason: str
    fen_after: str | None = None
    error_message: str | None = None
    session_completed: bool = False


def create_training_session(
    db: Session, user_id: int, opening_eco: str, opening_name: str, batch_size: int = 1
) -> TrainingSession:
    if opening_name and opening_eco:
        opening = db.execute(
            select(Opening)
            .where(Opening.eco == opening_eco)
            .where(Opening.name == opening_name)
            .where(Opening.uci_moves.is_not(None))
            .limit(1)
        ).scalar_one_or_none()
    else:
        opening = db.execute(
            select(Opening)
            .outerjoin(
                TrainingSession,
                and_(
                    TrainingSession.user_id == user_id,
                    TrainingSession.opening_eco == Opening.eco,
                    TrainingSession.opening_name == Opening.name,
                ),
            )
            .where(Opening.uci_moves.is_not(None))
            .where(Opening.eco.is_not(None))
            .where(Opening.name.is_not(None))
            .where(TrainingSession.id.is_(None))
            .order_by(func.random())
            .limit(1)
        ).scalar_one_or_none()

    if not opening or not opening.uci_moves:
        raise HTTPException(status_code=404, detail="No openings found in database")

    moves = opening.uci_moves.split()
    if not moves:
        raise HTTPException(status_code=404, detail="No opening moves found")

    def can_apply(start_board: chess.Board) -> bool:
        b = start_board.copy()
        try:
            for m in moves:
                move = chess.Move.from_uci(m.strip())
                if move not in b.legal_moves:
                    return False
                b.push(move)
            return True
        except ValueError:
            return False

    def epd_to_fen(epd: str) -> str:
        s = epd.split("|", 1)[0].split(";", 1)[0].strip()
        return s

    clean_epd = None
    if opening.epd:
        clean_epd = epd_to_fen(opening.epd)

    board = chess.Board(clean_epd) if clean_epd else chess.Board()

    if not can_apply(board):
        initial = chess.Board()
        if can_apply(initial):
            board = initial
        else:
            raise HTTPException(
                status_code=500,
                detail=(
                    f"Opening dataset inconsistent for {opening.eco}/{opening.name}: "
                    f"opening.epd does not match the move sequence (and initial position also fails)"
                ),
            )

    session = TrainingSession(
        status="active",
        opening_eco=opening.eco,
        opening_name=opening.name,
        user_id=user_id,
    )
    db.add(session)
    db.flush()

    for idx, move_uci in enumerate(moves):
        current_fen = board.fen()

        move = chess.Move.from_uci(move_uci.strip())
        if move not in board.legal_moves:
            raise HTTPException(
                status_code=500,
                detail=(
                    f"Dataset mismatch at {opening.eco}/{opening.name} idx={idx} "
                    f"fen_before={current_fen} move={move_uci} err=illegal move for position"
                ),
            )

        db.add(
            TrainingItem(
                session_id=session.id,
                order_index=idx,
                fen=current_fen,
                correct_move_uci=move_uci,
            )
        )

        board.push(move)

    db.commit()
    db.refresh(session)
    return session


def create_session_from_due(db: Session, user_id: int, limit: int = 10) -> TrainingSession:
    """Start a review session seeded directly from the user's due positions."""
    due_rows = get_due(db, user_id)[:limit]
    if not due_rows:
        raise HTTPException(status_code=404, detail="No positions due for review")

    # opening_eco/opening_name form a composite FK into the openings table, so a
    # synthetic "Review" session (spanning positions from many openings) must leave
    # both unset rather than reference a single due row's opening.
    session = TrainingSession(
        status="active",
        opening_eco=None,
        opening_name="Review",
        user_id=user_id,
    )
    db.add(session)
    db.flush()

    for idx, row in enumerate(due_rows):
        db.add(
            TrainingItem(
                session_id=session.id,
                order_index=idx,
                fen=row.fen,
                correct_move_uci=row.correct_move_uci,
            )
        )

    db.commit()
    db.refresh(session)
    return session


def get_current_training_item(db, training_session, all_items):
    if not all_items:
        return None

    for item in all_items:
        exists_correct = (
            db.query(TrainingResponse)
            .filter(
                TrainingResponse.item_id == item.id,
                TrainingResponse.is_correct.is_(True),
            )
            .first()
        )

        if exists_correct is None:
            return item

    return None


def submit_training_response(
    db: Session,
    session_id: int,
    item_id: int,
    move_uci: str,
    current_user_id: int,
) -> SubmitResult:
    session = db.get(TrainingSession, session_id)
    if session is None or session.user_id != current_user_id:
        return SubmitResult(
            http_status=404,
            correct=False,
            reason="training session not found",
            fen_after=None,
            error_message="Training session not found.",
        )

    # Ensure the item belongs to this session
    current_item = db.get(TrainingItem, item_id)
    if current_item is None or current_item.session_id != session_id:
        return SubmitResult(
            http_status=404,
            correct=False,
            reason="training item not found",
            fen_after=None,
            error_message="Training item not found.",
        )

    all_items = list(
        db.scalars(
            select(TrainingItem)
            .where(TrainingItem.session_id == session_id)
            .order_by(TrainingItem.order_index.asc())
        ).all()
    )

    current = get_current_training_item(db, training_session=session, all_items=all_items)
    if current is None:
        return SubmitResult(
            http_status=404,
            correct=False,
            reason="training item not found",
            fen_after=None,
            error_message="Training items not found for this session.",
        )

    if current.id != item_id:
        return SubmitResult(
            http_status=404,
            correct=False,
            reason="training item not found",
            fen_after=None,
            error_message="Training item not found.",
        )

    result = validate_and_apply(
        fen=current.fen,
        move_uci=move_uci,
        expected_correct_uci=current.correct_move_uci,
    )

    existing = db.query(TrainingResponse).filter(TrainingResponse.item_id == current.id).first()

    if existing:
        existing.submitted_move_uci = move_uci.strip()
        existing.is_correct = result.correct
        existing.reason = result.reason
        existing.fen_after = result.fen_after
    else:
        db.add(
            TrainingResponse(
                item_id=current.id,
                submitted_move_uci=move_uci.strip(),
                is_correct=result.correct,
                reason=result.reason,
                fen_after=result.fen_after,
            )
        )

    db.flush()

    try:
        with db.begin_nested():
            record_attempt(
                db,
                user_id=current_user_id,
                fen=current.fen,
                correct_move_uci=current.correct_move_uci,
                is_correct=result.correct,
                opening_eco=session.opening_eco,
                opening_name=session.opening_name,
            )
    except Exception:
        logger.exception(
            "record_attempt failed for user_id=%s item_id=%s", current_user_id, item_id
        )

    all_responded = all(
        db.query(TrainingResponse)
        .filter(
            TrainingResponse.item_id == it.id,
            TrainingResponse.is_correct.is_(True),
        )
        .first()
        is not None
        for it in all_items
    )
    session_completed = all_responded

    if session_completed:
        session.status = "completed"

    db.commit()
    return SubmitResult(
        http_status=result.http_status,
        correct=result.correct,
        reason=result.reason,
        fen_after=result.fen_after,
        error_message=result.error_message,
        session_completed=session_completed,
    )


def create_training_items(db: Session, session_id: int, items: list["TrainingItemCreate"]) -> int:
    session = db.get(TrainingSession, session_id)
    if session is None:
        raise HTTPException(status_code=404, detail="Training session not found")

    payload_order_indexes = [it.order_index for it in items]
    if len(payload_order_indexes) != len(set(payload_order_indexes)):
        raise HTTPException(status_code=400, detail="Duplicate order_index")

    for it in items:
        db.add(
            TrainingItem(
                session_id=session.id,
                order_index=it.order_index,
                fen=it.fen,
                correct_move_uci=it.correct_move_uci,
            )
        )

    db.commit()
    return len(items)
