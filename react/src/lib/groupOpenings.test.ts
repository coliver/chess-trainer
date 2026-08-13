import { describe, it, expect } from "vitest";
import { baseNameOf, variationLabelOf, groupByBase } from "./groupOpenings";
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
