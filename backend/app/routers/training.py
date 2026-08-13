# /backend/app/routers/training.py
from pydantic import BaseModel, ConfigDict

from backend.app.utils import to_camel


class CamelModel(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)


from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from backend.app.modules.training.models import TrainingItem, TrainingSession

router = APIRouter()

from backend.app.modules.shared.db import get_db
from backend.app.modules.training.service import (
    create_training_items,
    create_training_session,
    get_current_training_item,
    submit_training_response,
)
from backend.app.routers.auth import get_current_user


class TrainingSessionCreateRequest(CamelModel):
    opening_name: str | None = None
    opening_eco: str | None = None


class TrainingSessionCreateResponse(CamelModel):
    id: int


class TrainingNextResponse(CamelModel):
    session_id: int
    item_id: int
    order_index: int
    fen: str
    move_count_limit: int | None = None
    opening_eco: str
    opening_name: str
    correct_move_uci: str


class MoveResponseRequest(CamelModel):
    move_uci: str
    item_id: int


class MoveResponseResponse(CamelModel):
    correct: bool
    reason: str
    fen_after: str | None = None
    session_completed: bool = False


class TrainingItemCreate(CamelModel):
    order_index: int
    fen: str
    correct_move_uci: str


class TrainingItemsCreateResponse(CamelModel):
    created: int
    session_id: int


@router.post("/training-sessions", response_model=TrainingSessionCreateResponse)
def post_training_sessions(
    req: TrainingSessionCreateRequest,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    session = create_training_session(
        db,
        current_user.id,
        opening_eco=req.opening_eco,
        opening_name=req.opening_name,
    )
    return {"id": session.id}


@router.get("/training-sessions/{id}/next", response_model=TrainingNextResponse)
def get_training_next(
    id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    training_session = db.get(TrainingSession, id)
    if training_session is None or training_session.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Training session not found")

    all_items = list(
        db.scalars(
            select(TrainingItem)
            .where(TrainingItem.session_id == id)
            .order_by(TrainingItem.order_index.asc())
        ).all()
    )

    item = get_current_training_item(db, training_session=training_session, all_items=all_items)
    if item is None:
        raise HTTPException(status_code=404, detail="No current training item")

    return TrainingNextResponse(
        session_id=item.session_id,
        item_id=item.id,
        order_index=item.order_index,
        fen=item.fen,
        move_count_limit=None,
        opening_eco=training_session.opening_eco,
        opening_name=training_session.opening_name,
        correct_move_uci=item.correct_move_uci,
    )


@router.post(
    "/training-sessions/{id}/responses",
    response_model=MoveResponseResponse,
    status_code=status.HTTP_200_OK,
)
def post_training_response(
    id: int,
    req: MoveResponseRequest,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    training_session = db.get(TrainingSession, id)
    if training_session is None or training_session.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Training session not found")

    result = submit_training_response(
        db,
        session_id=id,
        item_id=req.item_id,
        move_uci=req.move_uci,
        current_user_id=current_user.id,
    )
    if result.http_status == 400:
        raise HTTPException(status_code=400, detail=result.error_message)
    if result.http_status == 404:
        raise HTTPException(status_code=404, detail=result.error_message or result.reason)

    return MoveResponseResponse(
        correct=result.correct,
        reason=result.reason,
        fen_after=result.fen_after,
        session_completed=result.session_completed,
    )


@router.post(
    "/training-sessions/{id}/items",
    response_model=TrainingItemsCreateResponse,
    status_code=status.HTTP_200_OK,
)
def post_training_items(
    id: int,
    items: list[TrainingItemCreate],
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    training_session = db.get(TrainingSession, id)
    if training_session is None or training_session.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Training session not found")

    if training_session.opening_eco is None or training_session.opening_name is None:
        raise HTTPException(
            status_code=400,
            detail="Training session not initialized. Create it via POST /training-sessions first.",
        )

    created = create_training_items(db=db, session_id=id, items=items)
    return TrainingItemsCreateResponse(created=created, session_id=id)
