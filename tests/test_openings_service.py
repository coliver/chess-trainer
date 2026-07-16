# tests/test_openings_service_get_prompt_and_move.py
import pytest
import chess
from sqlalchemy import select

from backend.app.modules.openings.service import get_prompt_and_move
from backend.app.modules.openings.models import Opening


class _FakeResult:
    def __init__(self, opening):
        self._opening = opening

    def scalar_one_or_none(self):
        return self._opening


class FakeDB:
    def __init__(self, openings_by_eco: dict[str, Opening | None]):
        self._openings_by_eco = openings_by_eco

    def execute(self, stmt):
        # Extract the literal ECO value from:
        # select(Opening).where(Opening.eco == eco)
        eco = None
        where_criteria = list(getattr(stmt, "_where_criteria", []))
        if where_criteria:
            crit = where_criteria[0]
            right = getattr(crit, "right", None)
            eco = getattr(right, "value", None)

        return _FakeResult(self._openings_by_eco.get(eco))


def test_get_prompt_and_move_returns_correct_fen_and_uci():
    epd = chess.Board().fen()
    opening = Opening(
        eco="A00",
        uci_moves="e2e4 e7e5 g1f3",
        epd=epd,
    )
    db = FakeDB({"A00": opening})

    fen, correct = get_prompt_and_move("A00", move_index=1, db=db)

    b = chess.Board(epd)
    b.push_uci("e2e4")  # prompt position is after move_index moves
    assert fen == b.fen()
    assert correct == "e7e5"


def test_get_prompt_and_move_missing_opening_raises():
    db = FakeDB({"A00": None})

    with pytest.raises(ValueError) as e:
        get_prompt_and_move("A00", move_index=0, db=db)

    assert "Opening with ECO A00 not found" in str(e.value)


def test_get_prompt_and_move_no_uci_moves_raises():
    opening = Opening(eco="A00", uci_moves=None, epd=chess.Board().fen())
    db = FakeDB({"A00": opening})

    with pytest.raises(ValueError) as e:
        get_prompt_and_move("A00", move_index=0, db=db)

    assert "not found or has no moves" in str(e.value)


def test_get_prompt_and_move_negative_index_raises():
    opening = Opening(eco="A00", uci_moves="e2e4", epd=chess.Board().fen())
    db = FakeDB({"A00": opening})

    with pytest.raises(ValueError) as e:
        get_prompt_and_move("A00", move_index=-1, db=db)

    assert "Move index -1 is out of range" in str(e.value)


def test_get_prompt_and_move_index_out_of_range_raises():
    opening = Opening(eco="A00", uci_moves="e2e4", epd=chess.Board().fen())
    db = FakeDB({"A00": opening})

    with pytest.raises(ValueError) as e:
        get_prompt_and_move("A00", move_index=1, db=db)

    assert "Move index 1 is out of range" in str(e.value)
