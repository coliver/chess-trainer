// src/components/HomeHeader.test.tsx
import { render, screen, within } from "@testing-library/react";
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

  it("hides both the section tabs and the bottom nav when logged out", () => {
    (useAuth as ReturnType<typeof vi.fn>).mockReturnValue({
      isLoggedIn: false,
      username: null,
    });
    renderAt("/dashboard");

    expect(
      screen.queryByRole("navigation", { name: "Section tabs" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("navigation", { name: "Bottom navigation" }),
    ).not.toBeInTheDocument();
  });

  it("marks the openings tab active on the dashboard route", () => {
    (useAuth as ReturnType<typeof vi.fn>).mockReturnValue({
      isLoggedIn: true,
      username: "alice",
    });
    renderAt("/dashboard");

    const sectionTabs = screen.getByRole("navigation", {
      name: "Section tabs",
    });
    expect(within(sectionTabs).getByText("Openings")).toHaveClass("active");
    expect(within(sectionTabs).getByText("Puzzles")).not.toHaveClass(
      "active",
    );
  });

  it("marks the puzzles tab active on the puzzles route", () => {
    (useAuth as ReturnType<typeof vi.fn>).mockReturnValue({
      isLoggedIn: true,
      username: "alice",
    });
    renderAt("/puzzles");

    const sectionTabs = screen.getByRole("navigation", {
      name: "Section tabs",
    });
    expect(within(sectionTabs).getByText("Puzzles")).toHaveClass("active");
    expect(within(sectionTabs).getByText("Openings")).not.toHaveClass(
      "active",
    );
  });

  it("links the puzzles tab to the theme picker, not straight into a puzzle", () => {
    (useAuth as ReturnType<typeof vi.fn>).mockReturnValue({
      isLoggedIn: true,
      username: "alice",
    });
    renderAt("/dashboard");

    const sectionTabs = screen.getByRole("navigation", {
      name: "Section tabs",
    });
    expect(within(sectionTabs).getByText("Puzzles")).toHaveAttribute(
      "href",
      "/puzzles/themes",
    );
  });

  it("hides the section tabs off the dashboard/puzzles routes", () => {
    (useAuth as ReturnType<typeof vi.fn>).mockReturnValue({
      isLoggedIn: true,
      username: "alice",
    });
    renderAt("/settings");

    expect(
      screen.queryByRole("navigation", { name: "Section tabs" }),
    ).not.toBeInTheDocument();
  });

  it("shows the bottom nav on every logged-in route and marks the current one active", () => {
    (useAuth as ReturnType<typeof vi.fn>).mockReturnValue({
      isLoggedIn: true,
      username: "alice",
    });
    renderAt("/settings");

    const bottomNav = screen.getByRole("navigation", {
      name: "Bottom navigation",
    });
    expect(
      within(bottomNav).getByRole("link", { name: "Openings" }),
    ).not.toHaveClass("active");
    expect(
      within(bottomNav).getByRole("link", { name: "Puzzles" }),
    ).not.toHaveClass("active");
    expect(
      within(bottomNav).getByRole("link", { name: "Settings" }),
    ).toHaveClass("active");
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
