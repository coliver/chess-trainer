from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from backend.app.modules.shared.db import get_db
from backend.app.modules.training.service import (
    create_training_session,
    get_next_training_item,
    submit_training_response,
)

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

class MoveResponseResponse(BaseModel):
    correct: bool
    reason: str
    fen_after: str | None = None

@router.post("/training-sessions", response_model=TrainingSessionCreateResponse)
def post_training_sessions(db: Session = Depends(get_db)):
    session = create_training_session(db)
    return {"id": session.id}

@router.get("/training-sessions/{id}/next", response_model=TrainingNextResponse)
def get_training_next(id: int, db: Session = Depends(get_db)):
    item = get_next_training_item(db, session_id=id)
    return {
        "session_id": item.session_id,
        "item_id": item.id,
        "order_index": item.order_index,
        "fen": item.fen,
        "move_count_limit": None,
    }

@router.post(
    "/training-sessions/{id}/responses",
    response_model=MoveResponseResponse,
    status_code=status.HTTP_200_OK,
)
def post_training_response(id: int, req: MoveResponseRequest, db: Session = Depends(get_db)):
    result = submit_training_response(db, session_id=id, move_uci=req.move_uci)
    if result.http_status == 400:
        raise HTTPException(status_code=400, detail=result.error_message)
    if result.http_status == 404:
        raise HTTPException(status_code=404, detail=result.error_message or result.reason)

    return MoveResponseResponse(
        correct=result.correct,
        reason=result.reason,
        fen_after=result.fen_after,
    )
