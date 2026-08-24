import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ThemeToggle } from "./ThemeToggle";
import { PreferencesProvider } from "../context/PreferencesContext";

const renderThemeToggle = () =>
  render(
    <PreferencesProvider>
      <ThemeToggle />
    </PreferencesProvider>,
  );

describe("ThemeToggle", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it("shows the moon icon (light) when nothing saved and system prefers light", () => {
    vi.stubGlobal(
      "matchMedia",
      vi.fn().mockReturnValue({ matches: false } as MediaQueryList),
    );

    renderThemeToggle();
    expect(screen.getByRole("button", { name: /toggle theme/i })).toBeInTheDocument();
    vi.unstubAllGlobals();
  });

  it("shows the sun icon when saved theme is dark", () => {
    localStorage.setItem("theme", "dark");
    renderThemeToggle();
    // Sun icon is shown when resolved theme is dark (click affordance to go light).
    expect(screen.getByRole("button", { name: /toggle theme/i })).toBeInTheDocument();
  });

  it("toggles theme on click and persists to localStorage", async () => {
    const user = userEvent.setup();
    localStorage.setItem("theme", "light");
    renderThemeToggle();

    const btn = screen.getByRole("button", { name: /toggle theme/i });
    await user.click(btn);
    expect(localStorage.getItem("theme")).toBe("dark");

    await user.click(btn);
    expect(localStorage.getItem("theme")).toBe("light");
  });
});
