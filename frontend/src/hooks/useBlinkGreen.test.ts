import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useBlinkGreen } from "./useBlinkGreen";

const rafQueue: FrameRequestCallback[] = [];

beforeEach(() => {
  vi.useFakeTimers();

  // deterministic perf
  vi.spyOn(globalThis, "performance", "get").mockReturnValue({
    now: () => 0,
  } as unknown as Performance);

  // deterministic RAF: queue callbacks, run them manually
  rafQueue.length = 0;
  vi.spyOn(globalThis, "requestAnimationFrame").mockImplementation(
    (cb: FrameRequestCallback) => {
      rafQueue.push(cb);
      return rafQueue.length; // fake id
    },
  );

  vi.spyOn(globalThis, "cancelAnimationFrame").mockImplementation(() => {});
  vi.spyOn(globalThis, "clearTimeout").mockImplementation(() => {});
});

afterEach(() => {
  rafQueue.length = 0;
  vi.useRealTimers();
  vi.restoreAllMocks();
  // restore performance.now getter if your environment overwrites it
});

function flushRafOnce() {
  const cb = rafQueue.shift();
  if (!cb) return;
  cb(0); // "now" passed to tick()
}

describe("useBlinkGreen", () => {
  it("blinkGreen sets square/styles and then clears after total duration (times=1)", async () => {
    const { result, unmount } = renderHook(() => useBlinkGreen());

    expect(result.current.blinkSquare).toBe(null);

    act(() => {
      result.current.blinkGreen("e2e4", 1);
    });

    expect(result.current.blinkSquare).toBe("e4");
    expect(result.current.blinkOpacity).toBeGreaterThanOrEqual(0);

    // Run one RAF tick to cover tick branch
    act(() => {
      flushRafOnce();
    });

    // advance enough time to trigger setTimeout cleanup
    act(() => {
      vi.advanceTimersByTime(1_000);
    });

    // state should have cleared
    expect(result.current.blinkSquare).toBe(null);
    expect(result.current.blinkOpacity).toBe(0);

    unmount();
  });

  it("blinkGreen is a no-op when uci doesn't contain a target square", () => {
    const { result } = renderHook(() => useBlinkGreen());

    act(() => {
      result.current.blinkGreen("e2", 3);
    });

    expect(result.current.blinkSquare).toBe(null);
    expect(result.current.blinkOpacity).toBe(0);
  });

  it("clears timers/raf on unmount (prevents state updates)", () => {
    const clearTimeoutSpy = vi.spyOn(globalThis, "clearTimeout");
    const cancelRafSpy = vi.spyOn(globalThis, "cancelAnimationFrame");

    const { result, unmount } = renderHook(() => useBlinkGreen());

    act(() => {
      result.current.blinkGreen("e2e4", 3);
    });

    // enqueue a raf callback
    expect(rafQueue.length).toBeGreaterThan(0);

    unmount();

    // unmount cleanup should clear both
    expect(clearTimeoutSpy).toHaveBeenCalled();
    expect(cancelRafSpy).toHaveBeenCalled();
  });
});
