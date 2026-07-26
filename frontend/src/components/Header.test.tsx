// frontend/src/components/Header.test.tsx
import { describe, it, beforeEach, afterEach, expect } from "vitest";
import { render, screen, cleanup, act } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Header from "./Header";

const renderWithRouter = (ui: React.ReactElement) =>
  render(<MemoryRouter>{ui}</MemoryRouter>);

describe("Header auth UI", () => {
  beforeEach(() => {
    localStorage.removeItem("token");
  });

  afterEach(() => {
    cleanup();
  });

  it("switches to profile when token is set", async () => {
    renderWithRouter(<Header />);

    expect(screen.getByText("Login")).toBeInTheDocument();

    await act(async () => {
      localStorage.setItem("token", "abc");
      window.dispatchEvent(
        new StorageEvent("storage", {
          key: "token",
          oldValue: null,
          newValue: "abc",
        })
      );

      await new Promise<void>((r) => setTimeout(r, 0));
    });

    expect(screen.queryByText("Login")).not.toBeInTheDocument();
    expect(screen.queryByText("Register")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Profile")).toBeInTheDocument();
  });
});
