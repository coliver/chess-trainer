//frontend/src/tests/msw/handlers.ts
import { http, HttpResponse } from "msw";

const nextRegex =
  /\/api\/training-sessions\/[^/]+\/next\/?(?:\?.*)?$/;
const responsesRegex =
  /\/api\/training-sessions\/[^/]+\/responses\/?(?:\?.*)?$/;
const trainingSessionsPostRegex =
  /\/api\/training-sessions\/?(?:\?.*)?$/;

export const defaultHandlers = [
  http.get(nextRegex, ({ request }) => {
    const url = new URL(request.url, "http://localhost");
    const match = url.pathname.match(
      /\/api\/training-sessions\/([^/]+)\/next\/?$/
    );

    const rawId = match?.[1] ?? "";
    const id = Number(rawId);

    console.log("MSW hit: next", { rawId, id, pathname: url.pathname });

    return HttpResponse.json({
      sessionId: id,
      itemId: 10,
      orderIndex: 0,
      fen: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
      moveCountLimit: null,
      openingEco: "C20",
      openingName: "King's Pawn Game",
      correctMoveUci: "e2e4",
    });
  }),

  http.post(responsesRegex, async () => {
    console.log("MSW hit: responses");

    return HttpResponse.json({
      correct: true,
      reason: "correct move",
      fenAfter:
        "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1",
      sessionCompleted: false,
    });
  }),

  http.post(trainingSessionsPostRegex, () => {
    console.log("MSW hit: post training-sessions");
    return HttpResponse.json({ id: 1 });
  }),
];