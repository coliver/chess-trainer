import { describe, it, expect } from "vitest";
import {
  baseNameOf,
  variationLabelOf,
  subVariationLabelOf,
  groupByBase,
  groupVariations,
} from "./groupOpenings";
import type { Opening } from "../pages/Dashboard";

const op = (name: string, eco: string, uci_moves = ""): Opening => ({
  name,
  eco,
  uci_moves,
});

describe("baseNameOf", () => {
  it("splits on the first colon", () => {
    expect(baseNameOf("Sicilian Defense: Najdorf Variation")).toBe(
      "Sicilian Defense",
    );
  });
  it("returns the whole name when there is no colon", () => {
    expect(baseNameOf("French Defense")).toBe("French Defense");
  });
  it("trims surrounding whitespace", () => {
    expect(baseNameOf("Ruy Lopez : Berlin")).toBe("Ruy Lopez");
  });
});

describe("variationLabelOf", () => {
  it("labels the bare root as Main line", () => {
    expect(variationLabelOf("Sicilian Defense")).toBe("Main line");
  });
  it("returns the text after the colon for variations", () => {
    expect(variationLabelOf("Sicilian Defense: Najdorf Variation")).toBe(
      "Najdorf Variation",
    );
  });
});

describe("groupByBase", () => {
  it("collapses variations under one base", () => {
    const groups = groupByBase([
      op("Sicilian Defense", "B20", "e2e4 c7c5"),
      op("Sicilian Defense: Najdorf Variation", "B90"),
      op("Sicilian Defense: Dragon Variation", "B70"),
      op("French Defense", "C00", "e2e4 e7e6"),
    ]);
    expect(groups).toHaveLength(2);
    const sicilian = groups.find((g) => g.base === "Sicilian Defense")!;
    expect(sicilian.count).toBe(3);
    // representative is the bare root, and it comes first
    expect(sicilian.representative.name).toBe("Sicilian Defense");
    expect(sicilian.members[0]).toBe(sicilian.representative);
  });

  it("sorts groups by size, then alphabetically", () => {
    const groups = groupByBase([
      op("French Defense", "C00"),
      op("Sicilian Defense", "B20"),
      op("Sicilian Defense: Najdorf", "B90"),
      op("Caro-Kann Defense", "B10"),
    ]);
    expect(groups.map((g) => g.base)).toEqual([
      "Sicilian Defense", // 2 members
      "Caro-Kann Defense", // 1, alphabetical before French
      "French Defense",
    ]);
  });

  it("falls back to the shortest line when there is no bare root", () => {
    const groups = groupByBase([
      op("Ruy Lopez: Berlin Defense", "C65", "e2e4 e7e5 g1f3 b8c6 f1b5 g8f6"),
      op("Ruy Lopez: Exchange", "C68", "e2e4 e7e5 g1f3 b8c6 f1b5 a7a6 b5c6"),
    ]);
    expect(groups).toHaveLength(1);
    expect(groups[0].representative.eco).toBe("C65"); // fewer plies
  });
});

describe("groupByBase extra branches", () => {
  it("falls back to the shortest line, picking b when b has fewer plies than a", () => {
    const groups = groupByBase([
      op("Ruy Lopez: Exchange", "C68", "e2e4 e7e5 g1f3 b8c6 f1b5 a7a6 b5c6"),
      op("Ruy Lopez: Berlin Defense", "C65", "e2e4 e7e5 g1f3 b8c6 f1b5 g8f6"),
    ]);
    expect(groups[0].representative.eco).toBe("C65");
  });

  it("treats a missing/empty uci_moves as 0 plies", () => {
    const groups = groupByBase([
      op("Irregular Opening", "A00", ""),
      op("Irregular Opening: Sub", "A00", "a2a3"),
    ]);
    expect(groups[0].representative.name).toBe("Irregular Opening");
  });

  it("treats a whitespace-only uci_moves as 0 plies too", () => {
    const groups = groupByBase([
      op("Whitespace Opening", "A00", "   "),
      op("Whitespace Opening: Sub", "A00", "a2a3"),
    ]);
    expect(groups[0].representative.name).toBe("Whitespace Opening");
  });

  it("treats a fully-undefined uci_moves field as 0 plies too", () => {
    const noMoves: Opening = { name: "No Moves", eco: "A00" };
    const groups = groupByBase([
      noMoves,
      op("No Moves: Sub", "A00", "a2a3"),
    ]);
    expect(groups[0].representative.name).toBe("No Moves");
  });
});

describe("groupVariations extra branches", () => {
  it("breaks ties in size with alphabetical order", () => {
    const groups = groupVariations([
      op("French Defense", "C00"),
      op("French Defense: Zeta Variation", "C09"),
      op("French Defense: Alpha Variation", "C01"),
    ]);
    expect(groups.map((g) => g.label)).toEqual([
      "Main line",
      "Alpha Variation",
      "Zeta Variation",
    ]);
  });
});

describe("subVariationLabelOf", () => {
  it("returns Main line when there is no comma", () => {
    expect(subVariationLabelOf("Sicilian Defense: Najdorf Variation")).toBe(
      "Main line",
    );
  });
  it("returns the text after the comma", () => {
    expect(
      subVariationLabelOf("Sicilian Defense: Najdorf Variation, 6.Be3"),
    ).toBe("6.Be3");
  });
});

describe("groupVariations", () => {
  it("clusters rows by their first comma-separated segment", () => {
    const groups = groupVariations([
      op("Sicilian Defense", "B20"),
      op("Sicilian Defense: Najdorf Variation", "B90"),
      op("Sicilian Defense: Najdorf Variation, 6.Be3", "B90"),
      op("Sicilian Defense: Najdorf Variation, 6.Bg5", "B90"),
      op("Sicilian Defense: Dragon Variation", "B70"),
    ]);
    expect(groups.map((g) => g.label)).toEqual([
      "Main line",
      "Najdorf Variation", // 3 rows, beats Dragon (1) and sorts first among the rest
      "Dragon Variation",
    ]);
    const najdorf = groups.find((g) => g.label === "Najdorf Variation")!;
    expect(najdorf.rows).toHaveLength(3);
  });

  it("sorts Main line first, then by size, then alphabetically", () => {
    const groups = groupVariations([
      op("French Defense: Tarrasch, Open", "C07"),
      op("French Defense: Advance", "C02"),
      op("French Defense", "C00"),
      op("French Defense: Tarrasch, Closed", "C05"),
    ]);
    expect(groups.map((g) => g.label)).toEqual([
      "Main line",
      "Tarrasch", // 2 rows
      "Advance", // 1 row
    ]);
  });
});
