import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PreferencesProvider, usePreferences } from "./PreferencesContext";

function ThemeReader() {
  const { preferences, update } = usePreferences();
  return (
    <button type="button" onClick={() => update({ theme: "dark" })}>
      {preferences.theme}
    </button>
  );
}

const renderProvider = () =>
  render(
    <PreferencesProvider>
      <ThemeReader />
    </PreferencesProvider>,
  );

describe("PreferencesProvider theme application", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute("data-theme");
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("applies the saved localStorage theme to the document root on mount", () => {
    localStorage.setItem("theme", "dark");
    renderProvider();
    expect(document.documentElement.dataset.theme).toBe("dark");
  });

  it("falls back to system preference (dark) when nothing saved", () => {
    vi.stubGlobal(
      "matchMedia",
      vi.fn().mockReturnValue({ matches: true } as MediaQueryList),
    );

    renderProvider();
    expect(document.documentElement.dataset.theme).toBe("dark");
    vi.unstubAllGlobals();
  });

  it("falls back to light when system preference is not dark", () => {
    vi.stubGlobal(
      "matchMedia",
      vi.fn().mockReturnValue({ matches: false } as MediaQueryList),
    );

    renderProvider();
    expect(document.documentElement.dataset.theme).toBe("light");
    vi.unstubAllGlobals();
  });

  it("applies the theme to the document root without any menu/drawer being opened", async () => {
    const user = userEvent.setup();
    localStorage.setItem("theme", "light");
    renderProvider();
    expect(document.documentElement.dataset.theme).toBe("light");

    await user.click(screen.getByRole("button"));

    await waitFor(() => {
      expect(document.documentElement.dataset.theme).toBe("dark");
    });
  });
});
