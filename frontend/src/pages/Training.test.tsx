//frontend/src/pages/Training.test.tsx
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, waitFor, act, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Training } from "./Training";
import { useTrainingSession } from "../hooks/useTrainingSession";
import { useBlinkGreen } from "../hooks/useBlinkGreen";
import { Chess } from "chess.js";
import "@testing-library/jest-dom";
import type { ChessboardOptions } from "react-chessboard";

import type { PieceDropHandlerArgs } from "react-chessboard";
import type { ComponentProps } from "react";

vi.mock("../hooks/useTrainingSession");
vi.mock("../hooks/useBlinkGreen");

let capturedOptions: ChessboardOptions;
const moveMock = vi.fn();
const fenMock = vi.fn();
const turnMock = vi.fn();

type ChessInstance = {
  move: (...args: unknown[]) => unknown;
  fen: (...args: unknown[]) => string;
  turn: () => string;
  get: (square: string) => { color: "w" | "b" } | null;
};

function ChessMock(this: ChessInstance) {
  this.move = moveMock as ChessInstance["move"];
  this.fen = fenMock as ChessInstance["fen"];
  this.turn = turnMock as ChessInstance["turn"];
  this.get = vi.fn().mockReturnValue({ color: "w" });
}

// Mock dat constructor
vi.mock("chess.js", () => ({
  Chess: vi.fn().mockImplementation(function ChessCtor(this: ChessInstance) {
    ChessMock.call(this);
  }),
}));

vi.mock("react-chessboard", () => ({
  Chessboard: (props: { options: ChessboardOptions }) => {
    capturedOptions = props.options;
    return <div data-testid="chessboard" />;
  },
}));

vi.mock("../api", () => ({
  default: { get: vi.fn(), post: vi.fn() },
}));

vi.mock("react-router-dom", () => ({
  useParams: () => ({ id: "sess-1" }),
  useNavigate: () => vi.fn(),
}));

vi.mock("../components/StartNewTrainingButton", () => ({
  StartNewTrainingButton: (
    p: ComponentProps<typeof StartNewTrainingButton>,
  ) => <button {...p} />,
}));
type FenTurnBadgeProps = { fen: string };

