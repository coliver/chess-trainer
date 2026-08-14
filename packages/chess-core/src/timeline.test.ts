import { describe, it, expect } from "vitest";
import {
  createTimeline,
  resetTimeline,
  appendTimelineFen,
  jumpToIndex,
  currentFen,
  isAtLatest,
} from "./timeline";

const FEN_A = "fen-a";
const FEN_B = "fen-b";
const FEN_C = "fen-c";

describe("createTimeline / resetTimeline", () => {
  it("starts a single-entry timeline at index 0", () => {
    expect(createTimeline(FEN_A)).toEqual({ fens: [FEN_A], index: 0 });
    expect(resetTimeline(FEN_A)).toEqual({ fens: [FEN_A], index: 0 });
  });
});

describe("appendTimelineFen", () => {
  it("appends after the current index and advances to it", () => {
    let tl = createTimeline(FEN_A);
    tl = appendTimelineFen(tl, FEN_B);
    expect(tl).toEqual({ fens: [FEN_A, FEN_B], index: 1 });
  });

  it("no-ops when the fen matches the current tail", () => {
    const tl = createTimeline(FEN_A);
    expect(appendTimelineFen(tl, FEN_A)).toBe(tl);
  });

  it("truncates redo history when appending after a jump back", () => {
    let tl = createTimeline(FEN_A);
    tl = appendTimelineFen(tl, FEN_B);
    tl = appendTimelineFen(tl, FEN_C);
    tl = jumpToIndex(tl, 0);
    tl = appendTimelineFen(tl, FEN_C);
    expect(tl).toEqual({ fens: [FEN_A, FEN_C], index: 1 });
  });
});

describe("jumpToIndex", () => {
  it("clamps to the timeline bounds", () => {
    let tl = createTimeline(FEN_A);
    tl = appendTimelineFen(tl, FEN_B);
    expect(jumpToIndex(tl, 99).index).toBe(1);
    expect(jumpToIndex(tl, -5).index).toBe(0);
  });

  it("no-ops (returns same reference) when index is unchanged", () => {
    const tl = createTimeline(FEN_A);
    expect(jumpToIndex(tl, 0)).toBe(tl);
  });
});

describe("currentFen / isAtLatest", () => {
  it("reads the fen at the current index and latest flag", () => {
    let tl = createTimeline(FEN_A);
    tl = appendTimelineFen(tl, FEN_B);
    expect(currentFen(tl)).toBe(FEN_B);
    expect(isAtLatest(tl)).toBe(true);

    tl = jumpToIndex(tl, 0);
    expect(currentFen(tl)).toBe(FEN_A);
    expect(isAtLatest(tl)).toBe(false);
  });
});
