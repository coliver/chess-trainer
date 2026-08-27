//frontend/src/pages/Training.test.tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, waitFor, act, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Training } from "./Training";
import { useTrainingSession } from "../hooks/useTrainingSession";
import { useBlinkGreen } from "../hooks/useBlinkGreen";
import "@testing-library/jest-dom";
import type { BoardProps } from "../components/Board";
import { PreferencesProvider } from "../context/PreferencesContext";

const renderTraining = () => (
  <PreferencesProvider>
    <Training />
  </PreferencesProvider>
);

vi.mock("../hooks/useTrainingSession");
vi.mock("../hooks/useBlinkGreen");

const { mockCelebrateWin } = vi.hoisted(() => ({
  mockCelebrateWin: vi.fn(),
}));
vi.mock("../utils/winCelebration", () => ({
  celebrateWin: mockCelebrateWin,
}));

// The chess logic now lives in @knight-school/chess-core (its own package, its
// own tests against real chess.js). Here we mock that boundary so the Training
// tests exercise the component's wiring, not chess rules.
const {
  applyMoveMock,
  applyUciMock,
  legalMovesMock,
  pieceColorAtMock,
  sideToMoveMock,
} = vi.hoisted(() => ({
  applyMoveMock: vi.fn(),
  applyUciMock: vi.fn(),
  legalMovesMock: vi.fn(),
  pieceColorAtMock: vi.fn(),
  sideToMoveMock: vi.fn(),
}));

vi.mock("@knight-school/chess-core", async (importOriginal) => {
  // Keep the real pure helpers (timeline/status/opening-label/next-item) —
  // only the chess.js-backed board logic is mocked above.
  const actual = await importOriginal<typeof import("@knight-school/chess-core")>();
  return {
    ...actual,
    applyMove: applyMoveMock,
    applyUci: applyUciMock,
    legalMoves: legalMovesMock,
    pieceColorAt: pieceColorAtMock,
    sideToMove: sideToMoveMock,
  };
});

let capturedProps: BoardProps;

// The Board wrapper (cm-chessboard) is replaced with a prop-capturing stub.
// Both drag and click reach the app through `onMove`, so tests drive that.
vi.mock("../components/Board", () => ({
  default: (props: BoardProps) => {
    capturedProps = props;
    return <div data-testid="board" />;
  },
}));

vi.mock("../api", () => ({
  default: { get: vi.fn(), post: vi.fn() },
}));

const mockNavigate = vi.fn();
vi.mock("react-router-dom", () => ({
  useParams: () => ({ id: "sess-1" }),
  useNavigate: () => mockNavigate,
}));

type FenTurnBadgeProps = { fen: string };

vi.mock("../components/FenTurnBadge", () => ({
  default: ({ fen }: FenTurnBadgeProps) => (
    <div data-testid="fen-badge">{fen}</div>
  ),
}));

const hasMarker = (square: string, type: "hint" | "blink" | "lastmove") =>
  (capturedProps.markers ?? []).some(
    (m) => m.square === square && m.type === type,
  );

