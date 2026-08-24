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

describe("Settings page — appearance section", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  const renderSettings = () =>
    render(
      <PreferencesProvider>
        <Settings />
      </PreferencesProvider>,
    );

  it("changes and persists board theme selection", async () => {
    const user = userEvent.setup();
    renderSettings();

    const boardThemeSelect = screen.getByDisplayValue(
      "Default",
    ) as HTMLSelectElement;
    expect(boardThemeSelect.value).toBe("default");

    await user.selectOptions(boardThemeSelect, "green");

    expect(boardThemeSelect.value).toBe("green");
    expect(localStorage.getItem("board_theme")).toBe("green");
  });

  it("changes and persists piece set selection", async () => {
    const user = userEvent.setup();
    renderSettings();

    const pieceSetSelect = screen.getByDisplayValue(
      "Standard",
    ) as HTMLSelectElement;
    expect(pieceSetSelect.value).toBe("standard");

    await user.selectOptions(pieceSetSelect, "staunty");

    expect(pieceSetSelect.value).toBe("staunty");
    expect(localStorage.getItem("piece_set")).toBe("staunty");
  });

  it("toggles show coordinates and persists state", async () => {
    const user = userEvent.setup();
    renderSettings();

    const showCoordinatesCheckbox = screen.getByLabelText(
      "Show board coordinates",
    ) as HTMLInputElement;
    expect(showCoordinatesCheckbox.checked).toBe(true);

    await user.click(showCoordinatesCheckbox);

    expect(showCoordinatesCheckbox.checked).toBe(false);
    expect(localStorage.getItem("show_coordinates")).toBe("false");

    await user.click(showCoordinatesCheckbox);

    expect(showCoordinatesCheckbox.checked).toBe(true);
    expect(localStorage.getItem("show_coordinates")).toBe("true");
  });

  it("toggles board animations and persists state", async () => {
    const user = userEvent.setup();
    renderSettings();

    const boardAnimationsCheckbox = screen.getByLabelText(
      "Animate piece moves",
    ) as HTMLInputElement;
    expect(boardAnimationsCheckbox.checked).toBe(true);

    await user.click(boardAnimationsCheckbox);

    expect(boardAnimationsCheckbox.checked).toBe(false);
    expect(localStorage.getItem("board_animations")).toBe("false");

    await user.click(boardAnimationsCheckbox);

    expect(boardAnimationsCheckbox.checked).toBe(true);
    expect(localStorage.getItem("board_animations")).toBe("true");
  });

  it("toggles sound and persists state", async () => {
    const user = userEvent.setup();
    renderSettings();

    const soundCheckbox = screen.getByLabelText(
      "Sound effects",
    ) as HTMLInputElement;
    expect(soundCheckbox.checked).toBe(false);

    await user.click(soundCheckbox);

    expect(soundCheckbox.checked).toBe(true);
    expect(localStorage.getItem("sound")).toBe("true");

    await user.click(soundCheckbox);

    expect(soundCheckbox.checked).toBe(false);
    expect(localStorage.getItem("sound")).toBe("false");
  });
});

describe("Settings page — board orientation section", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  const renderSettings = () =>
    render(
      <PreferencesProvider>
        <Settings />
      </PreferencesProvider>,
    );

  it("selects auto board orientation by default", () => {
    renderSettings();

    const autoRadio = screen.getByRole("radio", {
      name: "Auto — flip to the side to move",
    }) as HTMLInputElement;
    expect(autoRadio.checked).toBe(true);
  });

  it("changes to white orientation and persists state", async () => {
    const user = userEvent.setup();
    renderSettings();

    const whiteRadio = screen.getByRole("radio", {
      name: "Always keep White on bottom",
    }) as HTMLInputElement;
    await user.click(whiteRadio);

    expect(whiteRadio.checked).toBe(true);
    expect(localStorage.getItem("board_orientation_mode")).toBe("white");
  });

  it("changes to black orientation and persists state", async () => {
    const user = userEvent.setup();
    renderSettings();

    const blackRadio = screen.getByRole("radio", {
      name: "Always keep Black on bottom",
    }) as HTMLInputElement;
    await user.click(blackRadio);

    expect(blackRadio.checked).toBe(true);
    expect(localStorage.getItem("board_orientation_mode")).toBe("black");
  });

  it("allows switching between all orientation options", async () => {
    const user = userEvent.setup();
    renderSettings();

    const autoRadio = screen.getByRole("radio", {
      name: "Auto — flip to the side to move",
    }) as HTMLInputElement;
    const whiteRadio = screen.getByRole("radio", {
      name: "Always keep White on bottom",
    }) as HTMLInputElement;
    const blackRadio = screen.getByRole("radio", {
      name: "Always keep Black on bottom",
    }) as HTMLInputElement;

    expect(autoRadio.checked).toBe(true);

    await user.click(whiteRadio);
    expect(whiteRadio.checked).toBe(true);
    expect(autoRadio.checked).toBe(false);

    await user.click(blackRadio);
    expect(blackRadio.checked).toBe(true);
    expect(whiteRadio.checked).toBe(false);

    await user.click(autoRadio);
    expect(autoRadio.checked).toBe(true);
    expect(blackRadio.checked).toBe(false);
  });
});
