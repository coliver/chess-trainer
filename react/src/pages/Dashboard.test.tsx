// frontend/src/pages/Dashboard.test.tsx
import { render, screen, waitFor } from "@testing-library/react";
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
    (api.get as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: openings,
    });
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
      document.querySelector(".opening-description--empty"),
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
      });
      expect(mockNavigate).toHaveBeenCalledWith("/training/123");
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
    // no DB description on the variation -> factual fallback text
    expect(
      screen.getByText(/a variation of the Sicilian Defense/i),
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
      });
    });
  });
});
