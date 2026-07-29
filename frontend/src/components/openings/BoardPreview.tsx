import { useEffect, useMemo, useRef, useState } from "react";
import { Chess } from "chess.js";
import { Chessboard, type ChessboardOptions } from "react-chessboard";
import type { Opening } from "../../pages/Dashboard";

function uciToMove(
  uci: string,
): { from: string; to: string; promotion?: string } | null {
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

function uciListToMoves(uciMoves?: string | null): string[] {
  if (!uciMoves) return [];
  const arr = uciMoves.trim().split(/\s+/).filter(Boolean);
  return arr;
}

export default function BoardPreview({
  openings,
  selectedOpeningName,
}: {
  openings: Opening[];
  selectedOpeningName: string | null;
}) {
  const [selectedPly, setSelectedPly] = useState(0);

  // Measure container width and use it for board sizing
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [sizePx, setSizePx] = useState(280);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const ro = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;

      const w = entry.contentRect.width;
      // Keep a sensible minimum so it doesn't collapse
      setSizePx(Math.max(180, Math.floor(w)));
    });

    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const current = useMemo(() => {
    const opening = openings.find((o) => o.name === selectedOpeningName);

    const baseGame = new Chess();

    if (!opening) {
      return {
        opening: null as Opening | null,
        moveList: [] as string[],
        baseFen: baseGame.fen(),
      };
    }

    if (opening.epd) {
      baseGame.load(opening.epd.trim());
    }

    const moveList = uciListToMoves(opening.uci_moves);

    return {
      opening,
      moveList,
      baseFen: baseGame.fen(),
    };
  }, [openings, selectedOpeningName]);

  const previewFen = useMemo(() => {
    const opening = current.opening;
    const moveList = current.moveList;

    const applyMoves = (game: Chess) => {
      const upto = Math.min(selectedPly, moveList.length);
      let applied = 0;

      for (let i = 0; i < upto; i++) {
        const moveObj = uciToMove(moveList[i]);
        if (!moveObj) break;

        try {
          const ok = game.move(moveObj);
          if (!ok) break;
          applied++;
        } catch {
          break;
        }
      }

      return applied;
    };

    const gameFromEpd = new Chess();
    if (opening?.epd) {
      gameFromEpd.load(opening.epd.trim());
    }
    const appliedFromEpd = opening ? applyMoves(gameFromEpd) : 0;

    if (opening && opening.epd && selectedPly > 0 && appliedFromEpd === 0) {
      const gameFromStart = new Chess();
      applyMoves(gameFromStart);
      return gameFromStart.fen();
    }

    return (opening?.epd
      ? gameFromEpd
      : (() => {
          const g = new Chess();
          applyMoves(g);
          return g;
        })()
    ).fen();
  }, [current.opening, current.moveList, selectedPly]);

  const previewChessboardOptions: ChessboardOptions = {
    position: previewFen,
    boardStyle: {
      width: `${sizePx}px`,
      height: `${sizePx}px`,
      maxWidth: "100%",
    },
    allowDragging: false,
    allowDrawingArrows: false,
    showNotation: false,
  };

  return (
    <div className="boardPreview" ref={containerRef}>
      <Chessboard options={previewChessboardOptions} />

      <div style={{ marginTop: 12, display: "flex", flexWrap: "wrap", gap: 8 }}>
        <button
          type="button"
          onClick={() => setSelectedPly(0)}
          style={{ opacity: selectedPly === 0 ? 1 : 0.7 }}
        >
          Start
        </button>

        {current.moveList.map((uci, idx) => {
          const plyNumber = idx + 1;
          const isActive = selectedPly === plyNumber;

          return (
            <button
              key={`${uci}-${idx}`}
              type="button"
              onClick={() => setSelectedPly(plyNumber)}
              style={{ opacity: isActive ? 1 : 0.7 }}
              title={`After ply ${plyNumber}`}
            >
              {uci}
            </button>
          );
        })}
      </div>
    </div>
  );
}
