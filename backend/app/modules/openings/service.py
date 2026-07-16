from sqlalchemy import select
import chess
from backend.app.modules.openings.models import Opening

def get_prompt_and_move(eco: str, move_index: int, db):
    """
    Return (fen, correct_move_uci) for a specific step in an opening.
    - eco: The ECO code of the opening.
    - move_index: The 0-based index of the move to prompt for.
    """
    # Fetch the flat opening record
    opening = db.execute(
        select(Opening).where(Opening.eco == eco)
    ).scalar_one_or_none()

    if not opening or not opening.uci_moves:
        raise ValueError(f"Opening with ECO {eco} not found or has no moves")

    # Split the space-separated UCI moves
    moves = opening.uci_moves.split()
    
    if move_index < 0 or move_index >= len(moves):
        raise ValueError(f"Move index {move_index} is out of range for this opening")

    # Initialize the board with the starting EPD
    board = chess.Board(opening.epd)

    # Play moves up to the desired index to get the prompt position
    for i in range(move_index):
        board.push_uci(moves[i])

    # The prompt FEN is the current state, the correct move is the one at move_index
    return board.fen(), moves[move_index]