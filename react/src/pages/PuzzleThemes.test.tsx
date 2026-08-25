// react/src/pages/PuzzleThemes.test.tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { PuzzleThemes } from "./PuzzleThemes";
import api from "../api";
import "@testing-library/jest-dom";

vi.mock("../api", () => ({
  default: { get: vi.fn(), post: vi.fn() },
}));

const THEME_COUNTS = [
  { theme: "endgame", count: 4688 },
  { theme: "fork", count: 873 },
  { theme: "backRankMate", count: 153 },
];

describe("PuzzleThemes Page", () => {
  beforeEach(() => {
    (api.get as ReturnType<typeof vi.fn>).mockReset();
  });

  const renderPage = () =>
    render(
      <MemoryRouter>
        <PuzzleThemes />
      </MemoryRouter>,
    );

  it("renders theme cards grouped by category with counts", async () => {
    (api.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      data: THEME_COUNTS,
    });

    renderPage();

    expect(await screen.findByText("fork")).toBeInTheDocument();
    expect(screen.getByText("873 puzzles")).toBeInTheDocument();
    expect(screen.getByText("endgame")).toBeInTheDocument();
    expect(screen.getByText("4688 puzzles")).toBeInTheDocument();
    expect(screen.getByText("back Rank Mate")).toBeInTheDocument();
  });

  it("links each theme card to the practice-mode puzzles route", async () => {
    (api.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      data: THEME_COUNTS,
    });

    renderPage();

    const forkLink = await screen.findByRole("link", { name: /fork/ });
    expect(forkLink).toHaveAttribute("href", "/puzzles?theme=fork");
  });

  it("omits groups with no matching themes from the response", async () => {
    (api.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      data: [{ theme: "fork", count: 10 }],
    });

    renderPage();

    await screen.findByText("fork");
    expect(screen.queryByText("Mates")).not.toBeInTheDocument();
  });
});
