// Framework-neutral FEN helpers. No React — imports only chess.js.
// The React hooks build on this.
import { Chess } from "chess.js";

export const START_FEN =
  "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

/**
 * Normalize a raw fen-ish value to a bare FEN. Backend rows sometimes carry
 * `|`/`;` suffixes; strip them and fall back to the start position when empty.
 */
export function normalizeFen(raw: unknown): string {
  if (raw == null) return START_FEN;
  const s = String(raw).trim();
  if (!s) return START_FEN;

  const clean = s.split("|")[0].split(";")[0].trim();
  return clean || START_FEN;
}

/** Side to move for a FEN — "w" or "b". Defaults to "w" on parse failure. */
export function sideToMove(fen: string): "w" | "b" {
  try {
    return new Chess(fen).turn() === "b" ? "b" : "w";
  } catch {
    return "w";
  }
}
