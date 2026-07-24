// frontend/src/api.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "./tests/msw/server";
import api from "./api";

describe("api.ts refresh failure (401) behavior", () => {
  const tokenKey = "token";
  const refreshKey = "refresh_token";

  beforeEach(() => {
    console.log("\n--- beforeEach ---");
    localStorage.removeItem(tokenKey);
    localStorage.removeItem(refreshKey);
    vi.restoreAllMocks();

    localStorage.setItem(tokenKey, "expired");
    localStorage.setItem(refreshKey, "rtok");
    console.log("seeded localStorage:", {
      token: localStorage.getItem(tokenKey),
      refresh_token: localStorage.getItem(refreshKey),
    });
  });

  afterEach(() => {
    console.log("--- afterEach (resetHandlers) ---\n");
    server.resetHandlers();
    vi.restoreAllMocks();
  });

  it("clears tokens and redirects to /login when refresh fails (401)", async () => {
    let needsRefreshHits = 0;
    let refreshHits = 0;

    server.use(
      http.get("/api/needs-refresh", async ({ request }) => {
        needsRefreshHits++;
        const auth = request.headers.get("authorization");
        console.log("MSW hit GET /api/needs-refresh:", { hits: needsRefreshHits, auth });
        return HttpResponse.json({ detail: "unauthorized" }, { status: 401 });
      }),

      http.post("/api/auth/refresh", async ({ request }) => {
        refreshHits++;
        console.log("MSW hit POST /api/auth/refresh:", { hits: refreshHits });

        try {
          const body = await request.json();
          console.log("refresh request body:", body);
        } catch (e) {
          console.log("could not parse refresh request json:", e);
        }

        return HttpResponse.json(
          { detail: "refresh unauthorized" },
          { status: 401 }
        );
      })
    );

    const hrefIsLoginBefore = window.location.href;

    console.log("window.location.href BEFORE:", hrefIsLoginBefore);

    await expect(api.get("/needs-refresh")).rejects.toBeTruthy();

    console.log("after api.get rejection");
    console.log("counts:", { needsRefreshHits, refreshHits });

    console.log("localStorage after:", {
      token: localStorage.getItem(tokenKey),
      refresh_token: localStorage.getItem(refreshKey),
    });

    console.log("window.location.href AFTER:", window.location.href);

    expect(needsRefreshHits).toBe(1);
    expect(refreshHits).toBe(1);

    expect(localStorage.getItem(tokenKey)).toBeNull();
    expect(localStorage.getItem(refreshKey)).toBeNull();
  });
});
