import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
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
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute("data-theme");
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("uses saved localStorage theme when present", () => {
    localStorage.setItem("theme", "dark");
    renderThemeToggle();
    expect(document.documentElement.dataset.theme).toBe("dark");
  });

  it("falls back to system preference (dark) when nothing saved", () => {
    vi.stubGlobal(
      "matchMedia",
      vi.fn().mockReturnValue({ matches: true } as MediaQueryList),
    );

    renderThemeToggle();
    expect(document.documentElement.dataset.theme).toBe("dark");
    vi.unstubAllGlobals();
  });

  it("falls back to light when system preference is not dark", () => {
    vi.stubGlobal(
      "matchMedia",
      vi.fn().mockReturnValue({ matches: false } as MediaQueryList),
    );

    renderThemeToggle();
    expect(document.documentElement.dataset.theme).toBe("light");
    vi.unstubAllGlobals();
  });

  it("toggles theme on click and persists to localStorage", async () => {
    const user = userEvent.setup();
    localStorage.setItem("theme", "light");
    renderThemeToggle();

    const btn = screen.getByRole("button", { name: /toggle theme/i });
    await user.click(btn);

    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(localStorage.getItem("theme")).toBe("dark");

    await user.click(btn);
    expect(document.documentElement.dataset.theme).toBe("light");
    expect(localStorage.getItem("theme")).toBe("light");
  });
});
