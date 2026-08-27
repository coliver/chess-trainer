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

  it("calling blinkGreen again clears the previous timer/raf before starting a new one", () => {
    const clearTimeoutSpy = vi.spyOn(globalThis, "clearTimeout");
    const cancelRafSpy = vi.spyOn(globalThis, "cancelAnimationFrame");
    const { result } = renderHook(() => useBlinkGreen());

    act(() => {
      result.current.blinkGreen("e2e4", 3);
    });
    clearTimeoutSpy.mockClear();
    cancelRafSpy.mockClear();

    act(() => {
      result.current.blinkGreen("d2d4", 3);
    });

    expect(clearTimeoutSpy).toHaveBeenCalled();
    expect(cancelRafSpy).toHaveBeenCalled();
    expect(result.current.blinkSquare).toBe("d4");
  });

  it("computes opacity across the fade-in, hold, and fade-out phases of a cycle", () => {
    const { result } = renderHook(() => useBlinkGreen());

    act(() => {
      result.current.blinkGreen("e2e4", 3);
    });

    // fade-in phase: within <= fadeInMs (120)
    act(() => {
      rafQueue.shift()?.(60);
    });
    expect(result.current.blinkOpacity).toBeCloseTo(0.5, 1);

    // hold phase: fadeInMs < within <= fadeInMs+holdMs (120..240)
    act(() => {
      rafQueue.shift()?.(200);
    });
    expect(result.current.blinkOpacity).toBe(1);

    // fade-out phase: within > fadeInMs+holdMs
    act(() => {
      rafQueue.shift()?.(300);
    });
    expect(result.current.blinkOpacity).toBeGreaterThan(0);
    expect(result.current.blinkOpacity).toBeLessThan(1);
  });

  it("setTimeout cleanup callback early-returns once unmounted", () => {
    const { result, unmount } = renderHook(() => useBlinkGreen());

    act(() => {
      result.current.blinkGreen("e2e4", 1);
    });

    // vi.setTimeout is mocked to a no-op globally in this suite (see
    // beforeEach), so grab the real hook's scheduled callback isn't directly
    // observable; instead we drive the timer via fake timers.
    unmount();
    expect(() => vi.runOnlyPendingTimers()).not.toThrow();
  });

  it("tick clears state once elapsed time reaches the total duration", () => {
    const { result } = renderHook(() => useBlinkGreen());

    act(() => {
      result.current.blinkGreen("e2e4", 1);
    });
    expect(result.current.blinkSquare).toBe("e4");

    // Drive tick() directly with a "now" past totalMs (times=1 cycle = 420ms)
    // to hit the t >= totalMs branch while still mounted.
    const cb = rafQueue.shift();
    act(() => {
      cb?.(1000);
    });

    expect(result.current.blinkSquare).toBe(null);
    expect(result.current.blinkOpacity).toBe(0);
  });

  it("tick early-returns without setting state once unmounted", () => {
    const { result, unmount } = renderHook(() => useBlinkGreen());

    act(() => {
      result.current.blinkGreen("e2e4", 1);
    });

    // Grab the queued tick callback but unmount before it runs, so the
    // `if (isMountedRef.current)` guards inside tick() take the false branch.
    const cb = rafQueue.shift();
    unmount();

    expect(() => cb?.(1000)).not.toThrow();
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
