import { renderHook, act, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { useTrainingSession } from "./useTrainingSession";
import { server } from "../tests/msw/server";
import { http, HttpResponse } from "msw";

describe("useTrainingSession", () => {
  const mockId = "session-123";
  const mockOn401 = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    server.resetHandlers();
  });

  describe("Initialization", () => {
    it("should fetch the first item on mount", async () => {
      server.use(
        http.get(`/api/training-sessions/${mockId}/next`, () => {
          return HttpResponse.json({
            item_id: 10,
            fen: "rnbqkbnr/pppppppp/8/8/4/8/8/PPPPPPPP w KQkq - 0 1",
            opening_name: "Ruy Lopez",
            opening_eco: "C60",
            correct_move_uci: "e2e4",
          });
        }),
      );

      const { result } = renderHook(() =>
        useTrainingSession(mockId, mockOn401),
      );

      // Ensure the useEffect has finished and state is updated
      await waitFor(() => expect(result.current.itemId).toBe(10), {
        timeout: 2000,
      });

      expect(result.current.openingLabel).toBe("C60 Ruy Lopez");
      expect(result.current.correctMoveUci).toBe("e2e4");
    });

    it("should call on401Navigate when initial fetch returns 401", async () => {
      server.use(
        http.get(`/api/training-sessions/${mockId}/next`, () => {
          return new HttpResponse(null, { status: 401 });
        }),
      );

      renderHook(() => useTrainingSession(mockId, mockOn401));

      await waitFor(() => expect(mockOn401).toHaveBeenCalled());
    });
  });

  describe("submitMove", () => {
    const initialFen =
      "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
    const nextFen = "rnbqkbnr/pppppppp/8/8/4/8/8/PPPPPPPP b KQkq - 0 1";

    it("should handle a correct move and advance the session", async () => {
      // 1. Mock Initial State
      server.use(
        http.get(`/api/training-sessions/${mockId}/next`, () => {
          return HttpResponse.json({
            item_id: 10,
            fen: initialFen,
            correct_move_uci: "e2e4",
          });
        }),
      );

      const { result } = renderHook(() =>
        useTrainingSession(mockId, mockOn401),
      );

      // IMPORTANT: Wait for hook to be initialized, otherwise submitMove returns immediately (itemId === "")
      await waitFor(() => expect(result.current.itemId).toBe(10));

      // 2. Mock Move Response and the subsequent "Next" call
      server.use(
        http.post(`/api/training-sessions/${mockId}/responses`, () => {
          return HttpResponse.json({
            correct: true,
            fen_after: nextFen,
            session_completed: false,
          });
        }),
        http.get(`/api/training-sessions/${mockId}/next`, () => {
          return HttpResponse.json({
            item_id: "item-2",
            fen: "another-fen",
            correct_move_uci: "g1f3",
          });
        }),
      );

      await act(async () => {
        await result.current.submitMove("e2e4");
      });

      expect(result.current.feedback).toBe("✅ Correct!");
      expect(result.current.isAdvancing).toBe(true);

      // 3. Use waitFor to handle the 500ms delay + the async network request
      // We set timeout to 1500ms to give the 500ms timer and the API call plenty of time.
      await waitFor(
        () => {
          expect(result.current.itemId).toBe("item-2");
        },
        { timeout: 1500 },
      );

      expect(result.current.isAdvancing).toBe(false);
    });

    it("should revert FEN and show feedback on incorrect move", async () => {
      server.use(
        http.get(`/api/training-sessions/${mockId}/next`, () => {
          return HttpResponse.json({ item_id: 10, fen: initialFen });
        }),
      );

      const { result } = renderHook(() =>
        useTrainingSession(mockId, mockOn401),
      );
      await waitFor(() => expect(result.current.itemId).toBe(10));

      server.use(
        http.post(`/api/training-sessions/${mockId}/responses`, () => {
          return HttpResponse.json({ correct: false, reason: "Illegal move" });
        }),
      );

      await act(async () => {
        await result.current.submitMove("a2a4");
      });

      expect(result.current.feedback).toBe("❌ Illegal move");
      expect(result.current.fen).toBe(initialFen);
    });
  });

  describe("Autoplay Helpers", () => {
    it("should return true for shouldAutoplay when it is black's turn", async () => {
      const blackTurnFen =
        "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR b KQkq - 0 1";

      // 1. Mock the initial fetch to prevent it from failing or using leaked handlers
      server.use(
        http.get(`/api/training-sessions/${mockId}/next`, () => {
          return HttpResponse.json({
            item_id: 10,
            fen: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
          });
        }),
      );

      const { result } = renderHook(() =>
        useTrainingSession(mockId, mockOn401),
      );

      // 2. Wait for the initial mount fetch to finish.
      // This prevents the async fetch from overwriting our manual setFen call.
      await waitFor(() => expect(result.current.itemId).toBe(10));

      // 3. Now safely set the FEN to Black's turn
      await act(async () => {
        result.current.setFen(blackTurnFen);
      });

      await waitFor(() => {
        expect(result.current.shouldAutoplay()).toBe(true);
      });
    });

    it("should only allow takeAutoplayOnce to execute once per itemId", () => {
      const { result } = renderHook(() =>
        useTrainingSession(mockId, mockOn401),
      );
      const itemId = "10";

      expect(result.current.takeAutoplayOnce(itemId)).toBe(true);
      expect(result.current.takeAutoplayOnce(itemId)).toBe(false);
      expect(result.current.takeAutoplayOnce("item-2")).toBe(true);
    });
  });
});
