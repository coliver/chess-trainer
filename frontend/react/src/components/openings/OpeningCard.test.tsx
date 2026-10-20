import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { previewFen } from "@knight-school/chess-core";
import OpeningCard from "./OpeningCard";
import type { OpeningGroup } from "../../lib/groupOpenings";

vi.mock("../Board", () => ({
  default: ({ position }: { position: string }) => (
    <div data-testid="board" data-position={position} />
  ),
}));

let ioCallback: ((entries: { isIntersecting: boolean }[]) => void) | null = null;
const disconnect = vi.fn();
const observe = vi.fn();

class FakeIO {
  constructor(cb: (entries: { isIntersecting: boolean }[]) => void) {
    ioCallback = cb;
  }
  observe = observe;
  disconnect = disconnect;
  unobserve = vi.fn();
}

const group: OpeningGroup = {
  base: "Sicilian Defense",
  representative: { name: "Sicilian Defense", eco: "B20", uci_moves: "e2e4 c7c5" },
  eco: "B20",
  members: [{ name: "Sicilian Defense", eco: "B20", uci_moves: "e2e4 c7c5" }],
  count: 5,
};

describe("OpeningCard", () => {
  beforeEach(() => {
    ioCallback = null;
    disconnect.mockClear();
    observe.mockClear();
    vi.stubGlobal("IntersectionObserver", FakeIO as unknown as typeof IntersectionObserver);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("shows a placeholder until it scrolls into view, then mounts the board", () => {
    render(<OpeningCard group={group} selected={false} onSelect={vi.fn()} />);

    expect(screen.getByText("5 variations")).toBeInTheDocument();
    expect(screen.getByTestId("oc-thumb-placeholder")).toBeInTheDocument();
    expect(screen.queryByTestId("board")).not.toBeInTheDocument();

    act(() => {
      ioCallback?.([{ isIntersecting: false }]);
    });
    expect(screen.queryByTestId("board")).not.toBeInTheDocument();

    act(() => {
      ioCallback?.([{ isIntersecting: true }]);
    });

    expect(screen.getByTestId("board")).toBeInTheDocument();
    expect(disconnect).toHaveBeenCalled();
  });

  it("uses singular 'variation' label when count is 1", () => {
    render(
      <OpeningCard
        group={{ ...group, count: 1 }}
        selected={false}
        onSelect={vi.fn()}
      />,
    );
    expect(screen.getByText("1 variation")).toBeInTheDocument();
  });

  it("replays the line on mouse hover, pauses at the end, loops, and rests on the final position", async () => {
    vi.useFakeTimers();
    try {
      const line = { uci_moves: "e2e4 c7c5" };
      const [start, one, two] = [0, 1, 2].map((p) => previewFen(line, p));
      render(<OpeningCard group={group} selected={false} onSelect={vi.fn()} />);
      act(() => {
        ioCallback?.([{ isIntersecting: true }]);
      });
      const pos = () => screen.getByTestId("board").getAttribute("data-position");
      expect(pos()).toBe(two);

      fireEvent.pointerEnter(screen.getByRole("button"), { pointerType: "mouse" });
      expect(pos()).toBe(start);

      act(() => void vi.advanceTimersByTime(700));
      expect(pos()).toBe(one);
      act(() => void vi.advanceTimersByTime(700));
      expect(pos()).toBe(two);

      // Held on the final position, then restarts.
      act(() => void vi.advanceTimersByTime(1400));
      expect(pos()).toBe(two);
      act(() => void vi.advanceTimersByTime(100));
      expect(pos()).toBe(start);

      fireEvent.pointerLeave(screen.getByRole("button"), { pointerType: "mouse" });
      expect(pos()).toBe(two);
    } finally {
      vi.useRealTimers();
    }
  });

  it("does not replay on hover when the user prefers reduced motion", () => {
    vi.stubGlobal("matchMedia", (query: string) => ({
      matches: query.includes("reduce"),
      addEventListener: () => {},
      removeEventListener: () => {},
    }));
    render(<OpeningCard group={group} selected={false} onSelect={vi.fn()} />);
    act(() => {
      ioCallback?.([{ isIntersecting: true }]);
    });
    const final = previewFen({ uci_moves: "e2e4 c7c5" }, 2);
    fireEvent.pointerEnter(screen.getByRole("button"), { pointerType: "mouse" });
    expect(screen.getByTestId("board").getAttribute("data-position")).toBe(final);
  });

  it("calls onSelect and reflects the selected class", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<OpeningCard group={group} selected={true} onSelect={onSelect} />);

    const btn = screen.getByRole("button");
    expect(btn).toHaveAttribute("aria-pressed", "true");
    await user.click(btn);
    expect(onSelect).toHaveBeenCalled();
  });
});
