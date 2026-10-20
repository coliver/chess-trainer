import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import Board from "../Board";
import usePrefersReducedMotion from "../../hooks/usePrefersReducedMotion";
import { previewFen, uciListToMoves } from "@knight-school/chess-core";
import { colorOf, type OpeningGroup } from "../../lib/groupOpenings";

const STEP_MS = 700;
const END_PAUSE_MS = 1500;

/**
 * A base-opening card: board thumbnail (of the line's resulting position),
 * full name, variation count, and an ECO chip. The board is a real cm-chessboard
 * but is only mounted once the card scrolls near the viewport, so a grid of ~149
 * cards does not spin up 149 boards at once. Hovering with a mouse replays the
 * line from the start, pausing on the final position before looping.
 */
export default function OpeningCard({
  group,
  selected,
  onSelect,
}: {
  group: OpeningGroup;
  selected: boolean;
  onSelect: () => void;
}) {
  const { t } = useTranslation();
  const ref = useRef<HTMLButtonElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || visible) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setVisible(true);
          io.disconnect();
        }
      },
      { rootMargin: "250px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [visible]);

  const rep = group.representative;
  const total = useMemo(() => uciListToMoves(rep.uci_moves).length, [rep]);
  const restingFen = useMemo(() => previewFen(rep, total), [rep, total]);
  const reduceMotion = usePrefersReducedMotion();
  const [hovering, setHovering] = useState(false);
  const [ply, setPly] = useState(0);

  // Step one ply per tick, pause on the final position, then loop back to 0.
  useEffect(() => {
    if (!hovering || reduceMotion || total === 0) return;
    const id = setTimeout(
      () => setPly((p) => (p >= total ? 0 : p + 1)),
      ply >= total ? END_PAUSE_MS : STEP_MS,
    );
    return () => clearTimeout(id);
  }, [hovering, reduceMotion, ply, total]);

  const fen = hovering && !reduceMotion && total > 0 ? previewFen(rep, ply) : restingFen;
  const orientation = colorOf(group.base) === "b" ? "black" : "white";

  return (
    <button
      ref={ref}
      type="button"
      className={`opening-card${selected ? " selected" : ""}`}
      onClick={onSelect}
      aria-pressed={selected}
      onPointerEnter={(e) => {
        if (e.pointerType !== "mouse" || reduceMotion) return;
        setPly(0);
        setHovering(true);
      }}
      onPointerLeave={() => setHovering(false)}
    >
      <div className="oc-thumb">
        {visible ? (
          <Board
            position={fen}
            orientation={orientation}
            interactive={false}
            showCoordinates={false}
          />
        ) : (
          <div className="oc-thumb-ph" aria-hidden="true" data-testid="oc-thumb-placeholder" />
        )}
      </div>
      <div className="oc-name">{group.base}</div>
      <div className="oc-foot">
        <span className="oc-count">
          {t("dashboard.openings.variationCount", { count: group.count })}
        </span>
        <span className="eco-chip">{group.eco}</span>
      </div>
    </button>
  );
}
