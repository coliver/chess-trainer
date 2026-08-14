// Groups the flat /openings list into base openings + their variations.
//
// The dataset (~3,800 rows) names variations as "Base: Variation, Sub-variation"
// (e.g. "Sicilian Defense: Najdorf Variation"), so splitting on the first colon
// collapses everything into ~149 base openings — the top level of the browser.
import type { Opening } from "../core/openings.service";

export interface OpeningGroup {
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
}

/** "Sicilian Defense: Najdorf Variation" -> "Sicilian Defense". */
export function baseNameOf(name: string): string {
  const i = name.indexOf(":");
  return (i === -1 ? name : name.slice(0, i)).trim();
}

/** Label for a row within its base ("Main line" for the root). */
export function variationLabelOf(name: string): string {
  const base = baseNameOf(name);
  if (name.trim() === base) return "Main line";
  return name.slice(name.indexOf(":") + 1).trim();
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
