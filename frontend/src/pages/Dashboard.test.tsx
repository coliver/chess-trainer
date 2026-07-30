// frontend/src/pages/Dashboard.test.tsx
import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { MemoryRouter } from "react-router-dom";

import { Dashboard } from "./Dashboard";
import api from "../api";

type Opening = {
  name: string;
  eco: string;
  description?: string | null;
};

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

type OpeningComboOption = { eco: string; name: string };

type OpeningComboProps = {
  rootLabel: string;
  query: string;
  setQuery: React.Dispatch<React.SetStateAction<string>>;
  isOpen?: boolean;
  setIsOpen?: React.Dispatch<React.SetStateAction<boolean>>;
  options: OpeningComboOption[];
  selectedOpeningName?: string | null;
  onPick: (idx: number) => void;
};

vi.mock("../components/openings/OpeningCombo", () => {
  return {
    default: ({
      rootLabel,
      query,
      setQuery,
      options,
      onPick,
    }: OpeningComboProps) => {
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

          <div role="listbox" aria-label="options">
            {options.map((o, idx) => (
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

type DashboardTileProps = {
  tile?: React.ReactNode;
  icon?: React.ReactElement<{ alt?: string }>;
  title?: string;
  subtitle?: string;
  cta?: React.ReactNode;
  customBody?: React.ReactNode;
  className?: string;
  compact?: boolean;
  rightArrowIcon?: React.ReactNode;
};

vi.mock("../components/openings/DashboardTile", () => ({
  __esModule: true,
  default: ({
    tile,
    icon,
    title,
    subtitle,
    cta,
    customBody,
  }: DashboardTileProps) => {
    return (
      <section>
        {tile ?? customBody}
        {icon ? <img alt={icon.props.alt ?? "icon"} /> : null}
        {cta}
        {title ? <h2>{title}</h2> : null}
        {subtitle ? <p>{subtitle}</p> : null}
      </section>
    );
  },
}));

describe("Dashboard", () => {
  const user = userEvent.setup();

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

    (api.get as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      data: openings,
    });

    // if your Dashboard navigates after the post, mock it
    (api.post as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      data: { id: 123 },
    });

    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>,
    );

    const option = await screen.findByRole("option", {
      name: /B10\s*—\s*Caro-Kann/i,
    });

    await user.click(option);

    // description should update
    expect(await screen.findByText(/A solid start\./i)).toBeInTheDocument();

    // button label should update
    const startButton = await screen.findByRole("button", {
      name: /Start\s+Caro-Kann/i,
    });
    await expect(startButton).toBeEnabled();

    // click should post correct payload + navigate
    await user.click(startButton);

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith("/training-sessions", {
        openingEco: "B10",
        openingName: "Caro-Kann",
      });
      expect(mockNavigate).toHaveBeenCalledWith("/training/123");
    });
  });

  it("handles empty openings: cannot start session with null openingName", async () => {
    (api.get as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      data: [],
    });

    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>,
    );

    const input = await screen.findByRole("combobox", {
      name: "Search openings",
    });
    expect((input as HTMLInputElement).value).toBe("");

    // Start button should be disabled
    const startBtn = await screen.findByRole("button", {
      name: /choose an opening|start/i,
    });
    await expect(startBtn).toBeDisabled();

    await user.click(startBtn);

    expect(api.post).not.toHaveBeenCalledWith("/training-sessions", {
      openingName: null,
    });
  });

  it("renders opening description when selectedOpeningDescription is provided", async () => {
    const openings = [
      { eco: "B10", name: "Caro-Kann", description: "A solid start." },
      { eco: "B20", name: "Sicilian", description: "Sharp and tactical." },
    ];

    (api.get as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      data: openings,
    });

    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>,
    );

    // combobox exists even when list is closed
    const combo = await screen.findByRole("combobox", {
      name: "Search openings",
    });

    // make list open and filtered so options render
    await user.click(combo);
    await user.type(combo, "B10"); // triggers query change and isOpen=true

    const option = await screen.findByRole("option", {
      name: /B10\s*—\s*Caro-Kann/i,
    });
    await user.click(option);

    expect(await screen.findByText(/A solid start\./i)).toBeInTheDocument();
  });

  it("renders empty-state description element when description is missing", async () => {
    const openings: Opening[] = [{ eco: "B10", name: "Caro-Kann" }];

    (api.get as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      data: openings,
    });

    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>,
    );

    const emptyDesc = await screen.findByText("", {
      selector: ".opening-description--empty",
    });
    expect(emptyDesc).toBeInTheDocument();
  });
});
