import { useEffect, useMemo, useRef, useState } from "react";
import { Chess } from "chess.js";
import Board from "../Board";
import { uciToMove, uciListToMoves } from "../../core/moves";
import type { Opening } from "../../pages/Dashboard";

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
      // leave some breathing room inside the container
      const scale = 0.85; // tweak: 0.95–0.98
      setSizePx(Math.max(180, Math.floor(w * scale)));
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

    return (
      opening?.epd
        ? gameFromEpd
        : (() => {
            const g = new Chess();
            applyMoves(g);
            return g;
          })()
    ).fen();
  }, [current.opening, current.moveList, selectedPly]);

  return (
    <div className="boardPreview" ref={containerRef}>
      <div
        className="boardPreview-board"
        style={{ width: `${sizePx}px`, maxWidth: "100%" }}
      >
        <Board
          position={previewFen}
          interactive={false}
          showCoordinates={false}
        />
      </div>

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
