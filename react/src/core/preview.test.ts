import { describe, it, expect } from "vitest";
import { START_FEN, sideToMove } from "./fen";
import { previewFen } from "./preview";

describe("previewFen", () => {
  it("returns the start position for no opening / ply 0", () => {
    expect(previewFen(null, 0)).toBe(START_FEN);
    expect(previewFen({ uci_moves: "e2e4 e7e5" }, 0)).toBe(START_FEN);
  });

  it("applies the requested number of half-moves from the start", () => {
    expect(sideToMove(previewFen({ uci_moves: "e2e4 e7e5" }, 1))).toBe("b");
    expect(sideToMove(previewFen({ uci_moves: "e2e4 e7e5" }, 2))).toBe("w");
  });

  it("clamps ply to the available move list", () => {
    const atTwo = previewFen({ uci_moves: "e2e4 e7e5" }, 2);
    expect(previewFen({ uci_moves: "e2e4 e7e5" }, 99)).toBe(atTwo);
  });

  it("stops at the first illegal move", () => {
    // second move is illegal from this position -> only the first applies
    const oneApplied = previewFen({ uci_moves: "e2e4 e7e5" }, 1);
    expect(previewFen({ uci_moves: "e2e4 a7a1" }, 2)).toBe(oneApplied);
  });

  it("starts from the opening EPD when present", () => {
    // A full-FEN EPD with black to move; ply 0 returns it unchanged.
    const epd =
      "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1";
    expect(sideToMove(previewFen({ epd, uci_moves: "" }, 0))).toBe("b");
  });
});
