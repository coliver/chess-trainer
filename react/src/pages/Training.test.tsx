//frontend/src/pages/Training.test.tsx
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, waitFor, act, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Training } from "./Training";
import { useTrainingSession } from "../hooks/useTrainingSession";
import { useBlinkGreen } from "../hooks/useBlinkGreen";
import "@testing-library/jest-dom";
import type { BoardProps } from "../components/Board";

vi.mock("../hooks/useTrainingSession");
vi.mock("../hooks/useBlinkGreen");

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

vi.mock("@knight-school/chess-core", () => ({
  applyMove: applyMoveMock,
  applyUci: applyUciMock,
  legalMoves: legalMovesMock,
  pieceColorAt: pieceColorAtMock,
  sideToMove: sideToMoveMock,
}));

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

vi.mock("react-router-dom", () => ({
  useParams: () => ({ id: "sess-1" }),
  useNavigate: () => vi.fn(),
}));

type FenTurnBadgeProps = { fen: string };

vi.mock("../components/FenTurnBadge", () => ({
  default: ({ fen }: FenTurnBadgeProps) => (
    <div data-testid="fen-badge">{fen}</div>
  ),
}));

const hasMarker = (square: string, type: "hint" | "blink") =>
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

  afterEach(() => {
    cleanup();
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

    const { rerender } = render(<Training />);
    await waitFor(() => expect(capturedProps).toBeDefined());

    act(() => {
      capturedProps.onMove?.("e2", "e4");
    });

    useTrainingSession.mockReturnValue({
      ...baseHookValue,
      feedback: "✅ Correct!",
    });

    rerender(<Training />);

    expect(mockBlinkGreen).toHaveBeenCalledWith("e2e4q", 2);
  });

  describe("Move Interactions", () => {
    it("submits move via onMove (drag or click)", async () => {
      render(<Training />);
      await waitFor(() => expect(capturedProps).toBeDefined());

      act(() => {
        capturedProps.onMove?.("e2", "e4");
      });

      expect(mockSubmitMove).toHaveBeenCalledWith("e2e4q", "start-fen");
    });

    it("sets local illegal-move feedback when the move is rejected", async () => {
      applyMoveMock.mockReturnValueOnce(null);
      render(<Training />);
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

      render(<Training />);
      await waitFor(() => expect(capturedProps).not.toBeUndefined());

      act(() => {
        capturedProps.onMove?.("a7", "a8");
      });

      await waitFor(() =>
        expect(mockSubmitMove).toHaveBeenCalledWith("a7a8n", "start-fen"),
      );
    });

    it("submits move via text input", async () => {
      render(<Training />);
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
      render(<Training />);
      await waitFor(() => {
        expect(mockSubmitMove).toHaveBeenCalledWith("e2e4", "start-fen");
      });
    });

    it("does not autoplay if isSubmitting is true", async () => {
      sideToMoveMock.mockReturnValue("b");
      mockTakeAutoplayOnce.mockReturnValue(true);

      useTrainingSession.mockReturnValue({
        ...baseHookValue,
        isSubmitting: true,
      });

      render(<Training />);
      expect(mockSubmitMove).not.toHaveBeenCalled();
    });
  });

  describe("Piece pickup rules (onMoveStart)", () => {
    it("allows picking up a white piece and submits the move", async () => {
      render(<Training />);
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

      render(<Training />);
      await waitFor(() => expect(capturedProps).toBeDefined());

      expect(capturedProps.onMoveStart?.("e5")).toBe(false); // black piece
      expect(capturedProps.onMoveStart?.("a1")).toBe(false); // empty square
    });

    it("exposes legal targets for the picked-up piece", async () => {
      render(<Training />);
      await waitFor(() => expect(capturedProps).toBeDefined());

      const targets = capturedProps.getLegalMoves?.("e2");
      expect(targets).toEqual([{ to: "e4", promotion: undefined }]);
    });
  });

  describe("Hint System (2 levels, markers)", () => {
    it("marks only the from-square on Hint and from+to on More Hint", async () => {
      render(<Training />);
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

  it("resets hint level after feedback is '✅ Correct!'", async () => {
    const { rerender } = render(<Training />);
    await waitFor(() => expect(capturedProps).toBeDefined());

    const hintBtn = screen.getByRole("button", { name: /hint/i });
    await user.click(hintBtn);

    expect(hasMarker("e2", "hint")).toBe(true);
    expect(hasMarker("e4", "hint")).toBe(false);

    useTrainingSession.mockReturnValue({
      ...baseHookValue,
      feedback: "✅ Correct!",
    });

    rerender(<Training />);

    expect(hasMarker("e2", "hint")).toBe(false);
    expect(hasMarker("e4", "hint")).toBe(false);
  });
});
