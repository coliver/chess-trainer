import { describe, it, expect } from "vitest";
import { START_FEN, sideToMove } from "./fen";
import {
  uciToMove,
  uciListToMoves,
  legalMoves,
  pieceColorAt,
  applyMove,
  applyUci,
} from "./moves";

// White pawn on a7 ready to promote; kings tucked away.
const PROMO_FEN = "7k/P7/8/8/8/8/8/7K w - - 0 1";

describe("uciToMove", () => {
  it("parses plain and promotion moves", () => {
    expect(uciToMove("e2e4")).toEqual({ from: "e2", to: "e4" });
    expect(uciToMove("e7e8q")).toEqual({
      from: "e7",
      to: "e8",
      promotion: "q",
    });
  });

  it("rejects malformed or bad-promotion input", () => {
    expect(uciToMove("")).toBeNull();
    expect(uciToMove("e2")).toBeNull();
    expect(uciToMove("e7e8x")).toBeNull();
  });
});

describe("uciListToMoves", () => {
  it("splits on whitespace and drops blanks", () => {
    expect(uciListToMoves("e2e4 e7e5")).toEqual(["e2e4", "e7e5"]);
    expect(uciListToMoves("  e2e4   e7e5  ")).toEqual(["e2e4", "e7e5"]);
  });

  it("returns [] for empty/nullish", () => {
    expect(uciListToMoves(null)).toEqual([]);
    expect(uciListToMoves(undefined)).toEqual([]);
    expect(uciListToMoves("   ")).toEqual([]);
  });
});

describe("legalMoves", () => {
  it("lists legal targets for a square", () => {
    const tos = legalMoves(START_FEN, "e2").map((m) => m.to);
    expect(tos).toContain("e3");
    expect(tos).toContain("e4");
  });

  it("returns [] for an empty square", () => {
    expect(legalMoves(START_FEN, "e4")).toEqual([]);
  });
});

describe("pieceColorAt", () => {
  it("reports color or null", () => {
    expect(pieceColorAt(START_FEN, "e2")).toBe("w");
    expect(pieceColorAt(START_FEN, "e7")).toBe("b");
    expect(pieceColorAt(START_FEN, "e4")).toBeNull();
  });
});

describe("applyMove", () => {
  it("applies a legal move and returns fen + uci", () => {
    const res = applyMove(START_FEN, "e2", "e4", "e2e4");
    expect(res).not.toBeNull();
    expect(res!.uci).toBe("e2e4");
    expect(sideToMove(res!.nextFen)).toBe("b");
  });

  it("honors the promotion encoded in correctMoveUci", () => {
    const res = applyMove(PROMO_FEN, "a7", "a8", "a7a8n");
    expect(res).not.toBeNull();
    expect(res!.uci).toBe("a7a8n");
  });

  it("returns null for an illegal move", () => {
    expect(applyMove(START_FEN, "e2", "e5", "e2e5")).toBeNull();
  });
});

describe("applyUci", () => {
  it("applies a full uci move", () => {
    const res = applyUci(START_FEN, "e2e4");
    expect(res).not.toBeNull();
    expect(sideToMove(res!.nextFen)).toBe("b");
  });

  it("returns null for illegal or malformed uci", () => {
    expect(applyUci(START_FEN, "e2e5")).toBeNull();
    expect(applyUci(START_FEN, "zz")).toBeNull();
  });
});
