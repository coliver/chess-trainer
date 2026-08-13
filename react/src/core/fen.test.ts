import { describe, it, expect } from "vitest";
import { START_FEN, normalizeFen, sideToMove } from "./fen";

describe("normalizeFen", () => {
  it("falls back to START_FEN for empty/nullish input", () => {
    expect(normalizeFen(null)).toBe(START_FEN);
    expect(normalizeFen(undefined)).toBe(START_FEN);
    expect(normalizeFen("")).toBe(START_FEN);
    expect(normalizeFen("   ")).toBe(START_FEN);
  });

  it("strips |/; suffixes and trims", () => {
    expect(normalizeFen(`${START_FEN} | extra`)).toBe(START_FEN);
    expect(normalizeFen(`${START_FEN} ; note`)).toBe(START_FEN);
  });

  it("passes a clean fen through", () => {
    expect(normalizeFen(START_FEN)).toBe(START_FEN);
  });
});

describe("sideToMove", () => {
  it("reads the side to move from the fen", () => {
    expect(sideToMove(START_FEN)).toBe("w");
    expect(
      sideToMove("rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1"),
    ).toBe("b");
  });

  it("defaults to white on an unparseable fen", () => {
    expect(sideToMove("not-a-fen")).toBe("w");
  });
});
