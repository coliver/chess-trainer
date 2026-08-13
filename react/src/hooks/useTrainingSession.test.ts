// frontend/src/hooks/useTrainingSession.test.tsx
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { server } from "../tests/msw/server";
import { useTrainingSession } from "./useTrainingSession";
import { Chess } from "chess.js";

describe("useTrainingSession", () => {
  const id = "1";
  const on401Navigate = vi.fn();

  beforeEach(() => {
    on401Navigate.mockReset();
    server.resetHandlers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("loads the initial next item on mount and builds openingLabel", async () => {
    server.use(
      http.get(`/api/training-sessions/${id}/next`, () => {
        return HttpResponse.json({
          itemId: "2",
          fenAfter: "8/8/8/8/8/8/4K3/4k3 b - - 0 1 | trailing comment; ignored",
          openingEco: "C20",
          openingName: "Test Opening",
          correctMoveUci: "e2e4",
          pgn: "1. e4",
          epd: "stub",
        });
      }),
    );

    const { result } = renderHook(() => useTrainingSession(id, on401Navigate));

    await waitFor(() => expect(result.current.itemId).toBe("2"));

    expect(result.current.fen).toBe("8/8/8/8/8/8/4K3/4k3 b - - 0 1");
    expect(result.current.openingLabel).toBe("C20 Test Opening");
    expect(result.current.correctMoveUci).toBe("e2e4");
    expect(result.current.feedback).toBe("");
  });

  it("normalizeFen falls back to START_FEN for null/empty", () => {
    const { result } = renderHook(() =>
      useTrainingSession(undefined, on401Navigate),
    );

    expect(result.current.normalizeFen(null)).toBe(result.current.START_FEN);
    expect(result.current.normalizeFen(undefined)).toBe(
      result.current.START_FEN,
    );
    expect(result.current.normalizeFen("")).toBe(result.current.START_FEN);
  });

  it("submitMove correct: advance path shows 'Opening complete.' when nextItemId equals prev itemId", async () => {
    vi.useFakeTimers();

    type Turn = "w" | "b";

    vi.spyOn(
      Chess.prototype as unknown as { turn: () => Turn },
      "turn",
    ).mockReturnValue("b");
    const prevItemId = 10; // must match what the first GET /next returns
    const prevFen = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
    const nextFen =
      "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1";

    let nextCall = 0;

    server.use(
      http.get(/\/api\/training-sessions\/[^/]+\/next\/?(?:\?.*)?$/, () => {
        nextCall += 1;

        // 1) initial load
        if (nextCall === 1) {
          return HttpResponse.json({
            sessionId: 1,
            itemId: prevItemId,
            fen: prevFen,
            orderIndex: 0,
            openingEco: "C20",
            openingName: "King's Pawn Game",
            correctMoveUci: "e2e4",
          });
        }

        // 2) advance path: nextItemId === prev itemId => Opening complete
        return HttpResponse.json({
          sessionId: 1,
          itemId: prevItemId,
          fen: nextFen,
          orderIndex: 1,
          openingEco: "C20",
          openingName: "King's Pawn Game",
          correctMoveUci: "e2e4",
        });
      }),
    );

    const { result } = renderHook(() =>
      useTrainingSession(id, on401Navigate, { timeoutMs: 10 }),
    );

    // Wait for the initial fetchNextItem/useEffect to apply state
    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.itemId).toBe(String(prevItemId));

    await act(async () => {
      await result.current.submitMove("e2e4", prevFen);
    });

    // Fire the advance timeout, which triggers the next GET /next
    await act(async () => {
      vi.advanceTimersByTime(10);
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(result.current.feedback).toBe("✅ Opening complete.");
    expect(on401Navigate).not.toHaveBeenCalled();
  });

  it("submitMove correct: when data.sessionCompleted is true shows '✅ Session completed.'", async () => {
    server.use(
      http.get(`/api/training-sessions/${id}/next`, () => {
        return HttpResponse.json({
          itemId: "1",
          fen: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
          openingEco: "C20",
          openingName: "Opening A",
          correctMoveUci: "e2e4",
        });
      }),
      http.post(`/api/training-sessions/${id}/responses`, () => {
        return HttpResponse.json({
          correct: true,
          sessionCompleted: true,
          fenAfter:
            "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1",
        });
      }),
    );

    const { result } = renderHook(() =>
      useTrainingSession(id, on401Navigate, { timeoutMs: 10 }),
    );

    await waitFor(() => expect(result.current.itemId).toBe("1"));
    const prevFen = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

    await act(async () => {
      await result.current.submitMove("e2e4", prevFen);
    });

    expect(result.current.feedback).toBe("✅ Session completed.");
    expect(result.current.isAdvancing).toBe(false);
    expect(on401Navigate).not.toHaveBeenCalled();
  });

  it("submitMove correct: clears existing advance timeout before scheduling a new one", async () => {
    const nextTimeoutCallbacks: Array<() => Promise<void>> = [];
    const clearTimeoutFn = vi.fn();

    const setTimeoutFn = (cb: () => void) => {
      // Wrap to match "async callback" behavior inside the hook
      nextTimeoutCallbacks.push(async () => {
        await cb();
      });

      // Return a dummy handle
      return { handle: nextTimeoutCallbacks.length - 1 };
    };

    const apiTimeoutMs = 10;

    // Initial GET
    let getCalls = 0;
    server.use(
      http.get(`/api/training-sessions/${id}/next`, () => {
        getCalls += 1;

        if (getCalls === 1) {
          return HttpResponse.json({
            itemId: "1",
            fen: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
            openingEco: "C20",
            openingName: "Opening A",
            correctMoveUci: "e2e4",
          });
        }

        // Each scheduled advance fetch returns a new item
        // (we won't necessarily execute both callbacks, but this is fine)
        return HttpResponse.json({
          itemId: String(getCalls + 1),
          fen: `fen_${getCalls}`,
          openingEco: "C20",
          openingName: `Opening ${getCalls}`,
          correctMoveUci: "e2e4",
        });
      }),
      http.post(`/api/training-sessions/${id}/responses`, () => {
        return HttpResponse.json({
          correct: true,
          sessionCompleted: false,
          fenAfter:
            "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1",
        });
      }),
    );

    const { result } = renderHook(() =>
      useTrainingSession(id, on401Navigate, {
        timeoutMs: apiTimeoutMs,
        setTimeoutFn,
        clearTimeoutFn,
      }),
    );

    await waitFor(() => expect(result.current.itemId).toBe("1"));
    const prevFen = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

    // First correct move schedules an advance timeout (A)
    await act(async () => {
      await result.current.submitMove("e2e4", prevFen);
    });

    // Second correct move before advancing time should clear timeout A
    await act(async () => {
      await result.current.submitMove("e2e4", prevFen);
    });

    // This is the branch we want to cover:
    // if (advanceTimeoutRef.current) clearTimeoutFn(advanceTimeoutRef.current);
    expect(clearTimeoutFn).toHaveBeenCalledTimes(1);

    // Optional: ensure we scheduled two callbacks (A and then B),
    // meaning we cleared only the first.
    expect(nextTimeoutCallbacks).toHaveLength(2);
  });

  it("submitMove correct: advance timeout else-path applies next state and clears feedback", async () => {
    // Capture scheduled timeout callback(s)
    const scheduled: Array<() => void> = [];

    const setTimeoutFn = (cb: () => void) => {
      scheduled.push(cb);
      return (scheduled.length - 1);
    };

    const clearTimeoutFn = vi.fn();

    const prevItemId = "1";
    const nextItemId = "2";

    const prevFen = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
    const nextFen =
      "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1";

    let nextGetCalls = 0;

    server.use(
      http.get(`/api/training-sessions/${id}/next`, () => {
        nextGetCalls += 1;

        // 1) initial load
        if (nextGetCalls === 1) {
          return HttpResponse.json({
            itemId: prevItemId,
            fen: prevFen,
            openingEco: "C20",
            openingName: "Opening A",
            correctMoveUci: "e2e4",
          });
        }

        // 2) advance timeout fetch: must be !== prevItemId to hit else branch
        return HttpResponse.json({
          itemId: nextItemId,
          fen: nextFen,
          openingEco: "C20",
          openingName: "Opening B",
          correctMoveUci: "e2e4",
        });
      }),
      http.post(`/api/training-sessions/${id}/responses`, () => {
        return HttpResponse.json({
          correct: true,
          sessionCompleted: false,
          fenAfter: nextFen,
        });
      }),
    );

    const { result } = renderHook(() =>
      useTrainingSession(id, on401Navigate, {
        timeoutMs: 10,
        setTimeoutFn,
        clearTimeoutFn,
      }),
    );

    await waitFor(() => expect(result.current.itemId).toBe(prevItemId));

    // submitMove correct => schedules advance timeout
    await act(async () => {
      await result.current.submitMove("e2e4", prevFen);
    });

    // Ensure we scheduled the advance callback
    expect(scheduled).toHaveLength(1);

    // Execute the advance callback (this triggers the await nextPromise inside it)
    await act(async () => {
      scheduled[0]();
      // flush promises created by the async timeout callback
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(result.current.itemId).toBe(nextItemId);
    expect(result.current.fen).toBe(nextFen);
    expect(result.current.openingLabel).toBe("C20 Opening B");
    expect(result.current.feedback).toBe("");
    expect(on401Navigate).not.toHaveBeenCalled();

    // optional: clearTimeout branch not hit in this test
    expect(clearTimeoutFn).not.toHaveBeenCalled();
  });

  it("submitMove correct: when component unmounts, advance timeout callback early-returns", async () => {
    const scheduled: Array<() => void> = [];

    const setTimeoutFn = (cb: () => void) => {
      scheduled.push(cb);
      return (scheduled.length - 1);
    };
    const clearTimeoutFn = vi.fn();

    server.use(
      http.get(`/api/training-sessions/${id}/next`, () => {
        return HttpResponse.json({
          itemId: "1",
          fen: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
          openingEco: "C20",
          openingName: "Opening A",
          correctMoveUci: "e2e4",
        });
      }),
      http.post(`/api/training-sessions/${id}/responses`, () => {
        return HttpResponse.json({
          correct: true,
          sessionCompleted: false,
          fenAfter:
            "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1",
        });
      }),
    );

    const { result, unmount } = renderHook(() =>
      useTrainingSession(id, on401Navigate, {
        timeoutMs: 10,
        setTimeoutFn,
        clearTimeoutFn,
      }),
    );

    await waitFor(() => expect(result.current.itemId).toBe("1"));
    const prevFen = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

    // schedules advance timeout callback
    await act(async () => {
      await result.current.submitMove("e2e4", prevFen);
    });

    expect(scheduled).toHaveLength(1);

    // unmount before running the timeout callback -> triggers isMountedRef.current === false
    unmount();

    // invoking shouldn't attempt to set state; it should hit:
    // if (!isMountedRef.current) return;
    await act(async () => {
      scheduled[0]();
      await Promise.resolve();
    });

    expect(on401Navigate).not.toHaveBeenCalled();
  });

  it("takeAutoplayOnce: only allows one autoplay per itemId", () => {
    server.use(
      http.get(`/api/training-sessions/${id}/next`, () => {
        return HttpResponse.json({ itemId: "1" });
      }),
    );

    const { result } = renderHook(() => useTrainingSession(id, on401Navigate));

    expect(result.current.takeAutoplayOnce("x")).toBe(true);
    expect(result.current.takeAutoplayOnce("x")).toBe(false);
    expect(result.current.takeAutoplayOnce("y")).toBe(true);
    expect(result.current.takeAutoplayOnce("y")).toBe(false);
  });
});
