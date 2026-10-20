// src/components/openings/BoardPreview.test.tsx
import { render, screen, act, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import { previewFen } from "@knight-school/chess-core";

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
  it("plays a newly selected line from the start, pauses on the final ply, and loops", () => {
    vi.useFakeTimers();
    try {
      const line = { uci_moves: "e2e4 c7c5" };
      render(
        <BoardPreview
          openings={openings}
          selectedOpeningName="Sicilian Defense"
          playerColor="w"
        />,
      );
      const pos = () => screen.getByTestId("board").getAttribute("data-position");
      const plyButtons = screen.getAllByRole("button");
      // Start + 2 plies (e2e4, c7c5)
      expect(plyButtons).toHaveLength(3);
      expect(plyButtons[0]).toHaveClass("active");
      expect(pos()).toBe(previewFen(line, 0));

      act(() => void vi.advanceTimersByTime(700));
      expect(pos()).toBe(previewFen(line, 1));
      act(() => void vi.advanceTimersByTime(700));
      expect(pos()).toBe(previewFen(line, 2));
      expect(plyButtons[2]).toHaveClass("active");

      // Holds the final ply, then restarts from the start position.
      act(() => void vi.advanceTimersByTime(1400));
      expect(pos()).toBe(previewFen(line, 2));
      act(() => void vi.advanceTimersByTime(100));
      expect(pos()).toBe(previewFen(line, 0));
      act(() => void vi.advanceTimersByTime(700));
      expect(pos()).toBe(previewFen(line, 1));
    } finally {
      vi.useRealTimers();
    }
  });

  it("stops autoplay when a ply button is clicked", () => {
    vi.useFakeTimers();
    try {
      render(
        <BoardPreview
          openings={openings}
          selectedOpeningName="Sicilian Defense"
          playerColor="w"
        />,
      );
      const plyButtons = screen.getAllByRole("button");
      fireEvent.click(plyButtons[1]);
      act(() => void vi.advanceTimersByTime(5000));
      expect(plyButtons[1]).toHaveClass("active");
    } finally {
      vi.useRealTimers();
    }
  });

  it("Start resets the board to the initial position and resumes the loop", () => {
    vi.useFakeTimers();
    try {
      const line = { uci_moves: "e2e4 c7c5" };
      render(
        <BoardPreview
          openings={openings}
          selectedOpeningName="Sicilian Defense"
          playerColor="w"
        />,
      );
      const pos = () => screen.getByTestId("board").getAttribute("data-position");
      const plyButtons = screen.getAllByRole("button");
      fireEvent.click(plyButtons[2]);
      act(() => void vi.advanceTimersByTime(5000));
      expect(pos()).toBe(previewFen(line, 2));

      fireEvent.click(plyButtons[0]);
      expect(pos()).toBe(previewFen(line, 0));
      act(() => void vi.advanceTimersByTime(700));
      expect(pos()).toBe(previewFen(line, 1));
    } finally {
      vi.useRealTimers();
    }
  });

  describe("with prefers-reduced-motion", () => {
    beforeEach(() => {
      vi.stubGlobal("matchMedia", (query: string) => ({
        matches: query.includes("reduce"),
        addEventListener: () => {},
        removeEventListener: () => {},
      }));
    });
    afterEach(() => {
      vi.unstubAllGlobals();
    });

    it("opens on the final ply without playing", () => {
      vi.useFakeTimers();
      try {
        render(
          <BoardPreview
            openings={openings}
            selectedOpeningName="Sicilian Defense"
            playerColor="w"
          />,
        );
        const final = previewFen({ uci_moves: "e2e4 c7c5" }, 2);
        expect(screen.getAllByRole("button")[2]).toHaveClass("active");
        // Long enough to have looped back to the start if autoplay were running.
        act(() => void vi.advanceTimersByTime(5000));
        expect(screen.getByTestId("board").getAttribute("data-position")).toBe(final);
      } finally {
        vi.useRealTimers();
      }
    });
  });

  it("Start shows the initial position even when the opening has an EPD", () => {
    const withEpd = [
      {
        name: "Sicilian Defense",
        eco: "B20",
        uci_moves: "e2e4 c7c5",
        epd: "rnbqkbnr/pp1ppppp/8/2p5/4P3/8/PPPP1PPP/RNBQKBNR w KQkq -",
      } as Opening,
    ];
    render(
      <BoardPreview
        openings={withEpd}
        selectedOpeningName="Sicilian Defense"
        playerColor="w"
      />,
    );
    fireEvent.click(screen.getByText("Start"));
    expect(screen.getByTestId("board").getAttribute("data-position")).toBe(
      previewFen({ uci_moves: "" }, 0),
    );
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

    await user.click(screen.getByText("c7c5"));
    expect(screen.getByText("c7c5")).toHaveClass("active");
    expect(screen.getByText("Start")).not.toHaveClass("active");

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
