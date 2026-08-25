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

# Many terminal fonts render the filled glyphs with their own fixed
# black/white fill and ignore (or only partly honor) the ANSI foreground
# color, so relying on color alone leaves black vs white indistinguishable.
# Use the outline set for white and the filled set for black so the glyph
# shape itself carries the distinction, with FG color as reinforcement.
_UNICODE_PIECES_WHITE = {
    "k": "♔",
    "q": "♕",
    "r": "♖",
    "b": "♗",
    "n": "♘",
    "p": "♙",
}
_UNICODE_PIECES_BLACK = {
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
                squares.append(sgr("   ", bg))
                continue
            symbol = piece.symbol().lower()
            if ansi:
                fg = FG_WHITE_PIECE if piece.color == chess.WHITE else FG_BLACK_PIECE
                glyphs = (
                    _UNICODE_PIECES_WHITE if piece.color == chess.WHITE else _UNICODE_PIECES_BLACK
                )
                glyph = glyphs[symbol]
                squares.append(sgr(f" {glyph} ", bg, fg))
            else:
                squares.append(sgr(f" {piece.symbol()} ", bg))
        rows.append("".join(squares))
    return "\n".join(rows)


def render_puzzle_next(pos: PuzzlePosition, ansi: bool = True) -> str:
    board = chess.Board(pos.fen)
    to_move = "White" if board.turn == chess.WHITE else "Black"
    lines = [
        sgr(f"Puzzle {pos.puzzle_id} (rating {pos.rating})", FG_GOLD),
        f"Themes: {pos.themes or '-'}",
        f"Move {pos.move_index + 1} of {pos.solver_moves_total}",
        f"To move: {to_move}",
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
        board_after = chess.Board(result.fen_after)
        to_move = "White" if board_after.turn == chess.WHITE else "Black"
        lines += ["", f"To move: {to_move}", "", render_board(board_after, ansi)]
    if result.puzzle_complete:
        lines += ["", sgr("Puzzle complete.", FG_GREEN)]
    elif result.next_correct_move_uci:
        lines += [
            "",
            "Keep going - submit your next move via .../attempts.text?moveUci=...&moveIndex=...",
        ]
    return "\n".join(lines)
