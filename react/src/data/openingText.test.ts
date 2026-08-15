import { describe, it, expect } from "vitest";
import { describeOpening } from "./openingText";
import type { Opening } from "../pages/Dashboard";

const op = (over: Partial<Opening>): Opening => ({
  name: "Sicilian Defense",
  eco: "B20",
  ...over,
});

describe("describeOpening", () => {
  it("prefers the DB description when present", () => {
    expect(
      describeOpening(op({ description: "  A custom blurb.  " })),
    ).toBe("A custom blurb.");
  });

  it("uses the authored base text for a main-line opening with no DB text", () => {
    expect(describeOpening(op({ name: "Sicilian Defense" }))).toMatch(
      /Black's most popular/,
    );
  });

  it("falls back to a generic factual sentence for a main-line opening with no authored text", () => {
    const text = describeOpening(
      op({ name: "Some Totally Unlisted Opening", eco: "Z99" }),
    );
    expect(text).toBe(
      "Some Totally Unlisted Opening (Z99) — a recognised chess opening.",
    );
  });

  it("prefixes the variation label and appends authored base text when available", () => {
    const text = describeOpening(
      op({ name: "Sicilian Defense: Najdorf Variation" }),
    );
    expect(text).toMatch(/^Najdorf Variation — a variation of the Sicilian Defense\./);
    expect(text).toMatch(/Black's most popular/);
  });

  it("uses only the lead sentence for a variation with no authored base text", () => {
    const text = describeOpening(
      op({ name: "Some Totally Unlisted Opening: Sub Line", eco: "Z99" }),
    );
    expect(text).toBe(
      "Sub Line — a variation of the Some Totally Unlisted Opening.",
    );
  });
});
