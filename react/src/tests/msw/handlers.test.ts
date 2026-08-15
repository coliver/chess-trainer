import { describe, it, expect } from "vitest";
import axios from "axios";

// Exercises the default MSW handlers directly (registered by vitest.setup.ts),
// since most component tests mock `../api` outright and never hit these.
const client = axios.create({ baseURL: "/api" });

describe("default MSW handlers", () => {
  it("GET /openings returns the mock opening list", async () => {
    const res = await client.get("/openings");
    expect(res.data).toHaveLength(2);
    expect(res.data[0]).toMatchObject({ eco: "C20", name: "King's Pawn Game" });
  });

  it("POST /training-sessions returns a session id", async () => {
    const res = await client.post("/training-sessions", {});
    expect(res.data).toEqual({ id: 1 });
  });

  it("GET /training-sessions/:id/next returns a derived next item", async () => {
    const res = await client.get("/training-sessions/5/next");
    expect(res.data).toMatchObject({
      sessionId: 5,
      itemId: 10,
      openingEco: "C20",
      correctMoveUci: "e2e4",
    });
  });

  it("POST /training-sessions/:id/responses returns a correct-move result", async () => {
    const res = await client.post("/training-sessions/5/responses", {});
    expect(res.data).toMatchObject({ correct: true, sessionCompleted: false });
  });
});
