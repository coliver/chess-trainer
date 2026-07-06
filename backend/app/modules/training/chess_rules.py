import chess
from dataclasses import dataclass
from typing import Optional

@dataclass
class ValidationResult:
    http_status: int
    correct: bool
    reason: str
    fen_after: Optional[str] = None
    error_message: Optional[str] = None

def parse_move_uci(move_uci: str) -> chess.Move:
    return chess.Move.from_uci(move_uci.strip())

def validate_and_apply(fen: str, move_uci: str, expected_correct_uci: str) -> ValidationResult:
    board = chess.Board(fen)

    try:
        move = parse_move_uci(move_uci)
    except Exception:
        return ValidationResult(
            http_status=400,
            correct=False,
            reason="invalid move_uci",
            fen_after=None,
            error_message="Invalid move_uci; must be a valid UCI string.",
        )

    if move not in board.legal_moves:
        return ValidationResult(
            http_status=200,
            correct=False,
            reason="illegal move",
            fen_after=None,
        )

    board.push(move)
    fen_after = board.fen()

    if move_uci.strip() == expected_correct_uci:
        return ValidationResult(
            http_status=200,
            correct=True,
            reason="correct move",
            fen_after=fen_after,
        )

    return ValidationResult(
        http_status=200,
        correct=False,
        reason="wrong move",
        fen_after=fen_after,
    )
