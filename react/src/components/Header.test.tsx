// frontend/src/components/Header.test.tsx
import { vi, describe, it, beforeEach, afterEach, expect } from "vitest";
import { render, screen, cleanup, act } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Header from "./Header";
import api from "../api";
import { login } from "../auth";

const renderWithRouter = (ui: React.ReactElement) =>
  render(<MemoryRouter>{ui}</MemoryRouter>);

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

  afterEach(() => {
    cleanup();
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
        })
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

    describe("Greetings", () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("uses the username from localStorage in the greeting", async () => {
      localStorage.setItem("username", "Chris");
      (api.get as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        data: [],
      });

      render(
        <MemoryRouter>
          <Header />
        </MemoryRouter>,
      );

      screen.getByRole("heading", { name: /Chris/i });
    });

    const setSystemHour = (hour: number) => {
      // Build the date from LOCAL components (not a UTC "Z" string) so it
      // matches the component's use of Date#getHours(), which is local time.
      // A UTC time would shift across greeting boundaries on non-UTC runners.
      vi.setSystemTime(new Date(2026, 0, 1, hour, 0, 0));
    };

    it("shows morning greeting when hour < 12 and includes username", async () => {
      localStorage.setItem("username", "Chris");
      setSystemHour(9);

      (api.get as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        data: [],
      });

      render(
        <MemoryRouter>
          <Header />
        </MemoryRouter>,
      );

      expect(
        screen.getByRole("heading", { name: /Good morning/i }),
      ).toHaveTextContent("Good morning ☀️, Chris");
    });

    it("shows afternoon greeting when 12 <= hour < 18 (no username)", async () => {
      setSystemHour(14);
      localStorage.removeItem("username");

      (api.get as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        data: [],
      });

      render(
        <MemoryRouter>
          <Header />
        </MemoryRouter>,
      );

      expect(
        screen.getByRole("heading", { name: /Good afternoon/i }),
      ).toHaveTextContent("Good afternoon 🌤️");
    });

    it("shows evening greeting when hour >= 18 and includes username", async () => {
      setSystemHour(20);
      localStorage.setItem("username", "Chris");

      (api.get as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        data: [],
      });

      render(
        <MemoryRouter>
          <Header />
        </MemoryRouter>,
      );

      expect(
        screen.getByRole("heading", { name: /Good evening/i }),
      ).toHaveTextContent("Good evening 🌙, Chris");
    });
  });
});