describe("Training Page", () => {
  let user: ReturnType<typeof userEvent.setup>;
  const mockSubmitMove = vi.fn();
  const mockTakeAutoplayOnce = vi.fn();

  const baseHookValue = {
    fen: "start-fen",
    setFen: vi.fn(),
    itemId: 10,
    correctMoveUci: "e2e4",
    playerColor: "w" as const,
    openingLabel: "Test Opening",
    feedback: "",
    isSubmitting: false,
    isAdvancing: false,
    isSessionCompleted: false,
    submitMove: mockSubmitMove,
    takeAutoplayOnce: mockTakeAutoplayOnce,
  };

  beforeEach(() => {
    user = userEvent.setup();
    vi.clearAllMocks();
    capturedProps = undefined as unknown as BoardProps;

    useBlinkGreen.mockReturnValue({
      blinkGreen: vi.fn(),
      blinkSquare: null,
    });

    useTrainingSession.mockReturnValue(baseHookValue);
    mockNavigate.mockClear();

    // Defaults: white to move; a legal move producing "<from><to>q"; a white
    // piece anywhere; e2 has one legal target.
    sideToMoveMock.mockReset().mockReturnValue("w");
    applyMoveMock
      .mockReset()
      .mockImplementation((_fen: string, from: string, to: string) => ({
        nextFen: "after-fen",
        uci: `${from}${to}q`,
      }));
    applyUciMock.mockReset().mockReturnValue({ nextFen: "after-fen" });
    legalMovesMock
      .mockReset()
      .mockImplementation((_fen: string, square: string) =>
        square === "e2" ? [{ to: "e4", promotion: undefined }] : [],
      );
    pieceColorAtMock.mockReset().mockReturnValue("w");
  });

  it("triggers blinkGreen animation when feedback is '✅ Correct!'", async () => {
    const mockBlinkGreen = vi.fn();
    useBlinkGreen.mockReturnValue({
      blinkGreen: mockBlinkGreen,
      blinkSquare: null,
    });

    useTrainingSession.mockReturnValue({
      ...baseHookValue,
      feedback: "",
    });

    const { rerender } = render(renderTraining());
    await waitFor(() => expect(capturedProps).toBeDefined());

    act(() => {
      capturedProps.onMove?.("e2", "e4");
    });

    useTrainingSession.mockReturnValue({
      ...baseHookValue,
      feedback: "✅ Correct!",
    });

    rerender(renderTraining());

    expect(mockBlinkGreen).toHaveBeenCalledWith("e2e4q", 2);
  });

  describe("Move Interactions", () => {
    it("submits move via onMove (drag or click)", async () => {
      render(renderTraining());
      await waitFor(() => expect(capturedProps).toBeDefined());

      act(() => {
        capturedProps.onMove?.("e2", "e4");
      });

      expect(mockSubmitMove).toHaveBeenCalledWith("e2e4q", "start-fen");
    });

    it("sets local illegal-move feedback when the move is rejected", async () => {
      applyMoveMock.mockReturnValueOnce(null);
      render(renderTraining());
      await waitFor(() => expect(capturedProps).toBeDefined());

      let result: boolean | undefined;
      act(() => {
        result = capturedProps.onMove?.("e2", "e4");
      });

      expect(result).toBe(false);
      expect(await screen.findByText(/illegal move/i)).toBeTruthy();
    });

    it("submits the promotion uci returned by applyMove", async () => {
      useTrainingSession.mockReturnValue({
        ...baseHookValue,
        correctMoveUci: "a7a8n",
      });
      applyMoveMock.mockReturnValueOnce({ nextFen: "after-fen", uci: "a7a8n" });

      render(renderTraining());
      await waitFor(() => expect(capturedProps).not.toBeUndefined());

      act(() => {
        capturedProps.onMove?.("a7", "a8");
      });

      await waitFor(() =>
        expect(mockSubmitMove).toHaveBeenCalledWith("a7a8n", "start-fen"),
      );
    });

    it("submits move via text input", async () => {
      render(renderTraining());
      const input = screen.getByPlaceholderText(/e2e4/);
      const submitBtn = screen.getByRole("button", { name: /play/i });

      await user.type(input, "e2e4");
      await user.click(submitBtn);

      expect(mockSubmitMove).toHaveBeenCalledWith("e2e4", "start-fen");
    });
  });

  describe("Autoplay Logic", () => {
    it("automatically submits the correct move when it is black's turn", async () => {
      sideToMoveMock.mockReturnValue("b");
      mockTakeAutoplayOnce.mockReturnValue(true);
      render(renderTraining());
      await waitFor(() => {
        expect(mockSubmitMove).toHaveBeenCalledWith("e2e4", "start-fen", {
          silent: true,
        });
      });
    });

    it("does not re-trigger autoplay for an itemId it has already autoplayed", async () => {
      sideToMoveMock.mockReturnValue("b");
      mockTakeAutoplayOnce.mockReturnValue(true);

      const { rerender } = render(renderTraining());
      await waitFor(() => {
        expect(mockSubmitMove).toHaveBeenCalledWith("e2e4", "start-fen", {
          silent: true,
        });
      });
      mockSubmitMove.mockClear();

      // Re-render with the same itemId but a different fen so the autoplay
      // effect re-runs; lastAutoplayedItemIdRef already matches -> skip.
      useTrainingSession.mockReturnValue({
        ...baseHookValue,
        fen: "start-fen-2",
      });
      rerender(renderTraining());

      expect(mockSubmitMove).not.toHaveBeenCalled();
    });

    it("does not autoplay when the timeline is not at its latest position", async () => {
      const { rerender } = render(renderTraining());
      await waitFor(() => expect(capturedProps).toBeDefined());

      // Extend the timeline by one ply, then step back so we're not at latest.
      act(() => {
        capturedProps.onMove?.("e2", "e4");
      });
      mockSubmitMove.mockClear();

      await user.click(screen.getByRole("button", { name: /‹ Prev/i }));

      // Now switch to black-to-move with a fresh item — autoplay should be
      // skipped because the timeline isn't at the latest position.
      sideToMoveMock.mockReturnValue("b");
      mockTakeAutoplayOnce.mockReturnValue(true);
      useTrainingSession.mockReturnValue({
        ...baseHookValue,
        itemId: 11,
        correctMoveUci: "e7e5",
      });
      rerender(renderTraining());

      expect(mockSubmitMove).not.toHaveBeenCalledWith("e7e5", expect.anything());
    });

    it("does not autoplay if isSubmitting is true", async () => {
      sideToMoveMock.mockReturnValue("b");
      mockTakeAutoplayOnce.mockReturnValue(true);

      useTrainingSession.mockReturnValue({
        ...baseHookValue,
        isSubmitting: true,
      });

      render(renderTraining());
      expect(mockSubmitMove).not.toHaveBeenCalled();
    });
  });

  describe("Black-side play", () => {
    it("autoplays White's move when the trainee is playing Black", async () => {
      useTrainingSession.mockReturnValue({
        ...baseHookValue,
        playerColor: "b",
      });
      mockTakeAutoplayOnce.mockReturnValue(true);
      // sideToMoveMock defaults to "w" — the opponent's (White's) turn.
      render(renderTraining());
      await waitFor(() => {
        expect(mockSubmitMove).toHaveBeenCalledWith("e2e4", "start-fen", {
          silent: true,
        });
      });
    });

    it("allows picking up black pieces (not white) when playing Black", async () => {
      useTrainingSession.mockReturnValue({
        ...baseHookValue,
        playerColor: "b",
      });
      sideToMoveMock.mockReturnValue("b");
      pieceColorAtMock.mockImplementation((_fen: string, sq: string) =>
        sq === "e7" ? "b" : "w",
      );

      render(renderTraining());
      await waitFor(() => expect(capturedProps).toBeDefined());

      expect(capturedProps.onMoveStart?.("e7")).toBe(true);
      expect(capturedProps.onMoveStart?.("e2")).toBe(false);
    });

    it("passes moveColor=black to the board when playing Black", async () => {
      useTrainingSession.mockReturnValue({
        ...baseHookValue,
        playerColor: "b",
      });

      render(renderTraining());
      await waitFor(() => expect(capturedProps).toBeDefined());

      expect(capturedProps.moveColor).toBe("black");
      expect(capturedProps.orientation).toBe("black");
    });
  });

  describe("Piece pickup rules (onMoveStart)", () => {
    it("allows picking up a white piece and submits the move", async () => {
      render(renderTraining());
      await waitFor(() => expect(capturedProps).toBeDefined());

      expect(capturedProps.onMoveStart?.("e2")).toBe(true);

      act(() => {
        capturedProps.onMove?.("e2", "e4");
      });

      expect(mockSubmitMove).toHaveBeenCalledWith("e2e4q", "start-fen");
    });

    it("blocks picking up black pieces or empty squares", async () => {
      pieceColorAtMock.mockImplementation((_fen: string, sq: string) =>
        sq === "e5" ? "b" : null,
      );

      render(renderTraining());
      await waitFor(() => expect(capturedProps).toBeDefined());

      expect(capturedProps.onMoveStart?.("e5")).toBe(false); // black piece
      expect(capturedProps.onMoveStart?.("a1")).toBe(false); // empty square
    });

    it("exposes legal targets for the picked-up piece", async () => {
      render(renderTraining());
      await waitFor(() => expect(capturedProps).toBeDefined());

      const targets = capturedProps.getLegalMoves?.("e2");
      expect(targets).toEqual([{ to: "e4", promotion: undefined }]);
    });
  });

  describe("Hint System (2 levels, markers)", () => {
    it("marks only the from-square on Hint and from+to on More Hint", async () => {
      render(renderTraining());
      await waitFor(() => expect(capturedProps).toBeDefined());

      expect(hasMarker("e2", "hint")).toBe(false);
      expect(hasMarker("e4", "hint")).toBe(false);

      const hintBtn = screen.getByRole("button", { name: /hint/i });
      await user.click(hintBtn);

      expect(hasMarker("e2", "hint")).toBe(true);
      expect(hasMarker("e4", "hint")).toBe(false);

      await user.click(hintBtn);

      expect(hasMarker("e2", "hint")).toBe(true);
      expect(hasMarker("e4", "hint")).toBe(true);
    });
  });

  describe("Auto-hint on repeated misses", () => {
    // Simulates one submitted-and-wrong attempt via the same isSubmitting
    // true -> false lifecycle the real hook goes through. The backend always
    // reports the identical "❌ wrong move" text for any wrong-but-legal
    // move, so this deliberately reuses that exact string every time to
    // prove misses are counted by the submit lifecycle, not by feedback text
    // changing.
    const missOnce = (rerender: ReturnType<typeof render>["rerender"]) => {
      useTrainingSession.mockReturnValue({
        ...baseHookValue,
        isSubmitting: true,
        feedback: "",
      });
      rerender(renderTraining());

      useTrainingSession.mockReturnValue({
        ...baseHookValue,
        isSubmitting: false,
        feedback: "❌ wrong move",
      });
      rerender(renderTraining());
    };

    it("does nothing after a single miss", async () => {
      const { rerender } = render(renderTraining());
      await waitFor(() => expect(capturedProps).toBeDefined());

      missOnce(rerender);

      expect(hasMarker("e2", "hint")).toBe(false);
      expect(capturedProps.arrows ?? []).toHaveLength(0);
    });

    it("shows the source-square hint after 2 misses, even with identical feedback text each time", async () => {
      const { rerender } = render(renderTraining());
      await waitFor(() => expect(capturedProps).toBeDefined());

      missOnce(rerender);
      missOnce(rerender);

      expect(hasMarker("e2", "hint")).toBe(true);
      expect(hasMarker("e4", "hint")).toBe(false);
      expect(capturedProps.arrows ?? []).toHaveLength(0);
    });

    it("reveals the target square and draws an arrow to it after 4 misses", async () => {
      const { rerender } = render(renderTraining());
      await waitFor(() => expect(capturedProps).toBeDefined());

      missOnce(rerender);
      missOnce(rerender);
      missOnce(rerender);
      missOnce(rerender);

      expect(hasMarker("e2", "hint")).toBe(true);
      expect(hasMarker("e4", "hint")).toBe(true);
      expect(capturedProps.arrows).toEqual([
        { from: "e2", to: "e4", type: "info" },
      ]);
    });

    it("resets the miss count and hint level once the move is answered correctly", async () => {
      const { rerender } = render(renderTraining());
      await waitFor(() => expect(capturedProps).toBeDefined());

      missOnce(rerender);
      missOnce(rerender);
      expect(hasMarker("e2", "hint")).toBe(true);

      useTrainingSession.mockReturnValue({
        ...baseHookValue,
        isSubmitting: false,
        feedback: "✅ Correct!",
      });
      rerender(renderTraining());

      expect(hasMarker("e2", "hint")).toBe(false);
      expect(capturedProps.arrows ?? []).toHaveLength(0);

      // A single miss on the next move must not immediately re-show the
      // hint — the count should have restarted at 0, not resumed at 2.
      missOnce(rerender);
      expect(hasMarker("e2", "hint")).toBe(false);
    });
  });

  it("resets hint level after feedback is '✅ Correct!'", async () => {
    const { rerender } = render(renderTraining());
    await waitFor(() => expect(capturedProps).toBeDefined());

    const hintBtn = screen.getByRole("button", { name: /hint/i });
    await user.click(hintBtn);

    expect(hasMarker("e2", "hint")).toBe(true);
    expect(hasMarker("e4", "hint")).toBe(false);

    useTrainingSession.mockReturnValue({
      ...baseHookValue,
      feedback: "✅ Correct!",
    });

    rerender(renderTraining());

    expect(hasMarker("e2", "hint")).toBe(false);
    expect(hasMarker("e4", "hint")).toBe(false);
  });

  it("navigates back to the dashboard via the exit button", async () => {
    render(renderTraining());
    await waitFor(() => expect(capturedProps).toBeDefined());

    await user.click(screen.getByRole("button", { name: /back to openings/i }));
    expect(mockNavigate).toHaveBeenCalledWith("/dashboard");
  });

  it("hint button is disabled while a session is completed and does nothing on stray clicks", async () => {
    useTrainingSession.mockReturnValue({
      ...baseHookValue,
      isSessionCompleted: true,
    });

    render(renderTraining());
    await waitFor(() => expect(capturedProps).toBeDefined());

    const hintBtn = screen.getByRole("button", { name: /hint/i });
    expect(hintBtn).toBeDisabled();
  });

  it("onMoveStart blocked while submitting, and onMove is a no-op for same-square drops", async () => {
    useTrainingSession.mockReturnValue({
      ...baseHookValue,
      isSubmitting: true,
    });

    render(renderTraining());
    await waitFor(() => expect(capturedProps).toBeDefined());

    expect(capturedProps.onMoveStart?.("e2")).toBe(false);
    expect(capturedProps.onMove?.("e2", "e2")).toBe(false);
    expect(mockSubmitMove).not.toHaveBeenCalled();
  });

  it("hint button click is a no-op when there is no itemId", async () => {
    useTrainingSession.mockReturnValue({
      ...baseHookValue,
      itemId: null,
    });

    render(renderTraining());
    await waitFor(() => expect(capturedProps).toBeDefined());

    const hintBtn = screen.getByRole("button", { name: /hint/i });
    await user.click(hintBtn);
    expect(hasMarker("e2", "hint")).toBe(false);
  });

  describe("Timeline stepper (Prev/Next)", () => {
    it("Prev is disabled at the start of the timeline; Next steps forward and Prev becomes enabled", async () => {
      render(renderTraining());
      await waitFor(() => expect(capturedProps).toBeDefined());

      const prevBtn = screen.getByRole("button", { name: /‹ Prev/i });
      const nextBtn = screen.getByRole("button", { name: /Next ›/i });

      expect(prevBtn).toBeDisabled();
      expect(nextBtn).toBeDisabled(); // only one fen in the timeline so far

      // Add a move to extend the timeline, then Next should become usable.
      act(() => {
        capturedProps.onMove?.("e2", "e4");
      });

      await waitFor(() => expect(prevBtn).toBeEnabled());
      expect(nextBtn).toBeDisabled(); // now at latest again

      await user.click(prevBtn);
      expect(nextBtn).toBeEnabled();

      await user.click(nextBtn);
      expect(nextBtn).toBeDisabled();
    });

    it("stepper buttons are disabled while busy (submitting/advancing)", async () => {
      useTrainingSession.mockReturnValue({
        ...baseHookValue,
        isSubmitting: true,
      });

      render(renderTraining());
      await waitFor(() => expect(capturedProps).toBeDefined());

      expect(screen.getByRole("button", { name: /‹ Prev/i })).toBeDisabled();
      expect(screen.getByRole("button", { name: /Next ›/i })).toBeDisabled();
    });
  });

  describe("Win celebration", () => {
    it("fires celebrateWin once when the session transitions to completed", async () => {
      const { rerender } = render(renderTraining());
      await waitFor(() => expect(capturedProps).toBeDefined());
      expect(mockCelebrateWin).not.toHaveBeenCalled();

      useTrainingSession.mockReturnValue({
        ...baseHookValue,
        isSessionCompleted: true,
      });
      rerender(renderTraining());

      expect(mockCelebrateWin).toHaveBeenCalledTimes(1);

      // A further re-render while still completed should not re-fire it.
      rerender(renderTraining());
      expect(mockCelebrateWin).toHaveBeenCalledTimes(1);
    });

    it("does not fire celebrateWin when the session starts out completed and stays completed", async () => {
      useTrainingSession.mockReturnValue({
        ...baseHookValue,
        isSessionCompleted: true,
      });

      const { rerender } = render(renderTraining());
      await waitFor(() => expect(capturedProps).toBeDefined());

      rerender(renderTraining());
      expect(mockCelebrateWin).not.toHaveBeenCalled();
    });
  });

  describe("Last-move highlight", () => {
    it("keeps the previous move highlighted through an in-flight attempt, and only moves once the new move is confirmed correct", async () => {
      const { rerender } = render(renderTraining());
      await waitFor(() => expect(capturedProps).toBeDefined());

      // Establish an initial confirmed last move (d2-d4).
      applyMoveMock.mockReturnValueOnce({ nextFen: "after-fen", uci: "d2d4" });
      act(() => {
        capturedProps.onMove?.("d2", "d4");
      });
      useTrainingSession.mockReturnValue({
        ...baseHookValue,
        feedback: "✅ Correct!",
      });
      rerender(renderTraining());
      expect(hasMarker("d2", "lastmove")).toBe(true);
      expect(hasMarker("d4", "lastmove")).toBe(true);

      // Next item: feedback resets, then the player attempts e2-e4.
      useTrainingSession.mockReturnValue({
        ...baseHookValue,
        feedback: "",
      });
      rerender(renderTraining());

      applyMoveMock.mockReturnValueOnce({ nextFen: "after-fen", uci: "e2e4" });
      act(() => {
        capturedProps.onMove?.("e2", "e4");
      });

      // Still showing the previous move — the attempt hasn't been confirmed yet.
      expect(hasMarker("d2", "lastmove")).toBe(true);
      expect(hasMarker("d4", "lastmove")).toBe(true);
      expect(hasMarker("e2", "lastmove")).toBe(false);
      expect(hasMarker("e4", "lastmove")).toBe(false);

      // Once accepted, the highlight moves to the new move.
      useTrainingSession.mockReturnValue({
        ...baseHookValue,
        feedback: "✅ Correct!",
      });
      rerender(renderTraining());

      expect(hasMarker("e2", "lastmove")).toBe(true);
      expect(hasMarker("e4", "lastmove")).toBe(true);
      expect(hasMarker("d2", "lastmove")).toBe(false);
    });

    it("does not move the highlight when the attempted move is rejected", async () => {
      const { rerender } = render(renderTraining());
      await waitFor(() => expect(capturedProps).toBeDefined());

      applyMoveMock.mockReturnValueOnce({ nextFen: "after-fen", uci: "d2d4" });
      act(() => {
        capturedProps.onMove?.("d2", "d4");
      });
      useTrainingSession.mockReturnValue({
        ...baseHookValue,
        feedback: "✅ Correct!",
      });
      rerender(renderTraining());

      useTrainingSession.mockReturnValue({ ...baseHookValue, feedback: "" });
      rerender(renderTraining());

      applyMoveMock.mockReturnValueOnce({ nextFen: "after-fen", uci: "e2e5" });
      act(() => {
        capturedProps.onMove?.("e2", "e5");
      });

      useTrainingSession.mockReturnValue({
        ...baseHookValue,
        feedback: "❌ Incorrect move",
      });
      rerender(renderTraining());

      expect(hasMarker("d2", "lastmove")).toBe(true);
      expect(hasMarker("d4", "lastmove")).toBe(true);
      expect(hasMarker("e2", "lastmove")).toBe(false);
      expect(hasMarker("e5", "lastmove")).toBe(false);
    });
  });
});
