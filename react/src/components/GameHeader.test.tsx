// src/components/GameHeader.test.tsx
import { useEffect } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { MemoryRouter } from "react-router-dom";

import { GameHeader } from "./GameHeader";
import { GameHeaderProvider, useGameHeader } from "../context/GameHeaderContext";

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual =
    await vi.importActual<typeof import("react-router-dom")>(
      "react-router-dom",
    );
  return { ...actual, useNavigate: () => mockNavigate };
});

function Setter({
  status,
  onSettingsClick,
}: {
  status: string;
  onSettingsClick?: () => void;
}) {
  const { setStatus, setOnSettingsClick } = useGameHeader();
  useEffect(() => {
    setStatus(status);
    setOnSettingsClick(onSettingsClick);
  }, [status, onSettingsClick, setStatus, setOnSettingsClick]);
  return null;
}

function renderHeader({
  status = "",
  onSettingsClick,
}: { status?: string; onSettingsClick?: () => void } = {}) {
  return render(
    <MemoryRouter>
      <GameHeaderProvider>
        <Setter status={status} onSettingsClick={onSettingsClick} />
        <GameHeader />
      </GameHeaderProvider>
    </MemoryRouter>,
  );
}

describe("GameHeader", () => {
  beforeEach(() => {
    mockNavigate.mockReset();
  });

  it("navigates back to the dashboard when the back button is clicked", async () => {
    const user = userEvent.setup();
    renderHeader();

    await user.click(screen.getByRole("button", { name: "Back" }));

    expect(mockNavigate).toHaveBeenCalledWith("/dashboard");
  });

  it("renders the status text from context", () => {
    renderHeader({ status: "White to move" });

    expect(screen.getByText("White to move")).toBeInTheDocument();
  });

  it("invokes the settings handler from context when clicked", async () => {
    const onSettingsClick = vi.fn();
    const user = userEvent.setup();
    renderHeader({ onSettingsClick });

    await user.click(screen.getByRole("button", { name: "Settings" }));

    expect(onSettingsClick).toHaveBeenCalled();
  });
});
