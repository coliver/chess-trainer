import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import Board from "../Board";
import { previewFen, uciListToMoves } from "@knight-school/chess-core";
import { colorOf, type OpeningGroup } from "../../lib/groupOpenings";

/**
 * A base-opening card: board thumbnail (of the line's resulting position),
 * full name, variation count, and an ECO chip. The board is a real cm-chessboard
 * but is only mounted once the card scrolls near the viewport, so a grid of ~149
 * cards does not spin up 149 boards at once.
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
  const fen = useMemo(
    () => previewFen(rep, uciListToMoves(rep.uci_moves).length),
    [rep],
  );
  const orientation = colorOf(group.base) === "b" ? "black" : "white";

  return (
    <button
      ref={ref}
      type="button"
      className={`opening-card${selected ? " selected" : ""}`}
      onClick={onSelect}
      aria-pressed={selected}
    >
      <div className="oc-thumb">
        {visible ? (
          <Board
            position={fen}
            orientation={orientation}
            interactive={false}
            showCoordinates={false}
            animated={false}
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
