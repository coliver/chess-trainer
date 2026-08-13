import type { Opening } from "../../pages/Dashboard";
import { variationLabelOf } from "../../lib/groupOpenings";

/**
 * Level-2 list: the variations of a single base opening, as lightweight rows
 * (ECO chip + label). No per-row board — selecting a row drives the shared
 * preview panel. `rows` is expected to lead with the base's root line.
 */
export default function VariationList({
  rows,
  selectedName,
  onPick,
}: {
  rows: Opening[];
  selectedName: string | null;
  onPick: (o: Opening) => void;
}) {
  return (
    <div className="variation-rows" role="list">
      {rows.map((o) => (
        <button
          key={o.eco + o.name}
          type="button"
          role="listitem"
          className={`variation-row${selectedName === o.name ? " selected" : ""}`}
          onClick={() => onPick(o)}
          aria-pressed={selectedName === o.name}
        >
          <span className="r-eco">{o.eco}</span>
          <span className="r-name">{variationLabelOf(o.name)}</span>
        </button>
      ))}
    </div>
  );
}
