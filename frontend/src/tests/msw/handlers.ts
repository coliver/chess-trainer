// frontend/src/tests/msw/handlers.ts
import { http, HttpResponse } from "msw";

export const defaultHandlers = [
  http.get("/api/training-sessions/:id/next", () => {
    return HttpResponse.json({
      item_id: 10,
      fen_after: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
      correct_move_uci: "e2e4",
      opening_eco: "C20",
      opening_name: "King's Pawn Game",
      pgn: "",
      epd: "",
      fen: null,
    });
  }),

  http.post("/api/training-sessions/:id/responses", async () => {
    // default: treat move as correct
    return HttpResponse.json({
      correct: true,
      reason: "correct move",
      fen_after:
        "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1",
      session_completed: false,
    });
  }),

  http.post("/api/training-sessions", () => {
    return HttpResponse.json({ id: 1 });
  }),
];
