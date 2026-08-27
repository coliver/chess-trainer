// frontend/src/components/Header.test.tsx
import { vi, describe, it, beforeEach, expect } from "vitest";
import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import Header from "./Header";
import { login } from "../auth";
import { PreferencesProvider } from "../context/PreferencesContext";

const renderWithRouter = (ui: React.ReactElement) =>
  render(
    <MemoryRouter>
      <PreferencesProvider>{ui}</PreferencesProvider>
    </MemoryRouter>,
  );

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual =
    await vi.importActual<typeof import("react-router-dom")>(
      "react-router-dom",
    );
  return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock("../api", () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

describe("Header auth UI", () => {
  beforeEach(() => {
    localStorage.removeItem("token");
  });

  it("shows the app version under the logo", () => {
    renderWithRouter(<Header />);

    expect(screen.getByTestId("app-version")).not.toBeEmptyDOMElement();
  });

  it("logs out, clears the token, and navigates to /login", async () => {
    const user = userEvent.setup();
    mockNavigate.mockReset();
    localStorage.setItem("token", "abc");

    renderWithRouter(<Header />);

    const logoutBtn = await screen.findByLabelText("Logout");
    await user.click(logoutBtn);

    expect(localStorage.getItem("token")).toBeNull();
    expect(mockNavigate).toHaveBeenCalledWith("/login");
  });

  it("switches to profile when token is set", async () => {
    renderWithRouter(<Header />);

    expect(screen.getByLabelText("Login")).toBeInTheDocument();

    await act(async () => {
      localStorage.setItem("token", "abc");
      window.dispatchEvent(
        new StorageEvent("storage", {
          key: "token",
          oldValue: null,
          newValue: "abc",
        }),
      );

      await new Promise<void>((r) => setTimeout(r, 0));
    });

    expect(screen.queryByLabelText("Login")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Register")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Logout")).toBeInTheDocument();
  });

  it("switches to profile on same-tab login (no native storage event fires)", async () => {
    renderWithRouter(<Header />);

    expect(screen.getByLabelText("Login")).toBeInTheDocument();

    // The browser never fires "storage" for changes made by the current
    // document — this is what a real same-tab login looks like.
    await act(async () => {
      login({
        access_token: "abc",
        refresh_token: "def",
        id: 1,
        username: "Chris",
        email: "chris@example.com",
      });
      await new Promise<void>((r) => setTimeout(r, 0));
    });

    expect(screen.queryByLabelText("Login")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Register")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Logout")).toBeInTheDocument();
  });
});
