// react/src/pages/Settings.test.tsx
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";
import Settings from "./Settings";
import { PreferencesProvider } from "../context/PreferencesContext";

vi.mock("../components/Board", () => ({
  default: () => <div data-testid="board" />,
}));

describe("Settings page — snow toggle", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  const renderSettings = () =>
    render(
      <PreferencesProvider>
        <Settings />
      </PreferencesProvider>,
    );

  it("defaults to off and persists the choice locally without touching preferences sync", async () => {
    const user = userEvent.setup();
    renderSettings();

    const checkbox = screen.getByLabelText("Snow effect") as HTMLInputElement;
    expect(checkbox.checked).toBe(false);

    await user.click(checkbox);

    expect(checkbox.checked).toBe(true);
    expect(localStorage.getItem("snow_enabled")).toBe("true");
  });

  it("restores the enabled state from localStorage on mount", () => {
    localStorage.setItem("snow_enabled", "true");
    renderSettings();

    const checkbox = screen.getByLabelText("Snow effect") as HTMLInputElement;
    expect(checkbox.checked).toBe(true);
  });
});

describe("Settings page — reset to defaults", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  const renderSettings = () =>
    render(
      <PreferencesProvider>
        <Settings />
      </PreferencesProvider>,
    );

  it("asks for confirmation and does nothing if declined", async () => {
    const user = userEvent.setup();
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(false);
    renderSettings();

    const themeRadio = screen.getByRole("radio", { name: "Dark" }) as HTMLInputElement;
    await user.click(themeRadio);
    expect(themeRadio.checked).toBe(true);

    await user.click(screen.getByRole("button", { name: "Reset to Defaults" }));

    expect(confirmSpy).toHaveBeenCalledTimes(1);
    expect(themeRadio.checked).toBe(true);

    confirmSpy.mockRestore();
  });

  it("resets preferences and the snow toggle when confirmed", async () => {
    const user = userEvent.setup();
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);
    renderSettings();

    const themeRadio = screen.getByRole("radio", { name: "Dark" }) as HTMLInputElement;
    await user.click(themeRadio);
    const snowCheckbox = screen.getByLabelText("Snow effect") as HTMLInputElement;
    await user.click(snowCheckbox);
    expect(themeRadio.checked).toBe(true);
    expect(snowCheckbox.checked).toBe(true);

    await user.click(screen.getByRole("button", { name: "Reset to Defaults" }));

    expect(confirmSpy).toHaveBeenCalledTimes(1);
    const systemRadio = screen.getByRole("radio", { name: "System" }) as HTMLInputElement;
    expect(systemRadio.checked).toBe(true);
    expect(snowCheckbox.checked).toBe(false);
    expect(localStorage.getItem("snow_enabled")).toBe("false");

    confirmSpy.mockRestore();
  });
});
