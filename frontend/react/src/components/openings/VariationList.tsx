import { useState } from "react";
import type { Opening } from "../../pages/Dashboard";
import {
  variationLabelOf,
  subVariationLabelOf,
  groupVariations,
  openingKey,
} from "../../lib/groupOpenings";

function Row({
  o,
  label,
  selected,
  onPick,
}: {
  o: Opening;
  label: string;
  selected: boolean;
  onPick: (o: Opening) => void;
}) {
  return (
    <button
      type="button"
      className={`variation-row${selected ? " selected" : ""}`}
      onClick={() => onPick(o)}
      aria-pressed={selected}
    >
      <span className="r-eco">{o.eco}</span>
      <span className="r-name">{label}</span>
    </button>
  );
}

/**
 * Level-2 list: the variations of a single base opening, as lightweight rows
 * (ECO chip + label). No per-row board — selecting a row drives the shared
 * preview panel. `rows` is expected to lead with the base's root line.
 *
 * Some bases have hundreds of variations, so rows sharing a sub-variation
 * (e.g. "Najdorf Variation, 6.Be3" / "…, 6.Bg5") are clustered under a
 * collapsible header instead of dumped as one flat list.
 */
export default function VariationList({
  rows,
  selectedKey,
  onPick,
}: {
  rows: Opening[];
  selectedKey: string | null;
  onPick: (o: Opening) => void;
}) {
  const groups = groupVariations(rows);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const toggle = (label: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });

  return (
    <div className="variation-rows" role="list">
      {groups.map((g) => {
        if (g.rows.length === 1) {
          const o = g.rows[0];
          return (
            <Row
              key={openingKey(o)}
              o={o}
              label={variationLabelOf(o.name)}
              selected={selectedKey === openingKey(o)}
              onPick={onPick}
            />
          );
        }

        const containsSelected = g.rows.some(
          (o) => openingKey(o) === selectedKey,
        );
        const open = expanded.has(g.label) || containsSelected;

        return (
          <div className="variation-group" key={g.label}>
            <button
              type="button"
              className="variation-group-header"
              onClick={() => toggle(g.label)}
              aria-expanded={open}
            >
              <span className="vg-caret" aria-hidden="true">
                {open ? "▾" : "▸"}
              </span>
              <span className="vg-label">{g.label}</span>
              <span className="vg-count">{g.rows.length}</span>
            </button>
            {open && (
              <div className="variation-group-rows" role="list">
                {g.rows.map((o) => (
                  <Row
                    key={openingKey(o)}
                    o={o}
                    label={subVariationLabelOf(o.name)}
                    selected={selectedKey === openingKey(o)}
                    onPick={onPick}
                  />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
