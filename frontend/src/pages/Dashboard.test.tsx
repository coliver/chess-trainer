// frontend/src/pages/Dashboard.test.tsx
import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { MemoryRouter } from "react-router-dom";

import { Dashboard } from "./Dashboard";
import api from "../api";

vi.mock("../api", () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual =
    await vi.importActual<typeof import("react-router-dom")>(
      "react-router-dom",
    );
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// SVG imports are used as URLs; mock them to simple strings
vi.mock("../assets/classics.svg", () => ({ default: "classics.svg" }));
vi.mock("../assets/up-right-arrow.svg", () => ({
  default: "up-right-arrow.svg",
}));
vi.mock("../assets/target.svg", () => ({ default: "target.svg" }));
vi.mock("../assets/branch.svg", () => ({ default: "branch.svg" }));

// Mock KnightSchoolIcon (it’s a component import, not an svg URL)
vi.mock("../components/KnightSchoolIcon", () => ({
  KnightSchoolIcon: ({ width, height }: { width: string; height: string }) => (
    <div data-testid="knight-school-icon">
      icon {width}x{height}
    </div>
  ),
}));

type Opening = { name: string; eco: string };

describe("Dashboard", () => {
  const user = userEvent.setup();

  const openings: Opening[] = [
    { eco: "B10", name: "Caro-Kann" },
    { eco: "B20", name: "Sicilian" },
  ];

  beforeEach(() => {
    mockNavigate.mockReset();
    localStorage.clear();

    localStorage.setItem("username", "Chris");

    (api.get as unknown as ReturnType<typeof vi.fn>).mockReset();
    (api.post as unknown as ReturnType<typeof vi.fn>).mockReset();
  });

  it("loads openings and selects the first opening by default", async () => {
    (api.get as any).mockResolvedValueOnce({ data: openings });

    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>,
    );

    const input = await screen.findByRole("combobox", {
      name: "Search openings",
    });

    // Wait until the query is set to the first opening
    await waitFor(() => {
      expect((input as HTMLInputElement).value).toBe(
        `${openings[0].eco} — ${openings[0].name}`,
      );
    });

    // Open the dropdown (the component opens on click)
    await user.click(input);

    // Now options should exist
    expect(
      screen.getByRole("option", { name: "B10 — Caro-Kann" }),
    ).toBeInTheDocument();
    await waitFor(() => {
      expect(
        screen.queryByRole("option", { name: "B20 — Sicilian" }),
      ).not.toBeInTheDocument();
    });
  });

  it("clicking the Start button launches a training session and navigates to /training/:id", async () => {
    (api.get as any).mockResolvedValueOnce({ data: openings });
    (api.post as any).mockResolvedValueOnce({ data: { id: 123 } });

    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>,
    );

    // Only the first tile Start is wired (Start Training)
    const startButtons = await screen.findAllByRole("button", {
      name: "Start",
    });
    expect(startButtons.length).toBeGreaterThan(0);

    await user.click(startButtons[0]);

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith("/training-sessions", {
        openingName: openings[0].name,
      });
      expect(mockNavigate).toHaveBeenCalledWith("/training/123");
    });
  });

  it("uses the username from localStorage in the greeting", async () => {
    (api.get as any).mockResolvedValueOnce({ data: openings });

    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>,
    );

    // greeting is synchronous; no need to wait for openings
    await screen.findByRole("heading", { name: /Chris/i })
  });
});
