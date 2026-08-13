import { useEffect, useMemo, useRef, useState } from "react";
import Board from "../Board";
import { uciListToMoves } from "../../core/moves";
import { previewFen } from "../../core/preview";
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

  const opening = useMemo(
    (): Opening | null =>
      openings.find((o) => o.name === selectedOpeningName) ?? null,
    [openings, selectedOpeningName],
  );

  const moveList = useMemo(
    () => uciListToMoves(opening?.uci_moves),
    [opening],
  );

  const previewPosition = useMemo(
    () => previewFen(opening, selectedPly),
    [opening, selectedPly],
  );

  return (
    <div className="boardPreview" ref={containerRef}>
      <div
        className="boardPreview-board"
        style={{ width: `${sizePx}px`, maxWidth: "100%" }}
      >
        <Board
          position={previewPosition}
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

        {moveList.map((uci, idx) => {
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
