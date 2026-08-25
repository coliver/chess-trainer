import chess

from backend.app.modules.puzzles.service import PuzzlePosition
from backend.app.modules.shared.ansi import (
    BG_DARK_SQUARE,
    BG_LIGHT_SQUARE,
    FG_BLACK_PIECE,
    FG_GOLD,
    FG_GREEN,
    FG_RED,
    FG_WHITE_PIECE,
    sgr,
)
from backend.app.modules.training.chess_rules import ValidationResult

# Filled glyphs only (not the outline set) - foreground color already carries
# white/black, and outline glyphs are nearly invisible on a dark terminal bg.
_UNICODE_PIECES = {
    "k": "♚",
    "q": "♛",
    "r": "♜",
    "b": "♝",
    "n": "♞",
    "p": "♟",
}


def render_board(board: chess.Board, ansi: bool = True) -> str:
    """Render a Board with alternating light/dark square backgrounds and
    white/black piece foregrounds, so the board reads at a glance in a
    color terminal instead of parsing bare glyphs. Falls back to plain
    ASCII letters (no unicode, no color) when ansi=False, since the unicode
    glyphs lean on foreground color to distinguish white from black."""
    rows = []
    for rank in range(7, -1, -1):
        squares = []
        for file in range(8):
            piece = board.piece_at(chess.square(file, rank))
            bg = BG_LIGHT_SQUARE if (rank + file) % 2 == 0 else BG_DARK_SQUARE
            if piece is None:
                squares.append(sgr("  ", bg))
                continue
            fg = FG_WHITE_PIECE if piece.color == chess.WHITE else FG_BLACK_PIECE
            glyph = _UNICODE_PIECES[piece.symbol().lower()] if ansi else piece.symbol()
            squares.append(sgr(f" {glyph}", bg, fg))
        rows.append("".join(squares))
    return "\n".join(rows)


def render_puzzle_next(pos: PuzzlePosition, ansi: bool = True) -> str:
    board = chess.Board(pos.fen)
    lines = [
        sgr(f"Puzzle {pos.puzzle_id} (rating {pos.rating})", FG_GOLD),
        f"Themes: {pos.themes or '-'}",
        f"Move {pos.move_index + 1} of {pos.solver_moves_total}",
        "",
        render_board(board, ansi),
        "",
        f"Your move (UCI), e.g. POST /puzzles/{pos.puzzle_id}/attempts.text?moveUci=e2e4&moveIndex={pos.move_index}",
    ]
    return "\n".join(lines)


def render_puzzle_attempt(result: ValidationResult, ansi: bool = True) -> str:
    headline = sgr("Correct!", FG_GREEN) if result.correct else sgr("Incorrect.", FG_RED)
    lines = [
        headline,
        result.reason,
    ]
    if result.fen_after:
        lines += ["", render_board(chess.Board(result.fen_after), ansi)]
    if result.puzzle_complete:
        lines += ["", sgr("Puzzle complete.", FG_GREEN)]
    elif result.next_correct_move_uci:
        lines += [
            "",
            "Keep going - submit your next move via .../attempts.text?moveUci=...&moveIndex=...",
        ]
    return "\n".join(lines)