vi.mock("../components/FenTurnBadge", () => ({
  default: ({ fen }: FenTurnBadgeProps) => (
    <div data-testid="fen-badge">{fen}</div>
  ),
}));

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
    capturedOptions = undefined;

    useBlinkGreen.mockReturnValue({
      blinkGreen: vi.fn(),
      squareStyles: {},
    });

    useTrainingSession.mockReturnValue(baseHookValue);

    moveMock.mockReset();
    moveMock.mockReturnValue({ promotion: "q" });
    fenMock.mockReturnValue("after-fen");
    turnMock.mockReturnValue("w");
  });

  afterEach(() => {
    cleanup();
  });

  it("triggers blinkGreen animation when feedback is '✅ Correct!'", async () => {
    const mockBlinkGreen = vi.fn();
    useBlinkGreen.mockReturnValue({
      blinkGreen: mockBlinkGreen,
      squareStyles: {},
    });

    useTrainingSession.mockReturnValue({
      ...baseHookValue,
      feedback: "",
    });

    const { rerender } = render(<Training />);
    await waitFor(() => expect(capturedOptions).toBeDefined());

    act(() => {
      (capturedOptions as ChessboardOptions).onPieceDrop({
        sourceSquare: "e2",
        targetSquare: "e4",
      });
    });

    useTrainingSession.mockReturnValue({
      ...baseHookValue,
      feedback: "✅ Correct!",
    });

    rerender(<Training />);

    expect(mockBlinkGreen).toHaveBeenCalledWith("e2e4q", 2);
  });

  describe("Move Interactions", () => {
    it("submits move via drag and drop (onPieceDrop)", async () => {
      moveMock.mockReturnValue({ promotion: "q" });
      render(<Training />);
      await waitFor(() => expect(capturedOptions).toBeDefined());

      act(() => {
        (capturedOptions as ChessboardOptions).onPieceDrop({
          sourceSquare: "e2",
          targetSquare: "e4",
          piece: {
            isSparePiece: false,
            position: "",
            pieceType: "",
          },
        });
      });

      expect(mockSubmitMove).toHaveBeenCalledWith("e2e4q", "start-fen");
    });

    it("sets local illegal-move feedback when chess.js returns null", async () => {
      moveMock.mockReturnValue(null);
      render(<Training />);
      await waitFor(() => expect(capturedOptions).toBeDefined());

      act(() => {
        capturedOptions.onPieceDrop({
          sourceSquare: "e2",
          targetSquare: "e4",
          piece: {
            isSparePiece: false,
            position: "",
            pieceType: "",
          },
        } satisfies PieceDropHandlerArgs);
      });

      expect(await screen.findByText(/illegal move/i)).toBeTruthy();
    });

    it("handles specific promotion characters from correctMoveUci", async () => {
      useTrainingSession.mockReturnValue({
        ...baseHookValue,
        correctMoveUci: "a7a8n",
      });

      moveMock.mockReturnValue({ promotion: "n" });

      render(<Training />);
      await waitFor(() => expect(capturedOptions).not.toBeUndefined());

      act(() => {
        capturedOptions.onPieceDrop({
          sourceSquare: "a7",
          targetSquare: "a8",
          piece: {
            isSparePiece: false,
            position: "",
            pieceType: "",
          },
        } satisfies PieceDropHandlerArgs);
      });

      await waitFor(() =>
        expect(mockSubmitMove).toHaveBeenCalledWith("a7a8n", "start-fen"),
      );
    });

    it("submits move via text input", async () => {
      render(<Training />);
      const input = screen.getByPlaceholderText("e.g. e2e4");
      const submitBtn = screen.getByRole("button", { name: /submit/i });

      await user.type(input, "e2e4");
      await user.click(submitBtn);

      expect(mockSubmitMove).toHaveBeenCalledWith("e2e4", "start-fen");
    });
  });

  describe("Autoplay Logic", () => {
    it("automatically submits the correct move when it is black's turn", async () => {
      turnMock.mockReturnValue("b");
      mockTakeAutoplayOnce.mockReturnValue(true);
      render(<Training />);
      await waitFor(() => {
        expect(mockSubmitMove).toHaveBeenCalledWith("e2e4", "start-fen");
      });
    });

    it("does not autoplay if isSubmitting is true", async () => {
      turnMock.mockReturnValue("b");
      mockTakeAutoplayOnce.mockReturnValue(true);

      useTrainingSession.mockReturnValue({
        ...baseHookValue,
        isSubmitting: true,
      });

      render(<Training />);
      expect(mockSubmitMove).not.toHaveBeenCalled();
    });
  });

  describe("Click-to-Move Logic", () => {
    it("selects a white piece on first click and submits on second click", async () => {
      Chess.mockImplementation(function () {
        this.turn = () => "w";
        this.move = moveMock;
        this.fen = fenMock;
        this.get = vi.fn().mockImplementation((sq: string) => {
          if (sq === "e2") return { color: "w" };
          return null;
        });
      });

      render(<Training />);
      await waitFor(() => expect(capturedOptions).toBeDefined());

      act(() => {
        capturedOptions.onSquareClick({ square: "e2" });
      });

      act(() => {
        capturedOptions.onSquareClick({ square: "e4" });
      });

      expect(mockSubmitMove).toHaveBeenCalledWith("e2e4q", "start-fen");
    });

    it("deselects the piece if the same square is clicked twice", async () => {
      Chess.mockImplementation(function () {
        this.turn = () => "w";
        this.get = vi.fn().mockReturnValue({ color: "w" });
      });

      render(<Training />);
      await waitFor(() => expect(capturedOptions).toBeDefined());

      act(() => {
        capturedOptions.onSquareClick({ square: "e2" });
      });
      act(() => {
        capturedOptions.onSquareClick({ square: "e2" });
      });

      act(() => {
        capturedOptions.onSquareClick({ square: "e4" });
      });

      expect(mockSubmitMove).not.toHaveBeenCalled();
    });

    it("ignores clicks on black pieces or empty squares for the first selection", async () => {
      Chess.mockImplementation(function () {
        this.turn = () => "w";
        this.get = vi.fn().mockImplementation((sq: string) => {
          if (sq === "e5") return { color: "b" };
          return null;
        });
      });

      render(<Training />);
      await waitFor(() => expect(capturedOptions).toBeDefined());

      act(() => {
        capturedOptions.onSquareClick({ square: "e5" });
      });
      act(() => {
        capturedOptions.onSquareClick({ square: "a1" });
      });
      act(() => {
        capturedOptions.onSquareClick({ square: "e4" });
      });

      expect(mockSubmitMove).not.toHaveBeenCalled();
    });
  });

  describe("Hint System (2 levels, no arrows)", () => {
    it("shows only from-square on Hint and from+to on More Hint", async () => {
      render(<Training />);
      await waitFor(() => expect(capturedOptions).toBeDefined());

      expect(capturedOptions.squareStyles?.["e2"]).toBeUndefined();
      expect(capturedOptions.squareStyles?.["e4"]).toBeUndefined();

      const hintBtn = screen.getByRole("button", { name: /hint/i });
      await user.click(hintBtn);

      expect(capturedOptions.squareStyles["e2"]).toBeDefined();
      expect(capturedOptions.squareStyles["e4"]).toBeUndefined();

      await user.click(hintBtn);

      expect(capturedOptions.squareStyles["e2"]).toBeDefined();
      expect(capturedOptions.squareStyles["e4"]).toBeDefined();

      expect(capturedOptions.customArrows).toBeUndefined();
    });
  });

  it("resets hint level after feedback is '✅ Correct!'", async () => {
    const { rerender } = render(<Training />);
    await waitFor(() => expect(capturedOptions).toBeDefined());

    const hintBtn = screen.getByRole("button", { name: /hint/i });
    await user.click(hintBtn);

    expect(capturedOptions.squareStyles["e2"]).toBeDefined();
    expect(capturedOptions.squareStyles["e4"]).toBeUndefined();

    useTrainingSession.mockReturnValue({
      ...baseHookValue,
      feedback: "✅ Correct!",
    });

    rerender(<Training />);

    expect(capturedOptions.squareStyles["e2"]).toBeUndefined();
    expect(capturedOptions.squareStyles["e4"]).toBeUndefined();
  });
});
