import { useMemo } from "react";
import { Chess } from "chess.js";
import { Chessboard, type ChessboardOptions } from "react-chessboard";
import type { Opening } from "../../pages/Dashboard";

function uciToMove(uci: string): { from: string; to: string; promotion?: string } | null {
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

export default function BoardPreview({
  openings,
  selectedOpeningName,
  size = 280,
}: {
  openings: Opening[];
  selectedOpeningName: string | null;
  size?: number;
}) {
    const previewFen = useMemo(() => {
    const opening = openings.find((o) => o.name === selectedOpeningName);
    const game = new Chess();

    if (!opening) return game.fen();

    // Try to load epd/fen string (your current logic uses game.load)
    if (opening.epd) {
      const loaded = game.load(opening.epd.trim());
      if (!loaded) return game.fen();
    }

    if (!opening.uci_moves) return game.fen();

    const firstUci = opening.uci_moves.trim().split(/\s+/)[0];
    const moveObj = uciToMove(firstUci);
    if (!moveObj) return game.fen();

    const ok = game.move(moveObj);
    if (!ok) return game.fen();

    return game.fen();
  }, [openings, selectedOpeningName]);

  const previewChessboardOptions: ChessboardOptions = {
    position: previewFen,
    boardStyle: {
      width: `${size}px`,
      height: `${size}px`,
      maxWidth: "100%",
    },
    allowDragging: false,
    allowDrawingArrows: false,
    showNotation: false,
  };

  return (
    <div className="boardPreview">
      <Chessboard options={previewChessboardOptions} />
    </div>
  );
}
