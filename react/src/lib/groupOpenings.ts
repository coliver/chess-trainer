// Groups the flat /openings list into base openings + their variations.
//
// The dataset (~3,800 rows) names variations as "Base: Variation, Sub-variation"
// (e.g. "Sicilian Defense: Najdorf Variation"), so splitting on the first colon
// collapses everything into ~149 base openings — the top level of the browser.
import type { Opening } from "../pages/Dashboard";

export type OpeningGroup = {
  /** Base opening name, e.g. "Sicilian Defense". */
  base: string;
  /** The row that represents the base (its bare root line, or the shortest). */
  representative: Opening;
  /** ECO code of the representative. */
  eco: string;
  /** All rows in the group, representative first, then variations. */
  members: Opening[];
  /** Total number of lines in this base opening (incl. the root). */
  count: number;
};

/** Composite identity key for an opening row (eco + name isn't guaranteed
 * unique on either alone, but the pair is). */
export function openingKey(opening: Opening): string {
  return opening.eco + opening.name;
}

/** "Sicilian Defense: Najdorf Variation" -> "Sicilian Defense". */
export function baseNameOf(name: string): string {
  const i = name.indexOf(":");
  return (i === -1 ? name : name.slice(0, i)).trim();
}

/** Classifies a base opening name by which color's repertoire it represents.
 * Convention: openings named "X Defense/Defence" are Black's choice; all
 * others (named for White's move/system) are White's. */
export function colorOf(baseName: string): "w" | "b" {
  return /defen[cs]e\b/i.test(baseName) ? "b" : "w";
}

/** Label for a row within its base ("Main line" for the root). */
export function variationLabelOf(name: string): string {
  const base = baseNameOf(name);
  if (name.trim() === base) return "Main line";
  return name.slice(name.indexOf(":") + 1).trim();
}

export type VariationGroup = {
  /** Sub-variation cluster label within a base, e.g. "Najdorf Variation". */
  label: string;
  /** All rows sharing that first comma-separated segment. */
  rows: Opening[];
};

/**
 * Clusters a base opening's variation rows by the first comma-separated
 * segment of their label (e.g. "Najdorf Variation, 6.Be3" and "Najdorf
 * Variation, 6.Bg5" both land under "Najdorf Variation"), so a base with
 * hundreds of flat lines collapses into a handful of sub-variation groups.
 * "Main line" is always sorted first; the rest by size, then alphabetically.
 */
export function groupVariations(rows: Opening[]): VariationGroup[] {
  const buckets = new Map<string, Opening[]>();
  for (const o of rows) {
    const label = variationLabelOf(o.name);
    const sub = label === "Main line" ? label : label.split(",")[0].trim();
    const arr = buckets.get(sub);
    if (arr) arr.push(o);
    else buckets.set(sub, [o]);
  }

  const groups = Array.from(buckets, ([label, groupRows]) => ({
    label,
    rows: groupRows,
  }));
  groups.sort((a, b) => {
    if (a.label === "Main line") return -1;
    if (b.label === "Main line") return 1;
    return b.rows.length - a.rows.length || a.label.localeCompare(b.label);
  });
  return groups;
}

/** Label for a row within its sub-variation group ("Main line" for the root of the group). */
export function subVariationLabelOf(name: string): string {
  const label = variationLabelOf(name);
  const i = label.indexOf(",");
  if (i === -1) return "Main line";
  return label.slice(i + 1).trim();
}

function plyCount(o: Opening): number {
  const m = o.uci_moves?.trim();
  return m ? m.split(/\s+/).length : 0;
}

/**
 * Group openings by base name, sorted by size (most variations first, then
 * alphabetically). Within each group, the representative is the bare root row
 * (name === base) when present, otherwise the member with the fewest plies.
 */
export function groupByBase(openings: Opening[]): OpeningGroup[] {
  const buckets = new Map<string, Opening[]>();
  for (const o of openings) {
    const base = baseNameOf(o.name);
    const arr = buckets.get(base);
    if (arr) arr.push(o);
    else buckets.set(base, [o]);
  }

  const groups: OpeningGroup[] = [];
  for (const [base, members] of buckets) {
    let rep = members.find((m) => m.name.trim() === base);
    if (!rep) {
      rep = members.reduce((a, b) => (plyCount(a) <= plyCount(b) ? a : b));
    }
    const ordered = [rep, ...members.filter((m) => m !== rep)];
    groups.push({
      base,
      representative: rep,
      eco: rep.eco,
      members: ordered,
      count: members.length,
    });
  }

  groups.sort((a, b) => b.count - a.count || a.base.localeCompare(b.base));
  return groups;
}
