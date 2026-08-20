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
