// react/src/pages/Puzzles.test.tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, waitFor, act, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { Puzzles } from "./Puzzles";
import api from "../api";
import "@testing-library/jest-dom";
import type { BoardProps } from "../components/Board";
import { PreferencesProvider } from "../context/PreferencesContext";

const {
  applyMoveMock,
  legalMovesMock,
  pieceColorAtMock,
  sideToMoveMock,
} = vi.hoisted(() => ({
  applyMoveMock: vi.fn(),
  legalMovesMock: vi.fn(() => []),
  pieceColorAtMock: vi.fn(() => "w"),
  sideToMoveMock: vi.fn(() => "w"),
}));

vi.mock("@knight-school/chess-core", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@knight-school/chess-core")>();
  return {
    ...actual,
    applyMove: applyMoveMock,
    legalMoves: legalMovesMock,
    pieceColorAt: pieceColorAtMock,
    sideToMove: sideToMoveMock,
  };
});

let capturedProps: BoardProps;

vi.mock("../components/Board", () => ({
  default: (props: BoardProps) => {
    capturedProps = props;
    return <div data-testid="board" />;
  },
}));

vi.mock("../api", () => ({
  default: { get: vi.fn(), post: vi.fn() },
}));

const { mockCelebratePuzzleCorrect } = vi.hoisted(() => ({
  mockCelebratePuzzleCorrect: vi.fn(),
}));
vi.mock("../utils/winCelebration", () => ({
  celebratePuzzleCorrect: mockCelebratePuzzleCorrect,
}));

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual =
    await vi.importActual<typeof import("react-router-dom")>(
      "react-router-dom",
    );
  return { ...actual, useNavigate: () => mockNavigate };
});

const NEXT_PUZZLE = {
  puzzleId: "p1",
  fen: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
  rating: 1500,
  themes: "fork",
  correctMoveUci: "e2e4",
  lastMoveUci: "e7e5",
  moveIndex: 0,
  solverMovesTotal: 1,
};

const NEXT_MULTI_MOVE_PUZZLE = {
  ...NEXT_PUZZLE,
  themes: "mateIn2",
  solverMovesTotal: 2,
};

const hasMarker = (square: string, type: "hint" | "lastmove") =>
  (capturedProps.markers ?? []).some(
    (m) => m.square === square && m.type === type,
  );

