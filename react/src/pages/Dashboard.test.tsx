// frontend/src/pages/Dashboard.test.tsx
import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { MemoryRouter } from "react-router-dom";

import { Dashboard } from "./Dashboard";
import api from "../api";

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

// The real cm-chessboard needs a DOM/canvas the test env doesn't provide, so
// stub the board renderers. Dashboard behaviour doesn't depend on them.
vi.mock("../components/Board", () => ({
  default: () => <div data-testid="board" />,
}));
vi.mock("../components/openings/BoardPreview", () => ({
  default: () => <div data-testid="board-preview" />,
}));

// jsdom has no IntersectionObserver (used by OpeningCard's lazy thumbnails).
beforeEach(() => {
  class IO {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  vi.stubGlobal("IntersectionObserver", IO);
});

const openings = [
  {
    name: "Sicilian Defense",
    eco: "B20",
    uci_moves: "e2e4 c7c5",
    description: "A sharp, combative reply to 1.e4.",
  },
  {
    name: "Sicilian Defense: Najdorf Variation",
    eco: "B90",
    uci_moves: "e2e4 c7c5 g1f3 d7d6 d2d4 c5d4 f3d4 g8f6 b1c3 a7a6",
  },
  { name: "Caro-Kann Defense", eco: "B10", uci_moves: "e2e4 c7c6" },
];

function renderDashboard() {
  return render(
    <MemoryRouter>
      <Dashboard />
    </MemoryRouter>,
  );
}

describe("Dashboard", () => {
  beforeEach(() => {
    mockNavigate.mockReset();
    (api.get as unknown as ReturnType<typeof vi.fn>).mockReset();
    (api.post as unknown as ReturnType<typeof vi.fn>).mockReset();
    (api.get as unknown as ReturnType<typeof vi.fn>).mockImplementation(
      (url: string) => {
        if (url === "/openings") return Promise.resolve({ data: openings });
        // progress/summary, progress/due, progress/weak-spots: no fixture
        // data by default so we don't produce duplicate React keys from
        // stray `openings` rows that lack the progress-summary shape.
        return Promise.resolve({ data: null });
      },
    );
    (api.post as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { id: 123 },
    });
  });

  it("groups openings into base cards and shows an empty preview initially", async () => {
    renderDashboard();

    // one card per base opening (Sicilian collapses its variation)
    expect(await screen.findByText("Sicilian Defense")).toBeInTheDocument();
    expect(screen.getByText("Caro-Kann Defense")).toBeInTheDocument();
    expect(screen.getByText("2 variations")).toBeInTheDocument();

    // nothing selected yet: Start disabled, empty description present
    const start = screen.getByRole("button", { name: /choose an opening/i });
    expect(start).toBeDisabled();
    expect(
      screen.getByText(/Pick an opening to preview the line/i),
    ).toBeInTheDocument();
  });

  it("drills into a base, auto-selects the main line, and starts a session", async () => {
    const user = userEvent.setup();
    renderDashboard();

    await user.click(await screen.findByText("Sicilian Defense"));

    // Level 2: breadcrumb + variation rows, main line auto-selected
    expect(screen.getByText("Main line")).toBeInTheDocument();
    expect(screen.getByText("Najdorf Variation")).toBeInTheDocument();

    const start = await screen.findByRole("button", {
      name: /Start\s+Sicilian Defense/i,
    });
    expect(start).toBeEnabled();
    // description comes from the DB field when present
    expect(
      screen.getByText(/A sharp, combative reply to 1\.e4\./i),
    ).toBeInTheDocument();

    await user.click(start);
    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith("/training-sessions", {
        openingEco: "B20",
        openingName: "Sicilian Defense",
        playerColor: "b",
      });
      expect(mockNavigate).toHaveBeenCalledWith("/training/123");
    });
  });

  it("starts a session with playerColor 'b' after choosing Play as Black", async () => {
    const user = userEvent.setup();
    renderDashboard();

    await user.click(await screen.findByText("Sicilian Defense"));
    const start = await screen.findByRole("button", {
      name: /Start\s+Sicilian Defense/i,
    });

    await user.click(screen.getByRole("radio", { name: /play as black/i }));
    await user.click(start);

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith("/training-sessions", {
        openingEco: "B20",
        openingName: "Sicilian Defense",
        playerColor: "b",
      });
    });
  });

  it("selecting a variation updates the Start label and falls back to authored text", async () => {
    const user = userEvent.setup();
    renderDashboard();

    await user.click(await screen.findByText("Sicilian Defense"));
    await user.click(screen.getByText("Najdorf Variation"));

    expect(
      await screen.findByRole("button", { name: /Start\s+Najdorf Variation/i }),
    ).toBeEnabled();
    // no DB description on the variation -> authored variation-specific text
    expect(
      screen.getByText(/most deeply analysed line in chess/i),
    ).toBeInTheDocument();
  });

  it("search flattens across all openings and selecting a match enables Start", async () => {
    const user = userEvent.setup();
    renderDashboard();

    await screen.findByText("Sicilian Defense");
    const search = screen.getByRole("searchbox", { name: "Search openings" });
    await user.type(search, "najdorf");

    const row = await screen.findByText("Sicilian Defense: Najdorf Variation");
    await user.click(row);

    const start = await screen.findByRole("button", {
      name: /Start\s+Najdorf Variation/i,
    });
    await user.click(start);
    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith("/training-sessions", {
        openingEco: "B90",
        openingName: "Sicilian Defense: Najdorf Variation",
        playerColor: "b",
      });
    });
  });

  it("search with no matches shows the no-results message", async () => {
    const user = userEvent.setup();
    renderDashboard();

    await screen.findByText("Sicilian Defense");
    const search = screen.getByRole("searchbox", { name: "Search openings" });
    await user.type(search, "zzzznotfound");

    expect(await screen.findByText(/No openings match/i)).toBeInTheDocument();
  });

  it("search pagination shows a 'Show N more' button and reveals more matches", async () => {
    const many = Array.from({ length: 65 }, (_, i) => ({
      name: `Test Opening ${i}`,
      eco: "Z99",
      uci_moves: "e2e4",
    }));
    (api.get as unknown as ReturnType<typeof vi.fn>).mockImplementation(
      (url: string) => {
        if (url === "/openings") return Promise.resolve({ data: many });
        return Promise.resolve({ data: null });
      },
    );

    const user = userEvent.setup();
    renderDashboard();

    const search = await screen.findByRole("searchbox", {
      name: "Search openings",
    });
    await user.type(search, "test opening");

    const more = await screen.findByText(/Show 5 more/i);
    await user.click(more);
    expect(screen.queryByText(/Show \d+ more/i)).not.toBeInTheDocument();
  });

  it("sorting toggles between Popular and A-Z", async () => {
    const user = userEvent.setup();
    renderDashboard();

    await screen.findByText("Sicilian Defense");
    const sortBtn = screen.getByRole("button", { name: /Sort: Popular/i });
    await user.click(sortBtn);
    expect(
      screen.getByRole("button", { name: /Sort: A–Z/i }),
    ).toBeInTheDocument();
  });

  it("renders progress summary stats, mastery bar, and weak spots when present", async () => {
    (api.get as unknown as ReturnType<typeof vi.fn>).mockImplementation(
      (url: string) => {
        if (url === "/openings") return Promise.resolve({ data: openings });
        if (url === "/progress/summary")
          return Promise.resolve({
            data: {
              positionsSeen: 40,
              overallAccuracy: 0.755,
              mastered: 10,
              currentStreak: 3,
              longestStreak: 7,
            },
          });
        if (url === "/progress/due")
          return Promise.resolve({ data: [{ id: 1 }, { id: 2 }] });
        if (url === "/progress/weak-spots")
          return Promise.resolve({
            data: [
              {
                openingName: "Sicilian Defense",
                fen: "fen1",
                correctMoveUci: "e2e4",
                attempts: 5,
                correctCount: 2,
                incorrectCount: 3,
              },
            ],
          });
        return Promise.resolve({ data: null });
      },
    );

    renderDashboard();

    expect(await screen.findByText("40")).toBeInTheDocument();
    expect(screen.getByText("76%")).toBeInTheDocument();
    expect(screen.getByText(/3 🔥/)).toBeInTheDocument();
    expect(screen.getByText(/best 7/)).toBeInTheDocument();

    const weakestOpeningTile = screen.getByRole("group", {
      name: "Weakest opening",
    });
    expect(
      within(weakestOpeningTile).getByText("Sicilian Defense"),
    ).toBeInTheDocument();
    expect(within(weakestOpeningTile).getByText("40%")).toBeInTheDocument();

    const reviewBtn = screen.getByRole("button", { name: /Review due \(2\)/i });
    expect(reviewBtn).toBeEnabled();
  });

  it("renders the trickiest-move callout with move number and top wrong move, expanding to show the rest", async () => {
    (api.get as unknown as ReturnType<typeof vi.fn>).mockImplementation(
      (url: string) => {
        if (url === "/openings") return Promise.resolve({ data: openings });
        if (url === "/progress/step-accuracy")
          return Promise.resolve({
            data: [
              {
                openingEco: "B20",
                openingName: "Sicilian Defense",
                orderIndex: 4,
                correctMoveUci: "d2d4",
                attempts: 6,
                correctCount: 2,
                incorrectCount: 4,
                accuracy: 0.333,
                commonWrongMoves: [{ moveUci: "g1f3", count: 3 }],
              },
              {
                openingEco: "C60",
                openingName: "Ruy Lopez",
                orderIndex: 6,
                correctMoveUci: "e1g1",
                attempts: 5,
                correctCount: 3,
                incorrectCount: 2,
                accuracy: 0.6,
                commonWrongMoves: [{ moveUci: "d2d3", count: 2 }],
              },
            ],
          });
        return Promise.resolve({ data: null });
      },
    );

    renderDashboard();

    const trickiestMoveTile = await screen.findByRole("group", {
      name: "Trickiest move",
    });
    expect(
      within(trickiestMoveTile).getByText("Sicilian Defense · move 3"),
    ).toBeInTheDocument();
    expect(within(trickiestMoveTile).getByText("33%")).toBeInTheDocument();
    expect(
      within(trickiestMoveTile).getByText("often plays g1f3"),
    ).toBeInTheDocument();

    const user = userEvent.setup();
    const seeAll = screen.getByRole("button", {
      name: /See all 2 weak spots/,
    });
    await user.click(seeAll);

    expect(screen.getByText("Ruy Lopez")).toBeInTheDocument();
    expect(
      screen.getByText("move 4 · often plays d2d3"),
    ).toBeInTheDocument();
    expect(screen.getByText("60%")).toBeInTheDocument();
  });

  it("renders puzzle progress stats when present", async () => {
    (api.get as unknown as ReturnType<typeof vi.fn>).mockImplementation(
      (url: string) => {
        if (url === "/openings") return Promise.resolve({ data: openings });
        if (url === "/puzzles/summary")
          return Promise.resolve({
            data: { puzzlesSeen: 12, overallAccuracy: 0.6, mastered: 4 },
          });
        return Promise.resolve({ data: null });
      },
    );

    renderDashboard();

    expect(await screen.findByText("Puzzles solved")).toBeInTheDocument();
    expect(screen.getByText("12")).toBeInTheDocument();
    expect(screen.getByText("60%")).toBeInTheDocument();
    expect(screen.getByText("4")).toBeInTheDocument();
  });

  it("shows a dash instead of NaN for puzzle accuracy when the user has no puzzles", async () => {
    (api.get as unknown as ReturnType<typeof vi.fn>).mockImplementation(
      (url: string) => {
        if (url === "/openings") return Promise.resolve({ data: openings });
        if (url === "/puzzles/summary")
          return Promise.resolve({
            data: { puzzlesSeen: 0, overallAccuracy: 0, mastered: 0 },
          });
        return Promise.resolve({ data: null });
      },
    );

    renderDashboard();

    expect(await screen.findByText("Puzzles solved")).toBeInTheDocument();
    expect(screen.queryByText(/NaN/)).not.toBeInTheDocument();
    expect(
      screen.getByLabelText("Puzzle progress").textContent,
    ).toContain("—");
  });

  it("startSession failure shows an alert", async () => {
    const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {});
    (api.post as unknown as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new Error("network fail"),
    );

    const user = userEvent.setup();
    renderDashboard();

    await user.click(await screen.findByText("Sicilian Defense"));
    const start = await screen.findByRole("button", {
      name: /Start\s+Sicilian Defense/i,
    });
    await user.click(start);

    await waitFor(() =>
      expect(alertSpy).toHaveBeenCalledWith(
        "Failed to start session. Check your connection or token.",
      ),
    );
    alertSpy.mockRestore();
  });

  it("startReviewSession navigates on success and alerts on failure", async () => {
    const user = userEvent.setup();
    (api.get as unknown as ReturnType<typeof vi.fn>).mockImplementation(
      (url: string) => {
        if (url === "/openings") return Promise.resolve({ data: openings });
        if (url === "/progress/due")
          return Promise.resolve({ data: [{ id: 1 }] });
        return Promise.resolve({ data: null });
      },
    );

    renderDashboard();

    const reviewBtn = await screen.findByRole("button", {
      name: /Review due \(1\)/i,
    });
    await user.click(reviewBtn);

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith("/training-sessions/from-due");
      expect(mockNavigate).toHaveBeenCalledWith("/training/123");
    });
  });

  it("startReviewSession alerts on failure", async () => {
    const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {});
    (api.get as unknown as ReturnType<typeof vi.fn>).mockImplementation(
      (url: string) => {
        if (url === "/openings") return Promise.resolve({ data: openings });
        if (url === "/progress/due")
          return Promise.resolve({ data: [{ id: 1 }] });
        return Promise.resolve({ data: null });
      },
    );
    (api.post as unknown as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new Error("fail"),
    );

    const user = userEvent.setup();
    renderDashboard();

    const reviewBtn = await screen.findByRole("button", {
      name: /Review due \(1\)/i,
    });
    await user.click(reviewBtn);

    await waitFor(() =>
      expect(alertSpy).toHaveBeenCalledWith("No positions due for review yet."),
    );
    alertSpy.mockRestore();
  });

  it("breadcrumb 'All openings' returns to the base grid", async () => {
    const user = userEvent.setup();
    renderDashboard();

    await user.click(await screen.findByText("Sicilian Defense"));
    expect(screen.getByText("Main line")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /All openings/i }));
    expect(screen.getByText("2 variations")).toBeInTheDocument();
  });

  it("defaults to an empty opening list when the API returns no data", async () => {
    (api.get as unknown as ReturnType<typeof vi.fn>).mockImplementation(
      (url: string) => {
        if (url === "/openings") return Promise.resolve({ data: undefined });
        return Promise.resolve({ data: null });
      },
    );

    renderDashboard();

    expect(
      await screen.findByText("0 openings · pick one to train"),
    ).toBeInTheDocument();
  });

  it("weak spots fall back to 'Opening' and an empty fen/move in the list key when fields are missing", async () => {
    (api.get as unknown as ReturnType<typeof vi.fn>).mockImplementation(
      (url: string) => {
        if (url === "/openings") return Promise.resolve({ data: openings });
        if (url === "/progress/weak-spots")
          return Promise.resolve({
            data: [{ attempts: 3, correctCount: 1, incorrectCount: 2 }],
          });
        return Promise.resolve({ data: null });
      },
    );

    renderDashboard();

    expect(await screen.findByText("Opening")).toBeInTheDocument();
    expect(screen.getByText("33%")).toBeInTheDocument();
  });

  it("logs and swallows errors when the openings/progress requests fail", async () => {
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    (api.get as unknown as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error("boom"),
    );

    renderDashboard();

    await waitFor(() => expect(errSpy).toHaveBeenCalled());
    errSpy.mockRestore();
  });

  describe("Greetings", () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
      localStorage.removeItem("username");
    });

    const setSystemHour = (hour: number) => {
      // Build the date from LOCAL components (not a UTC "Z" string) so it
      // matches the component's use of Date#getHours(), which is local time.
      // A UTC time would shift across greeting boundaries on non-UTC runners.
      vi.setSystemTime(new Date(2026, 0, 1, hour, 0, 0));
    };

    it("shows morning greeting when hour < 12 and includes username", async () => {
      localStorage.setItem("username", "Chris");
      setSystemHour(9);

      renderDashboard();
      await act(async () => {
        await vi.advanceTimersByTimeAsync(0);
      });

      expect(
        screen.getByRole("heading", { name: /Good morning/i }),
      ).toHaveTextContent("Good morning ☀️, Chris");
    });

    it("shows afternoon greeting when 12 <= hour < 18 (no username)", async () => {
      setSystemHour(14);
      localStorage.removeItem("username");

      renderDashboard();
      await act(async () => {
        await vi.advanceTimersByTimeAsync(0);
      });

      expect(
        screen.getByRole("heading", { name: /Good afternoon/i }),
      ).toHaveTextContent("Good afternoon 🌤️");
    });

    it("shows evening greeting when hour >= 18 and includes username", async () => {
      setSystemHour(20);
      localStorage.setItem("username", "Chris");

      renderDashboard();
      await act(async () => {
        await vi.advanceTimersByTimeAsync(0);
      });

      expect(
        screen.getByRole("heading", { name: /Good evening/i }),
      ).toHaveTextContent("Good evening 🌙, Chris");
    });
  });
});
