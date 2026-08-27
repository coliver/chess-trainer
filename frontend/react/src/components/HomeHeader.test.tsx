// src/components/HomeHeader.test.tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { MemoryRouter } from "react-router-dom";

import { HomeHeader } from "./HomeHeader";
import { useAuth } from "../hooks/useAuth";

vi.mock("../hooks/useAuth", () => ({
  useAuth: vi.fn(),
}));

vi.mock("./OverflowMenu", () => ({
  OverflowMenu: ({ open }: { open: boolean }) =>
    open ? <div data-testid="overflow-menu" /> : null,
}));

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <HomeHeader />
    </MemoryRouter>,
  );
}

describe("HomeHeader", () => {
  beforeEach(() => {
    (useAuth as ReturnType<typeof vi.fn>).mockReset();
  });

  it("hides tabs when logged out", () => {
    (useAuth as ReturnType<typeof vi.fn>).mockReturnValue({
      isLoggedIn: false,
      username: null,
    });
    renderAt("/dashboard");

    expect(screen.queryByText("Openings")).not.toBeInTheDocument();
  });

  it("marks the openings tab active on the dashboard route", () => {
    (useAuth as ReturnType<typeof vi.fn>).mockReturnValue({
      isLoggedIn: true,
      username: "alice",
    });
    renderAt("/dashboard");

    expect(screen.getByText("Openings")).toHaveClass("active");
    expect(screen.getByText("Puzzles")).not.toHaveClass("active");
  });

  it("marks the puzzles tab active on the puzzles route", () => {
    (useAuth as ReturnType<typeof vi.fn>).mockReturnValue({
      isLoggedIn: true,
      username: "alice",
    });
    renderAt("/puzzles");

    expect(screen.getByText("Puzzles")).toHaveClass("active");
    expect(screen.getByText("Openings")).not.toHaveClass("active");
  });

  it("links the puzzles tab to the theme picker, not straight into a puzzle", () => {
    (useAuth as ReturnType<typeof vi.fn>).mockReturnValue({
      isLoggedIn: true,
      username: "alice",
    });
    renderAt("/dashboard");

    expect(screen.getByText("Puzzles")).toHaveAttribute(
      "href",
      "/puzzles/themes",
    );
  });

  it("hides tabs entirely off the dashboard/puzzles routes", () => {
    (useAuth as ReturnType<typeof vi.fn>).mockReturnValue({
      isLoggedIn: true,
      username: "alice",
    });
    renderAt("/settings");

    expect(screen.queryByText("Openings")).not.toBeInTheDocument();
    expect(screen.queryByText("Puzzles")).not.toBeInTheDocument();
  });

  it("toggles the overflow menu open on menu button click", async () => {
    (useAuth as ReturnType<typeof vi.fn>).mockReturnValue({
      isLoggedIn: false,
      username: null,
    });
    const user = userEvent.setup();
    renderAt("/dashboard");

    expect(screen.queryByTestId("overflow-menu")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Menu" }));

    expect(screen.getByTestId("overflow-menu")).toBeInTheDocument();
  });
});