describe("Puzzles Page", () => {
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    user = userEvent.setup();
    mockNavigate.mockReset();
    mockCelebratePuzzleCorrect.mockReset();
    applyMoveMock.mockReset();
    (api.get as ReturnType<typeof vi.fn>).mockReset();
    (api.post as ReturnType<typeof vi.fn>).mockReset();
  });

  const renderPuzzles = (initialEntries = ["/puzzles"]) =>
    render(
      <MemoryRouter initialEntries={initialEntries}>
        <PreferencesProvider>
          <Puzzles />
        </PreferencesProvider>
      </MemoryRouter>,
    );

  it("loads the first puzzle and shows rating + zeroed streak", async () => {
    (api.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      data: NEXT_PUZZLE,
    });

    renderPuzzles();

    await screen.findByText("Rating ~1500");
    expect(screen.getByText(/Streak: 0/)).toBeInTheDocument();
    expect(
      screen.getByText("Find the best move for White."),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Skip puzzle/ })).toBeEnabled();
  });

  it("shows the Black-to-move prompt when Black is the solver", async () => {
    (api.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      data: NEXT_PUZZLE,
    });
    sideToMoveMock.mockReturnValue("b");

    renderPuzzles();

    await screen.findByText("Rating ~1500");
    expect(
      screen.getByText("Find the best move for Black."),
    ).toBeInTheDocument();

    sideToMoveMock.mockReturnValue("w");
  });

  it("increments streak and best streak on a correct move", async () => {
    (api.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      data: NEXT_PUZZLE,
    });
    (api.post as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      data: {
        correct: true,
        reason: "",
        fenAfter: NEXT_PUZZLE.fen,
        puzzleComplete: true,
      },
    });

    renderPuzzles();
    await screen.findByText("Rating ~1500");

    applyMoveMock.mockReturnValueOnce({
      nextFen: NEXT_PUZZLE.fen,
      uci: "e2e4",
    });

    act(() => {
      capturedProps.onMove?.("e2", "e4");
    });

    await screen.findByText("✅ Correct!");
    expect(screen.getByText("Solved: 1")).toBeInTheDocument();
    expect(screen.getByText(/Streak: 1/)).toBeInTheDocument();
    expect(screen.getByText(/best 1/)).toBeInTheDocument();
    expect(mockCelebratePuzzleCorrect).toHaveBeenCalledTimes(1);

    // Puzzle completion is manual: no second load happens until the user
    // clicks "Next puzzle", and Skip is hidden while complete.
    expect(api.get).toHaveBeenCalledTimes(1);
    expect(
      screen.queryByRole("button", { name: /Skip puzzle/ }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Next puzzle/ }),
    ).toBeInTheDocument();
  });

  it("advances to the next puzzle only when the Next puzzle button is clicked", async () => {
    (api.get as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({ data: NEXT_PUZZLE })
      .mockResolvedValueOnce({ data: { ...NEXT_PUZZLE, puzzleId: "p2" } });
    (api.post as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      data: {
        correct: true,
        reason: "",
        fenAfter: NEXT_PUZZLE.fen,
        puzzleComplete: true,
      },
    });

    renderPuzzles();
    await screen.findByText("Rating ~1500");

    applyMoveMock.mockReturnValueOnce({
      nextFen: NEXT_PUZZLE.fen,
      uci: "e2e4",
    });

    act(() => {
      capturedProps.onMove?.("e2", "e4");
    });

    const nextButton = await screen.findByRole("button", {
      name: /Next puzzle/,
    });
    expect(api.get).toHaveBeenCalledTimes(1);

    await user.click(nextButton);

    await waitFor(() => expect(api.get).toHaveBeenCalledTimes(2));
    expect(
      screen.queryByRole("button", { name: /Next puzzle/ }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Skip puzzle/ }),
    ).toBeInTheDocument();
  });

  it("keeps the puzzle open after a correct-but-not-final move in a multi-move puzzle", async () => {
    (api.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      data: NEXT_MULTI_MOVE_PUZZLE,
    });
    (api.post as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      data: {
        correct: true,
        reason: "",
        fenAfter: "r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3",
        puzzleComplete: false,
        opponentReplyUci: "g1f3",
        nextCorrectMoveUci: "b8c6",
      },
    });

    renderPuzzles();
    await screen.findByText("Rating ~1500");

    applyMoveMock.mockReturnValueOnce({
      nextFen: "rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2",
      uci: "e7e5",
    });

    act(() => {
      capturedProps.onMove?.("e7", "e5");
    });

    await screen.findByText("✅ Keep going…");
    // Not solved yet, no celebration, and the board is left interactive for
    // the next solver move rather than advancing to a new puzzle.
    expect(screen.queryByText("Solved: 1")).not.toBeInTheDocument();
    expect(mockCelebratePuzzleCorrect).not.toHaveBeenCalled();
    expect(capturedProps.position).toBe(
      "r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3",
    );
    expect(api.get).toHaveBeenCalledTimes(1); // loadNext() was not triggered

    // The second solver move is submitted with moveIndex 1.
    applyMoveMock.mockReturnValueOnce({
      nextFen: "r1bqkb1r/pppp1ppp/2n2n2/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 4 4",
      uci: "b8c6",
    });
    (api.post as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      data: { correct: true, reason: "", fenAfter: "final-fen", puzzleComplete: true },
    });

    act(() => {
      capturedProps.onMove?.("b8", "c6");
    });

    await screen.findByText("✅ Correct!");
    expect(api.post).toHaveBeenLastCalledWith("/puzzles/p1/attempts", {
      moveUci: "b8c6",
      moveIndex: 1,
    });
  });

  it("resets streak and snaps the board back on a wrong move", async () => {
    (api.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      data: NEXT_PUZZLE,
    });
    (api.post as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      data: { correct: false, reason: "wrong move", fenAfter: null, puzzleComplete: false },
    });

    renderPuzzles();
    await screen.findByText("Rating ~1500");

    applyMoveMock.mockReturnValueOnce({
      nextFen: "8/8/8/8/8/8/8/8 w - - 0 1",
      uci: "e2e5",
    });

    act(() => {
      capturedProps.onMove?.("e2", "e5");
    });

    await screen.findByText("❌ wrong move");
    expect(screen.getByText(/Streak: 0/)).toBeInTheDocument();
    expect(screen.queryByText(/best/)).not.toBeInTheDocument();
    expect(capturedProps.position).toBe(NEXT_PUZZLE.fen);
    expect(mockCelebratePuzzleCorrect).not.toHaveBeenCalled();
  });

  it("shows a Back to dashboard link when no puzzles are due", async () => {
    (api.get as ReturnType<typeof vi.fn>).mockRejectedValueOnce({
      response: { status: 404 },
    });

    renderPuzzles();

    const link = await screen.findByRole("link", {
      name: /Back to dashboard/,
    });
    expect(link).toHaveAttribute("href", "/dashboard");
  });

  it("skipping loads the next puzzle and resets the streak", async () => {
    (api.get as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({ data: NEXT_PUZZLE })
      .mockResolvedValueOnce({ data: { ...NEXT_PUZZLE, puzzleId: "p2" } });

    renderPuzzles();
    await screen.findByText("Rating ~1500");

    await user.click(screen.getByRole("button", { name: /Skip puzzle/ }));

    await waitFor(() => expect(api.get).toHaveBeenCalledTimes(2));
    expect(screen.getByText(/Streak: 0/)).toBeInTheDocument();
    // Excludes the just-shown puzzle so skip can't hand back the same one.
    expect(api.get).toHaveBeenNthCalledWith(2, "/puzzles/next", {
      params: { excludeId: "p1" },
    });
  });

  it("shows an empty state and hides Skip when no puzzles are due", async () => {
    (api.get as ReturnType<typeof vi.fn>).mockRejectedValueOnce({
      response: { status: 404 },
    });

    renderPuzzles();

    await screen.findByText(
      "No puzzles due right now — check back later.",
    );
    expect(
      screen.queryByRole("button", { name: /Skip puzzle/ }),
    ).not.toBeInTheDocument();
  });

  it("passes the theme query param to the API and shows a practicing indicator", async () => {
    (api.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      data: NEXT_PUZZLE,
    });

    renderPuzzles(["/puzzles?theme=fork"]);

    await screen.findByText("Rating ~1500");
    expect(api.get).toHaveBeenCalledWith("/puzzles/next", {
      params: { theme: "fork" },
    });
    expect(screen.getByText("Practicing: fork")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /Back to due puzzles/ }),
    ).toHaveAttribute("href", "/puzzles");
  });

  it("shows a theme-specific empty state when no themed puzzles are found", async () => {
    (api.get as ReturnType<typeof vi.fn>).mockRejectedValueOnce({
      response: { status: 404 },
    });

    renderPuzzles(["/puzzles?theme=skewer"]);

    await screen.findByText("No puzzles found for this theme.");
  });

  it("shows a Browse themes link when not in theme mode", async () => {
    (api.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      data: NEXT_PUZZLE,
    });

    renderPuzzles();

    await screen.findByText("Rating ~1500");
    expect(
      screen.getByRole("link", { name: /Browse themes/ }),
    ).toHaveAttribute("href", "/puzzles/themes");
  });

  describe("Hint", () => {
    it("marks only the from-square on first click, and from+to on second click", async () => {
      (api.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        data: NEXT_PUZZLE,
      });

      renderPuzzles();
      await screen.findByText("Rating ~1500");

      expect(hasMarker("e2", "hint")).toBe(false);
      expect(hasMarker("e4", "hint")).toBe(false);

      const hintBtn = screen.getByRole("button", { name: /hint/i });
      await user.click(hintBtn);

      expect(hasMarker("e2", "hint")).toBe(true);
      expect(hasMarker("e4", "hint")).toBe(false);

      await user.click(hintBtn);

      expect(hasMarker("e2", "hint")).toBe(true);
      expect(hasMarker("e4", "hint")).toBe(true);
      expect(capturedProps.arrows).toEqual([
        { from: "e2", to: "e4", type: "info" },
      ]);
    });

    it("does not carry an active hint over into the next puzzle", async () => {
      (api.get as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce({ data: NEXT_PUZZLE })
        .mockResolvedValueOnce({ data: { ...NEXT_PUZZLE, puzzleId: "p2" } });
      (api.post as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        data: {
          correct: true,
          reason: "",
          fenAfter: NEXT_PUZZLE.fen,
          puzzleComplete: true,
        },
      });

      renderPuzzles();
      await screen.findByText("Rating ~1500");

      const hintBtn = screen.getByRole("button", { name: /hint/i });
      await user.click(hintBtn);
      expect(hasMarker("e2", "hint")).toBe(true);

      applyMoveMock.mockReturnValueOnce({
        nextFen: NEXT_PUZZLE.fen,
        uci: "e2e4",
      });
      act(() => {
        capturedProps.onMove?.("e2", "e4");
      });

      const nextButton = await screen.findByRole("button", {
        name: /Next puzzle/,
      });
      await user.click(nextButton);
      await waitFor(() => expect(api.get).toHaveBeenCalledTimes(2));

      // Same correctMoveUci as the first puzzle (e2e4) — if hintLevel had
      // survived the puzzle switch, this would still show the hint markers.
      expect(hasMarker("e2", "hint")).toBe(false);
      expect(capturedProps.arrows ?? []).toHaveLength(0);
    });

    const missOnce = async () => {
      (api.post as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        data: { correct: false, reason: "wrong move", fenAfter: null, puzzleComplete: false },
      });
      applyMoveMock.mockReturnValueOnce({
        nextFen: "8/8/8/8/8/8/8/8 w - - 0 1",
        uci: "e2e5",
      });
      await act(async () => {
        capturedProps.onMove?.("e2", "e5");
      });
      await screen.findByText("❌ wrong move");
    };

    it("auto-reveals the source square after 2 misses, and source+destination after 4", async () => {
      (api.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        data: NEXT_PUZZLE,
      });

      renderPuzzles();
      await screen.findByText("Rating ~1500");

      await missOnce();
      expect(hasMarker("e2", "hint")).toBe(false);

      await missOnce();
      expect(hasMarker("e2", "hint")).toBe(true);
      expect(hasMarker("e4", "hint")).toBe(false);

      await missOnce();
      await missOnce();
      expect(hasMarker("e2", "hint")).toBe(true);
      expect(hasMarker("e4", "hint")).toBe(true);
      expect(capturedProps.arrows).toEqual([
        { from: "e2", to: "e4", type: "info" },
      ]);
    });

    it("resets the hint and miss count when the puzzle advances to its next required move", async () => {
      (api.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        data: NEXT_MULTI_MOVE_PUZZLE,
      });
      (api.post as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        data: {
          correct: true,
          reason: "",
          fenAfter: "r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3",
          puzzleComplete: false,
          opponentReplyUci: "g1f3",
          nextCorrectMoveUci: "b8c6",
        },
      });

      renderPuzzles();
      await screen.findByText("Rating ~1500");

      const hintBtn = screen.getByRole("button", { name: /hint/i });
      await user.click(hintBtn);
      expect(hasMarker("e2", "hint")).toBe(true);

      applyMoveMock.mockReturnValueOnce({
        nextFen: "rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2",
        uci: "e7e5",
      });
      act(() => {
        capturedProps.onMove?.("e7", "e5");
      });
      await screen.findByText("✅ Keep going…");

      // Hint was for the first move's e2e4; the puzzle is now on b8c6 — the
      // old hint must not still be showing e2 as the source square.
      expect(hasMarker("e2", "hint")).toBe(false);
      expect(capturedProps.arrows ?? []).toHaveLength(0);

      // And the miss count must have restarted too: a single miss on this
      // new move should not immediately re-show a hint.
      (api.post as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        data: { correct: false, reason: "wrong move", fenAfter: null, puzzleComplete: false },
      });
      applyMoveMock.mockReturnValueOnce({
        nextFen: "8/8/8/8/8/8/8/8 w - - 0 1",
        uci: "b8d7",
      });
      await act(async () => {
        capturedProps.onMove?.("b8", "d7");
      });
      await screen.findByText("❌ wrong move");
      expect(hasMarker("b8", "hint")).toBe(false);
    });
  });

  it("redirects to login on a 401", async () => {
    (api.get as ReturnType<typeof vi.fn>).mockRejectedValueOnce({
      response: { status: 401 },
    });

    renderPuzzles();

    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith("/login"));
  });
});
