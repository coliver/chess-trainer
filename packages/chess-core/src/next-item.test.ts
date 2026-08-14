import { describe, it, expect } from "vitest";
import { START_FEN } from "./fen";
import { deriveNextItem } from "./next-item";

describe("deriveNextItem", () => {
  it("prefers fenAfter, then fen, then epd", () => {
    expect(deriveNextItem({ fenAfter: "a", fen: "b", epd: "c" }).fen).toBe("a");
    expect(deriveNextItem({ fen: "b", epd: "c" }).fen).toBe("b");
    expect(deriveNextItem({ epd: "c" }).fen).toBe("c");
  });

  it("falls back to START_FEN when no fen field is present", () => {
    expect(deriveNextItem({}).fen).toBe(START_FEN);
  });

  it("prefers itemId over id, and normalizes missing/empty to null", () => {
    expect(deriveNextItem({ itemId: "5", id: "9" }).itemId).toBe("5");
    expect(deriveNextItem({ id: 9 }).itemId).toBe("9");
    expect(deriveNextItem({ itemId: "" }).itemId).toBeNull();
    expect(deriveNextItem({}).itemId).toBeNull();
  });

  it("builds the opening label from eco + name, or falls back", () => {
    expect(
      deriveNextItem({ openingEco: "C50", openingName: "Italian Game" }).openingLabel,
    ).toBe("C50 Italian Game");
    expect(deriveNextItem({ openingName: "Italian Game" }).openingLabel).toBe(
      "Italian Game",
    );
    expect(deriveNextItem({}).openingLabel).toBe("Opening: (unknown)");
  });

  it("defaults correctMoveUci to an empty string", () => {
    expect(deriveNextItem({ correctMoveUci: "e2e4" }).correctMoveUci).toBe("e2e4");
    expect(deriveNextItem({}).correctMoveUci).toBe("");
  });
});
