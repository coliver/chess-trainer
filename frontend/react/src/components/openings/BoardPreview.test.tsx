// src/components/openings/BoardPreview.test.tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi, describe, it, expect, beforeEach } from "vitest";

import BoardPreview from "./BoardPreview";
import type { Opening } from "../../pages/Dashboard";

vi.mock("../Board", () => ({
  default: ({ position, orientation }: { position: string; orientation: string }) => (
    <div data-testid="board" data-position={position} data-orientation={orientation} />
  ),
}));

// jsdom has no ResizeObserver.
beforeEach(() => {
  class RO {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  vi.stubGlobal("ResizeObserver", RO);
});

const openings: Opening[] = [
  {
    name: "Sicilian Defense",
    eco: "B20",
    uci_moves: "e2e4 c7c5",
  } as Opening,
];

describe("BoardPreview", () => {
  it("defaults to the final ply of the selected opening", () => {
    render(
      <BoardPreview
        openings={openings}
        selectedOpeningName="Sicilian Defense"
        playerColor="w"
      />,
    );

    const plyButtons = screen.getAllByRole("button");
    // Start + 2 plies (e2e4, c7c5)
    expect(plyButtons).toHaveLength(3);
    expect(plyButtons[2]).toHaveClass("active");
  });

  it("orients the board for the given player color", () => {
    render(
      <BoardPreview
        openings={openings}
        selectedOpeningName="Sicilian Defense"
        playerColor="b"
      />,
    );

    expect(screen.getByTestId("board")).toHaveAttribute(
      "data-orientation",
      "black",
    );
  });

  it("switches ply on clicking a step and start resets to the initial position", async () => {
    const user = userEvent.setup();
    render(
      <BoardPreview
        openings={openings}
        selectedOpeningName="Sicilian Defense"
        playerColor="w"
      />,
    );

    await user.click(screen.getByText("Start"));

    expect(screen.getByText("Start")).toHaveClass("active");
  });

  it("renders no ply buttons beyond Start when the opening is not found", () => {
    render(
      <BoardPreview
        openings={openings}
        selectedOpeningName="Unknown Opening"
        playerColor="w"
      />,
    );

    expect(screen.getAllByRole("button")).toHaveLength(1);
  });
});
