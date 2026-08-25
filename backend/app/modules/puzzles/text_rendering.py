import chess

from backend.app.modules.puzzles.service import PuzzlePosition
from backend.app.modules.training.chess_rules import ValidationResult


def render_puzzle_next(pos: PuzzlePosition) -> str:
    board = chess.Board(pos.fen)
    lines = [
        f"Puzzle {pos.puzzle_id} (rating {pos.rating})",
        f"Themes: {pos.themes or '-'}",
        f"Move {pos.move_index + 1} of {pos.solver_moves_total}",
        "",
        str(board),
        "",
        f"Your move (UCI), e.g. POST /puzzles/{pos.puzzle_id}/attempts.text?moveUci=e2e4&moveIndex={pos.move_index}",
    ]
    return "\n".join(lines)


def render_puzzle_attempt(result: ValidationResult) -> str:
    lines = [
        "Correct!" if result.correct else "Incorrect.",
        result.reason,
    ]
    if result.fen_after:
        lines += ["", str(chess.Board(result.fen_after))]
    if result.puzzle_complete:
        lines += ["", "Puzzle complete."]
    elif result.next_correct_move_uci:
        lines += [
            "",
            "Keep going - submit your next move via .../attempts.text?moveUci=...&moveIndex=...",
        ]
    return "\n".join(lines)
