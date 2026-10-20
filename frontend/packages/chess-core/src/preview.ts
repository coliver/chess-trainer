// Framework-neutral opening-preview position builder. No React — chess.js only.
import { Chess } from "chess.js";
import { uciToMove, uciListToMoves } from "./moves";

export type PreviewOpening = {
  epd?: string | null;
  uci_moves?: string | null;
};

/** Apply up to `upto` UCI moves from `moveList` onto `game`; returns the count
 *  actually applied (stops at the first illegal/malformed move). */
function applyMoves(game: Chess, moveList: string[], upto: number): number {
  const limit = Math.min(upto, moveList.length);
  let applied = 0;
  for (let i = 0; i < limit; i++) {
    const moveObj = uciToMove(moveList[i]);
    if (!moveObj) break;
    try {
      if (!game.move(moveObj)) break;
      applied++;
    } catch {
      break;
    }
  }
  return applied;
}

/**
 * FEN after applying `ply` half-moves of an opening. Moves are normally relative
 * to the standard start position, and the opening's EPD is the position after the
 * whole line, so ply 0 is the start position, not the EPD. If the first move is
 * legal from the EPD, the moves are treated as relative to it instead. With an
 * EPD but no moves, the EPD itself is returned.
 */
export function previewFen(opening: PreviewOpening | null, ply: number): string {
  const moveList = uciListToMoves(opening?.uci_moves);

  if (opening?.epd) {
    const fromEpd = new Chess();
    fromEpd.load(opening.epd.trim());
    if (moveList.length === 0) return fromEpd.fen();
    if (applyMoves(new Chess(fromEpd.fen()), moveList, 1) === 1) {
      applyMoves(fromEpd, moveList, ply);
      return fromEpd.fen();
    }
  }

  const game = new Chess();
  applyMoves(game, moveList, ply);
  return game.fen();
}
