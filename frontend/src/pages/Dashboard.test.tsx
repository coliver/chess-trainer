// frontend/src/pages/Dashboard.test.tsx
import React from "react";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import { MemoryRouter } from "react-router-dom";

import { Dashboard } from "./Dashboard";
import api from "../api";

vi.mock("../api", () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual =
    await vi.importActual<typeof import("react-router-dom")>(
      "react-router-dom",
    );
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// SVG imports are used as URLs; mock them to simple strings
vi.mock("../assets/classics.svg", () => ({ default: "classics.svg" }));
vi.mock("../assets/up-right-arrow.svg", () => ({
  default: "up-right-arrow.svg",
}));
vi.mock("../assets/target.svg", () => ({ default: "target.svg" }));
vi.mock("../assets/branch.svg", () => ({ default: "branch.svg" }));

// Mock KnightSchoolIcon (it’s a component import, not an svg URL)
vi.mock("../components/KnightSchoolIcon", () => ({
  KnightSchoolIcon: ({ width, height }: { width: string; height: string }) => (
    <div data-testid="knight-school-icon">
      icon {width}x{height}
    </div>
  ),
}));
vi.mock("../components/openings/OpeningCombo", () => {
  return {
    default: ({
      rootLabel,
      query,
      setQuery,
      options,
      onPick,
      // these props exist in your component but not needed for interaction
    }: any) => {
      return (
        <div>
          <label htmlFor="opening-search">{rootLabel}</label>
          <input
            id="opening-search"
            role="combobox"
            aria-label={rootLabel}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {/* options are rendered so we can assert filtering */}
          <div role="listbox" aria-label="options">
            {options.map((o: any, idx: number) => (
              <button
                key={o.eco + o.name}
                type="button"
                role="option"
                onClick={() => onPick(idx)}
              >
                {o.eco} — {o.name}
              </button>
            ))}
          </div>
        </div>
      );
    },
  };
});

vi.mock("../components/openings/BoardPreview", () => ({
  default: () => <div data-testid="board-preview" />,
}));

vi.mock("../components/openings/DashboardTile", () => ({
  __esModule: true,
  default: ({ tile, icon, title, subtitle, cta, customBody }: any) => {
    return (
      <section>
        {tile ?? customBody}
        {icon ? <img alt={icon?.props?.alt ?? "icon"} /> : null}
        {cta}
        {title ? <h2>{title}</h2> : null}
        {subtitle ? <p>{subtitle}</p> : null}
      </section>
    );
  },
}));

type Opening = { name: string; eco: string };

describe("Dashboard", () => {
  const user = userEvent.setup();

  const openings: Opening[] = [
    { eco: "B10", name: "Caro-Kann" },
    { eco: "B20", name: "Sicilian" },
  ];

  beforeEach(() => {
    mockNavigate.mockReset();
    localStorage.clear();

    localStorage.setItem("username", "Chris");

    (api.get as unknown as ReturnType<typeof vi.fn>).mockReset();
    (api.post as unknown as ReturnType<typeof vi.fn>).mockReset();
  });

  it("picking an opening updates description and Start button label", async () => {
    const user = userEvent.setup();

    const openings = [
      { eco: "B10", name: "Caro-Kann", description: "A solid start." },
      { eco: "B20", name: "Sicilian", description: "Sharp and tactical." },
    ];
    (api.get as any).mockResolvedValueOnce({ data: openings });

    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>,
    );

    const input = screen.getByRole("combobox", { name: /search openings/i });

    // Open/focus the combobox so suggestions appear
    await user.click(input);
    const fourteenBackspaces = Array.from(
      { length: 16 },
      () => "{Backspace}",
    ).join("");

    // Update controlled value reliably
    user.type(input, `${fourteenBackspaces}Sicilian`);

    // Now wait for the suggestion text to appear inside the listbox
    const listbox = screen.getByRole("listbox", { name: /options/i });
    const option = await within(listbox).findByText("B20 — Sicilian");
    await user.click(option);

    // Description should update
    expect(await screen.findByText("Sharp and tactical.")).toBeInTheDocument();

    // Start button label should reflect selected opening
    expect(
      screen.getByRole("button", { name: "Start Sicilian" }),
    ).toBeInTheDocument();
  });

  it("loads openings and selects the first opening by default", async () => {
    (api.get as any).mockResolvedValueOnce({ data: openings });

    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>,
    );

    const input = await screen.findByRole("combobox", {
      name: "Search openings",
    });

    await waitFor(() => {
      expect((input as HTMLInputElement).value).toBe(
        `${openings[0].eco} — ${openings[0].name}`,
      );
    });

    // Don’t click; your OpeningCombo mock always renders options.
    // This will also show you what text is actually being rendered if it fails.
    const firstOption = await screen.findByRole("option", {
      name: `${openings[0].eco} — ${openings[0].name}`,
    });
    expect(firstOption).toBeInTheDocument();
  });

  it("clicking the Start button launches a training session and navigates to /training/:id", async () => {
    (api.get as any).mockResolvedValueOnce({ data: openings });
    (api.post as any).mockResolvedValueOnce({ data: { id: 123 } });

    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>,
    );

    const startButton = await screen.findByRole("button", {
      name: `Start ${openings[0].name}`,
    });
    await user.click(startButton);

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith("/training-sessions", {
        openingName: openings[0].name,
      });
      expect(mockNavigate).toHaveBeenCalledWith("/training/123");
    });
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
      (api.get as any).mockResolvedValueOnce({ data: openings });

      render(
        <MemoryRouter>
          <Dashboard />
        </MemoryRouter>,
      );

      screen.getByRole("heading", { name: /Chris/i });
    });

    const setSystemHour = (hour: number) => {
      vi.setSystemTime(
        new Date(`2026-01-01T${String(hour).padStart(2, "0")}:00:00Z`),
      );
    };

    it("shows morning greeting when hour < 12 and includes username", async () => {
      localStorage.setItem("username", "Chris");
      setSystemHour(9);

      (api.get as any).mockResolvedValueOnce({ data: [] });

      render(
        <MemoryRouter>
          <Dashboard />
        </MemoryRouter>,
      );

      expect(
        screen.getByRole("heading", { name: /Good morning/i }),
      ).toHaveTextContent("Good morning ☀️, Chris");
    });

    it("shows afternoon greeting when 12 <= hour < 18 (no username)", async () => {
      setSystemHour(14);
      localStorage.removeItem("username");

      (api.get as any).mockResolvedValueOnce({ data: [] });

      render(
        <MemoryRouter>
          <Dashboard />
        </MemoryRouter>,
      );

      expect(
        screen.getByRole("heading", { name: /Good afternoon/i }),
      ).toHaveTextContent("Good afternoon 🌤️");
    });

    it("shows evening greeting when hour >= 18 and includes username", async () => {
      setSystemHour(20);
      localStorage.setItem("username", "Chris");

      (api.get as any).mockResolvedValueOnce({ data: [] });

      render(
        <MemoryRouter>
          <Dashboard />
        </MemoryRouter>,
      );

      expect(
        screen.getByRole("heading", { name: /Good evening/i }),
      ).toHaveTextContent("Good evening 🌙, Chris");
    });
  });

  it("handles empty openings: clears query and passes null openingName to startSession", async () => {
    (api.get as any).mockResolvedValueOnce({ data: [] });
    (api.post as any).mockResolvedValueOnce({ data: { id: 123 } });

    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>,
    );

    const input = (await screen.findByRole("combobox", {
      name: "Search openings",
    })) as HTMLInputElement;
    expect(input.value).toBe("");

    const startBtn = await screen.findByRole("button", { name: "Start" });
    expect(startBtn).toHaveTextContent(/^Start$/);

    await user.click(startBtn);

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith("/training-sessions", {
        openingName: null,
      });
      expect(mockNavigate).toHaveBeenCalledWith("/training/123");
    });
  });

  it("renders opening description when selectedOpeningDescription is provided", async () => {
    const openings = [
      { eco: "B10", name: "Caro-Kann", description: "A solid start." },
      { eco: "B20", name: "Sicilian", description: "Sharp and tactical." },
    ];
    (api.get as any).mockResolvedValueOnce({ data: openings });

    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>,
    );

    expect(await screen.findByText("A solid start.")).toBeInTheDocument();
  });

  it("renders empty-state description element when description is missing", async () => {
    const openings = [{ eco: "B10", name: "Caro-Kann" }];
    (api.get as any).mockResolvedValueOnce({ data: openings });

    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>,
    );

    // Your empty-state is a p with classes including opening-description--empty
    const emptyDesc = await screen.findByText("", {
      selector: ".opening-description--empty",
    });
    expect(emptyDesc).toBeInTheDocument();
  });

  it("filters options based on query and updates the visible option list", async () => {
    const openings = [
      { eco: "B10", name: "Caro-Kann", description: "x" },
      { eco: "B20", name: "Sicilian", description: "y" },
    ];
    (api.get as any).mockResolvedValueOnce({ data: openings });

    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>,
    );

    const input = await screen.findByRole("combobox", {
      name: "Search openings",
    });

    // Initially the combo shows both options because query starts at first opening
    expect(
      screen.getByRole("option", { name: "B10 — Caro-Kann" }),
    ).toBeInTheDocument();

    await user.clear(input);
    await user.type(input, "Sicilian");

    await waitFor(() => {
      expect(
        screen.queryByRole("option", { name: "B10 — Caro-Kann" }),
      ).not.toBeInTheDocument();

      expect(
        screen.getByRole("option", { name: "B20 — Sicilian" }),
      ).toBeInTheDocument();
    });
  });
});
