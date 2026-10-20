import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import Board from "../Board";
import usePrefersReducedMotion from "../../hooks/usePrefersReducedMotion";
import { uciListToMoves, previewFen } from "@knight-school/chess-core";
import type { Opening } from "../../pages/Dashboard";

// Delay between moves while a newly selected line plays, and the hold on the
// final position before it loops.
const STEP_MS = 700;
const END_PAUSE_MS = 1500;

export default function BoardPreview({
  openings,
  selectedOpeningName,
  playerColor,
}: {
  openings: Opening[];
  selectedOpeningName: string | null;
  /** Which side to view the board from — follows the Play as White/Black toggle. */
  playerColor: "w" | "b";
}) {
  const { t } = useTranslation();

  const opening = useMemo(
    (): Opening | null =>
      openings.find((o) => o.name === selectedOpeningName) ?? null,
    [openings, selectedOpeningName],
  );

  const moveList = useMemo(
    () => uciListToMoves(opening?.uci_moves),
    [opening],
  );

  // Callers remount this via a `key` on the selected opening, so state starts
  // fresh for each newly previewed line — a ply index never leaks from a
  // longer line onto a shorter one. Each new line plays through from the start
  // position, pauses on the final ply and loops; clicking any ply button takes over.
  // With reduced motion there is no autoplay: open on the final ply instead.
  const reduceMotion = usePrefersReducedMotion();
  const [selectedPly, setSelectedPly] = useState(() =>
    reduceMotion ? moveList.length : 0,
  );
  const [autoplay, setAutoplay] = useState(true);
  const playing = autoplay && !reduceMotion && moveList.length > 0;

  useEffect(() => {
    if (!playing) return;
    const last = moveList.length;
    const id = setTimeout(
      () => setSelectedPly((p) => (p >= last ? 0 : p + 1)),
      selectedPly >= last ? END_PAUSE_MS : STEP_MS,
    );
    return () => clearTimeout(id);
  }, [playing, selectedPly, moveList]);

  const goToPly = (ply: number) => {
    setAutoplay(false);
    setSelectedPly(ply);
  };

  // Start rewinds to the initial position and resumes the loop.
  const restart = () => {
    setAutoplay(true);
    setSelectedPly(0);
  };

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

  const previewPosition = useMemo(
    () => previewFen(opening, selectedPly),
    [opening, selectedPly],
  );

  const orientation = playerColor === "b" ? "black" : "white";

  return (
    <div className="boardPreview" ref={containerRef}>
      <div
        className="boardPreview-board"
        style={{ width: `${sizePx}px`, maxWidth: "100%" }}
      >
        <Board
          position={previewPosition}
          orientation={orientation}
          interactive={false}
          showCoordinates={false}
        />
      </div>

      <div className="ply-stepper">
        {!reduceMotion && moveList.length > 0 && (
          <button
            type="button"
            className="ply-btn"
            aria-pressed={!autoplay}
            onClick={() => setAutoplay((a) => !a)}
          >
            {t(autoplay ? "dashboard.openings.boardPreviewPause" : "dashboard.openings.boardPreviewPlay")}
          </button>
        )}

        <button
          type="button"
          className={`ply-btn${selectedPly === 0 ? " active" : ""}`}
          onClick={restart}
        >
          {t("dashboard.openings.boardPreviewStart")}
        </button>

        {moveList.map((uci, idx) => {
          const plyNumber = idx + 1;
          const isActive = selectedPly === plyNumber;

          return (
            <button
              key={`${uci}-${idx}`}
              type="button"
              className={`ply-btn${isActive ? " active" : ""}`}
              onClick={() => goToPly(plyNumber)}
              title={t("dashboard.openings.boardPreviewAfterPly", { ply: plyNumber })}
            >
              {uci}
            </button>
          );
        })}
      </div>
    </div>
  );
}
