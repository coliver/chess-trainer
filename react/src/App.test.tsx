// react/src/App.test.tsx
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import "@testing-library/jest-dom";
import App from "./App";
import { PreferencesProvider } from "./context/PreferencesContext";

const { mockSnow, mockStop } = vi.hoisted(() => ({
  mockSnow: vi.fn(),
  mockStop: vi.fn(),
}));
vi.mock("./utils/snow", () => ({ snow: mockSnow }));

vi.mock("./components/Board", () => ({
  default: () => <div data-testid="board" />,
}));

describe("App — snow trigger", () => {
  beforeEach(() => {
    localStorage.clear();
    mockSnow.mockReset();
    mockStop.mockReset();
    mockSnow.mockReturnValue(mockStop);
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const renderApp = () =>
    render(
      <MemoryRouter initialEntries={["/login"]}>
        <PreferencesProvider>
          <App />
        </PreferencesProvider>
      </MemoryRouter>,
    );

  it("does not call snow() when the preference is off", () => {
    renderApp();
    expect(mockSnow).not.toHaveBeenCalled();
  });

  it("calls snow() immediately and on a 15s cycle when the preference is on", () => {
    localStorage.setItem("snow_enabled", "true");
    renderApp();

    expect(mockSnow).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(15000);
    expect(mockSnow).toHaveBeenCalledTimes(2);

    vi.advanceTimersByTime(15000);
    expect(mockSnow).toHaveBeenCalledTimes(3);
  });
});
