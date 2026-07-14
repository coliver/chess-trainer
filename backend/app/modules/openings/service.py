# backend/app/modules/openings/service.py
from sqlalchemy import select
from backend.app.modules.shared.db import get_db
from backend.app.modules.openings.models import OpeningPosition, OpeningTransition

def get_prompt_and_move(position_id: int, db):
    """Return (fen, correct_move_uci) for the given opening position."""
    # fetch the position row
    pos = db.execute(
        select(OpeningPosition).where(OpeningPosition.id == position_id)
    ).scalar_one_or_none()
    if not pos:
        raise ValueError("Position not found")

    # fetch the *single* expected move – for MVP we store exactly one transition per position
    trans = db.execute(
        select(OpeningTransition).where(OpeningTransition.from_position_id == position_id)
    ).scalar_one_or_none()
    if not trans:
        raise ValueError("No transition defined for this position")

    return pos.fen, trans.move_uci
