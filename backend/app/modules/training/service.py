# backend/app/modules/training/service.py
from dataclasses import dataclass
from sqlalchemy.orm import Session
from sqlalchemy import select, func
from fastapi import HTTPException
import chess

from backend.app.modules.training.models import (
    TrainingSession,
    TrainingItem,
    TrainingResponse,
)
from backend.app.modules.training.chess_rules import validate_and_apply
from backend.app.modules.openings.models import Opening

from typing import TYPE_CHECKING, List

if TYPE_CHECKING:
    from backend.app.routers.training import TrainingItemCreate


@dataclass
class SubmitResult:
    http_status: int
    correct: bool
    reason: str
    fen_after: str | None = None
    error_message: str | None = None


def create_training_session(db: Session, batch_size: int = 1) -> TrainingSession:
    # Deterministic
    opening = db.execute(
        select(Opening).order_by(Opening.eco.asc(), Opening.name.asc()).limit(1)
    ).scalar_one_or_none()

    # opening = db.scalar(
    #     select(Opening).where(Opening.name == "Amar Opening: Paris Gambit, Gent Gambit")
    # )

    # RANDO
    # opening = db.execute(
    #     select(Opening)
    #     .where(Opening.uci_moves.is_not(None))
    #     .order_by(func.random())
    #     .limit(1)
    # ).scalar_one_or_none()

    if not opening or not opening.uci_moves:
        raise HTTPException(status_code=404, detail="No openings found in database")

    moves = opening.uci_moves.split()

    if not moves:
        raise HTTPException(status_code=404, detail="No opening moves found")

    print(
        "CREATE_TRAINING_SESSION opening:",
        opening.eco,
        opening.name,
        "first_uci:",
        moves[0],
        "all_uci:",
        opening.uci_moves,
    )

    # 2) Build items from the opening dataset (fen from opening.epd)
    def can_apply(start_board: chess.Board) -> bool:
        b = start_board.copy()
        try:
            for m in moves:
                move = chess.Move.from_uci(m.strip())
                if move not in b.legal_moves:
                    return False
                b.push(move)
            return True
        except Exception:
            return False

    board = chess.Board(opening.epd) if opening.epd else chess.Board()
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


def get_current_training_item(db, training_session, all_items):
    if not all_items:
        return None

    last_item = all_items[-1]

    for item in all_items:
        exists_correct = (
            db.query(TrainingResponse)
            .filter(
                TrainingResponse.item_id == item.id,
                TrainingResponse.is_correct.is_(True),
            )
            .first()
        )
        print(
            "NEXT_ITEM check:",
            "item_id=",
            item.id,
            "exists_correct=",
            exists_correct is not None,
        )

        if exists_correct is None:
            return item

    # Everything is already correct: keep showing the last item's prompt instead of returning None
    print("NEXT_ITEM all correct -> returning last_item id=", None)
    return None


def submit_training_response(
    db: Session, session_id: int, item_id: int, move_uci: str
) -> SubmitResult:
    session = db.get(TrainingSession, session_id)
    if session is None:
        return SubmitResult(
            http_status=404,
            correct=False,
            reason="training session not found",
            fen_after=None,
            error_message="Training session not found.",
        )

    all_items = list(
        db.scalars(
            select(TrainingItem)
            .where(TrainingItem.session_id == session_id)
            .order_by(TrainingItem.order_index.asc())
        ).all()
    )

    print(
        "SESSION_ITEMS_COUNT",
        db.query(TrainingItem).filter(TrainingItem.session_id == session_id).count(),
    )
    print(
        "items_count_for_session_20=",
        db.query(TrainingItem).filter(TrainingItem.session_id == session_id).count(),
    )
    current = get_current_training_item(
        db, training_session=session, all_items=all_items
    )
    if current is None:
        # If all items are already answered, the session is complete; return a completion-specific message.
        all_items_responded = all(
            db.query(TrainingResponse)
            .filter(
                TrainingResponse.item_id == it.id,
                TrainingResponse.is_correct.is_(True),
            )
            .first()
            is not None
            for it in all_items
        )

        if all_items_responded:
            return SubmitResult(
                http_status=404,
                correct=False,
                reason="training session completed",
                fen_after=None,
                error_message="Training session already completed.",
            )

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

    print(
        "SUBMIT_DEBUG",
        "item_id=",
        current.id,
        "expected_correct_move_uci=",
        current.correct_move_uci,
        "submitted_move_uci=",
        move_uci,
    )

    result = validate_and_apply(
        fen=current.fen,
        move_uci=move_uci,
        expected_correct_uci=current.correct_move_uci,
    )

    print(
        "TRAIN_VALIDATE",
        "session_id=",
        session_id,
        "item_id=",
        current.id,
        "fen_before=",
        current.fen,
        "submitted_move_uci=",
        move_uci.strip(),
        "expected_correct_uci=",
        current.correct_move_uci,
        "result_correct=",
        result.correct,
        "reason=",
        result.reason,
        "fen_after=",
        result.fen_after,
    )

    existing = (
        db.query(TrainingResponse)
        .filter(TrainingResponse.item_id == current.id)
        .first()
    )

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


def create_training_items(
    db: Session, session_id: int, items: List["TrainingItemCreate"]
) -> int:
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
