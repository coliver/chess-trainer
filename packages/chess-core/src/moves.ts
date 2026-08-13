// Framework-neutral move logic. No React — imports only chess.js.
// chess.js stays the single source of truth for move legality; these helpers
// wrap it so both the React hooks and the future Angular service share it.
import { Chess, type Square } from "chess.js";

export type UciMove = { from: string; to: string; promotion?: string };

/** Parse a UCI string ("e2e4", "e7e8q") into a move, or null if malformed. */
export function uciToMove(uci: string): UciMove | null {
  const u = uci.trim();
  if (!u || u.length < 4) return null;

  const from = u.slice(0, 2);
  const to = u.slice(2, 4);

  // promotion like e7e8q
  if (u.length === 5) {
    const promotionChar = u[4].toLowerCase();
    if (!["q", "r", "b", "n"].includes(promotionChar)) return null;
    return { from, to, promotion: promotionChar };
  }

  if (u.length === 4) return { from, to };
  return null;
}

/** Split a space-separated UCI move list into individual moves. */
export function uciListToMoves(uciMoves?: string | null): string[] {
  if (!uciMoves) return [];
  return uciMoves.trim().split(/\s+/).filter(Boolean);
}

/** Color of the piece on `square` ("w"/"b"), or null if empty/unparseable. */
export function pieceColorAt(fen: string, square: string): "w" | "b" | null {
  try {
    const piece = new Chess(fen).get(square as Square);
    return piece ? piece.color : null;
  } catch {
    return null;
  }
}

/** Legal destination squares (with promotion) for the piece on `square`. */
export function legalMoves(
  fen: string,
  square: string,
): { to: string; promotion?: string }[] {
  const game = new Chess(fen);
  return game
    .moves({ square: square as Square, verbose: true })
    .map((m) => ({ to: m.to, promotion: m.promotion }));
}

/**
 * Apply a `from`→`to` move on `fen`, honoring the promotion encoded in
 * `correctMoveUci` (e.g. `a7a8n`). Returns the resulting FEN and the normalized
 * UCI, or null if the move is illegal.
 */
export function applyMove(
  fen: string,
  from: string,
  to: string,
  correctMoveUci: string,
): { nextFen: string; uci: string } | null {
  const uciPrefix = `${from}${to}`;
  const expectedPromo = correctMoveUci.startsWith(uciPrefix)
    ? correctMoveUci.slice(uciPrefix.length)
    : "";
  const promoForMove = expectedPromo ? expectedPromo : undefined;

  try {
    const game = new Chess(fen);
    const move = game.move({
      from,
      to,
      ...(promoForMove ? { promotion: promoForMove } : {}),
    });
    if (move === null) return null;

    const promotionChar = move.promotion
      ? String(move.promotion).toLowerCase()
      : "";
    return { nextFen: game.fen(), uci: `${from}${to}${promotionChar}` };
  } catch {
    return null;
  }
}

/** Apply a full UCI move on `fen`. Returns the resulting FEN, or null if illegal. */
export function applyUci(fen: string, uci: string): { nextFen: string } | null {
  const move = uciToMove(uci);
  if (!move) return null;

  try {
    const game = new Chess(fen);
    const applied = game.move(move);
    if (applied === null) return null;
    return { nextFen: game.fen() };
  } catch {
    return null;
  }
}
