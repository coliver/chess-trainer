from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import select

from backend.app.modules.shared.db import get_db
from backend.app.modules.openings.models import Opening

router = APIRouter(prefix="", tags=["openings"])


@router.get("/openings")
def list_openings(db: Session = Depends(get_db)):
    rows = (
        db.execute(
            select(Opening)
            .where(Opening.uci_moves.is_not(None))
            .where(Opening.name.is_not(None))
            .order_by(Opening.eco.asc(), Opening.name.asc())
        )
        .scalars()
        .all()
    )

    return [
        {
            "name": o.name,
            "eco": o.eco,
        }
        for o in rows
    ]
