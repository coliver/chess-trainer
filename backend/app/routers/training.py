from sqlalchemy import select
from backend.app.modules.training.models import TrainingItem, TrainingSession

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import List
from backend.app.modules.shared.db import get_db
from backend.app.modules.training.service import (
    create_training_session,
    get_current_training_item,
    submit_training_response,
    create_training_items,
)
from backend.app.routers.auth import get_current_user
router = APIRouter()


class TrainingSessionCreateResponse(BaseModel):
    id: int


class TrainingNextResponse(BaseModel):
    session_id: int
    item_id: int
    order_index: int
    fen: str
    move_count_limit: int | None = None


class MoveResponseRequest(BaseModel):
    move_uci: str
    item_id: int


class MoveResponseResponse(BaseModel):
    correct: bool
    reason: str
    fen_after: str | None = None


class TrainingItemCreate(BaseModel):
    order_index: int
    fen: str
    correct_move_uci: str


class TrainingItemsCreateResponse(BaseModel):
    created: int
    session_id: int


@router.post("/training-sessions", response_model=TrainingSessionCreateResponse)
def post_training_sessions(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    session = create_training_session(db)
    return {"id": session.id}

@router.get("/training-sessions/{id}/next", response_model=TrainingNextResponse)
def get_training_next(id: int, db: Session = Depends(get_db)):
    training_session = db.get(TrainingSession, id)
    if training_session is None:
        raise HTTPException(status_code=404, detail="Training session not found")

    all_items = list(
        db.scalars(
            select(TrainingItem)
            .where(TrainingItem.session_id == id)
            .order_by(TrainingItem.order_index.asc())
        ).all()
    )

    item = get_current_training_item(
        db, training_session=training_session, all_items=all_items
    )
    if item is None:
        raise HTTPException(status_code=404, detail="No current training item")

    return TrainingNextResponse(
        session_id=item.session_id,
        item_id=item.id,
        order_index=item.order_index,
        fen=item.fen,
        move_count_limit=None,
    )


@router.post(
    "/training-sessions/{id}/responses",
    response_model=MoveResponseResponse,
    status_code=status.HTTP_200_OK,
)
def post_training_response(
    id: int, req: MoveResponseRequest, db: Session = Depends(get_db)
):
    result = submit_training_response(
        db, session_id=id, item_id=req.item_id, move_uci=req.move_uci
    )
    if result.http_status == 400:
        raise HTTPException(status_code=400, detail=result.error_message)
    if result.http_status == 404:
        raise HTTPException(
            status_code=404, detail=result.error_message or result.reason
        )

    return MoveResponseResponse(
        correct=result.correct,
        reason=result.reason,
        fen_after=result.fen_after,
    )


@router.post(
    "/training-sessions/{id}/items",
    response_model=TrainingItemsCreateResponse,
    status_code=status.HTTP_200_OK,
)
def post_training_items(
    id: int,
    items: List[TrainingItemCreate],
    db: Session = Depends(get_db),
):
    created = create_training_items(db=db, session_id=id, items=items)
    return TrainingItemsCreateResponse(created=created, session_id=id)
