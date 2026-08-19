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
};

describe("Puzzles Page", () => {
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    user = userEvent.setup();
    mockNavigate.mockReset();
    applyMoveMock.mockReset();
    (api.get as ReturnType<typeof vi.fn>).mockReset();
    (api.post as ReturnType<typeof vi.fn>).mockReset();
  });

  const renderPuzzles = () =>
    render(
      <MemoryRouter>
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
    expect(screen.getByText("Find the best move.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Skip puzzle/ })).toBeEnabled();
  });

  it("increments streak and best streak on a correct move", async () => {
    (api.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      data: NEXT_PUZZLE,
    });
    (api.post as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      data: { correct: true, reason: "", fenAfter: NEXT_PUZZLE.fen },
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
  });

  it("resets streak and snaps the board back on a wrong move", async () => {
    (api.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      data: NEXT_PUZZLE,
    });
    (api.post as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      data: { correct: false, reason: "wrong move", fenAfter: null },
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

  it("redirects to login on a 401", async () => {
    (api.get as ReturnType<typeof vi.fn>).mockRejectedValueOnce({
      response: { status: 401 },
    });

    renderPuzzles();

    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith("/login"));
  });
});
