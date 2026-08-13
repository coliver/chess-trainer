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
 * FEN after applying `ply` half-moves of an opening. Starts from the opening's
 * EPD when present (else the standard start position). If an EPD is present but
 * its moves apply to nothing at `ply > 0`, retries from the start position — a
 * fallback for openings whose UCI moves are relative to the start, not the EPD.
 */
export function previewFen(opening: PreviewOpening | null, ply: number): string {
  const moveList = uciListToMoves(opening?.uci_moves);

  const gameFromEpd = new Chess();
  if (opening?.epd) {
    gameFromEpd.load(opening.epd.trim());
  }
  const appliedFromEpd = opening ? applyMoves(gameFromEpd, moveList, ply) : 0;

  if (opening?.epd && ply > 0 && appliedFromEpd === 0) {
    const gameFromStart = new Chess();
    applyMoves(gameFromStart, moveList, ply);
    return gameFromStart.fen();
  }

  if (opening?.epd) {
    return gameFromEpd.fen();
  }

  const game = new Chess();
  applyMoves(game, moveList, ply);
  return game.fen();
}
