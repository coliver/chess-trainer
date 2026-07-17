import React from "react";

type Turn = "w" | "b";

export function fenTurn(fen: string): Turn | null {
  const parts = fen.trim().split(/\s+/);
  // FEN format: [piece placement] [active color] [castling] [en passant] [halfmove] [fullmove]
  if (parts.length < 2) return null;

  const active = parts[1].toLowerCase();
  if (active === "w" || active === "b") return active;
  return null;
}

export default function FenTurnBadge({ fen }: { fen: string }) {
  const turn = fenTurn(fen);

  const side = turn == 'w' ? 'White' : 'Black'

  return <div>{side ? `${side} to move.` : "Invalid FEN"}</div>;
}
