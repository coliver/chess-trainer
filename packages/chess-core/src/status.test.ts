import { describe, it, expect } from "vitest";
import { deriveStatus, splitOpeningLabel, deriveHintMarkers } from "./status";

describe("deriveStatus", () => {
  const base = {
    isSessionCompleted: false,
    feedback: "",
    hintLevel: -1,
    isPlayerToMove: true,
  };

  it("shows the session-complete banner regardless of other state", () => {
    const status = deriveStatus({ ...base, isSessionCompleted: true, feedback: "❌ x" });
    expect(status.kind).toBe("done");
  });

  it("shows a success banner for ✅ feedback", () => {
    const status = deriveStatus({ ...base, feedback: "✅ Correct!" });
    expect(status).toEqual({ kind: "good", icon: "✓", message: "Correct!", sub: "" });
  });

  it("shows an error banner for ❌ feedback", () => {
    const status = deriveStatus({ ...base, feedback: "❌ Illegal move" });
    expect(status.kind).toBe("bad");
    expect(status.message).toBe("Illegal move");
    expect(status.sub).toBe("Try a different move.");
  });

  it("shows plain feedback text verbatim when unprefixed", () => {
    const status = deriveStatus({ ...base, feedback: "Session completed." });
    expect(status).toEqual({
      kind: "your",
      icon: "♔",
      message: "Session completed.",
      sub: "",
    });
  });

  it("shows the hint banner when a hint is active and there is no feedback", () => {
    const status = deriveStatus({ ...base, hintLevel: 0 });
    expect(status.kind).toBe("hint");
  });

  it("defaults to 'your move', varying sub by side to move", () => {
    expect(deriveStatus(base).sub).toBe("Play the correct move for White.");
    expect(deriveStatus({ ...base, isPlayerToMove: false }).sub).toBe(
      "Waiting for the reply…",
    );
  });

  it("shows the trainee's actual color when playing Black", () => {
    expect(deriveStatus({ ...base, playerColor: "b" }).sub).toBe(
      "Play the correct move for Black.",
    );
  });
});

describe("splitOpeningLabel", () => {
  it("splits an ECO-prefixed label", () => {
    expect(splitOpeningLabel("C50 Italian Game")).toEqual({
      eco: "C50",
      openingName: "Italian Game",
    });
  });

  it("falls back to the raw label (or 'Training') when there is no ECO prefix", () => {
    expect(splitOpeningLabel("Some Opening")).toEqual({
      eco: "",
      openingName: "Some Opening",
    });
    expect(splitOpeningLabel("")).toEqual({ eco: "", openingName: "Training" });
  });
});

describe("deriveHintMarkers", () => {
  it("returns null when there is no correct move, no hint, or the session is done", () => {
    expect(deriveHintMarkers("", 0, false)).toBeNull();
    expect(deriveHintMarkers("e2e4", -1, false)).toBeNull();
    expect(deriveHintMarkers("e2e4", 1, true)).toBeNull();
  });

  it("returns only the from-square at hint level 0", () => {
    expect(deriveHintMarkers("e2e4", 0, false)).toEqual({ from: "e2" });
  });

  it("returns from+to at hint level 1", () => {
    expect(deriveHintMarkers("e2e4", 1, false)).toEqual({ from: "e2", to: "e4" });
  });
});
