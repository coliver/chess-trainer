import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "./tests/msw/server";
import api from "./api";

describe("api interceptors", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    server.resetHandlers();
  });

  it("attaches the Authorization header when a token is present", async () => {
    localStorage.setItem("token", "abc123");
    let seenAuth: string | null = null;

    server.use(
      http.get("/api/whoami", ({ request }) => {
        seenAuth = request.headers.get("authorization");
        return HttpResponse.json({ ok: true });
      }),
    );

    await api.get("/whoami");
    expect(seenAuth).toBe("Bearer abc123");
  });

  it("does not attach Authorization when no token is present", async () => {
    let seenAuth: string | null = "unset";

    server.use(
      http.get("/api/whoami2", ({ request }) => {
        seenAuth = request.headers.get("authorization");
        return HttpResponse.json({ ok: true });
      }),
    );

    await api.get("/whoami2");
    expect(seenAuth).toBeNull();
  });

  it("on 401, refreshes the token and retries the original request", async () => {
    localStorage.setItem("token", "expired");
    localStorage.setItem("refresh_token", "refresh-abc");

    let protectedCalls = 0;

    server.use(
      http.get("/api/protected", ({ request }) => {
        protectedCalls += 1;
        const auth = request.headers.get("authorization");
        if (auth === "Bearer expired") {
          return HttpResponse.json({ detail: "unauthorized" }, { status: 401 });
        }
        return HttpResponse.json({ ok: true, auth });
      }),
      http.post("/api/auth/refresh", async ({ request }) => {
        const body = (await request.json()) as { refresh_token: string };
        expect(body.refresh_token).toBe("refresh-abc");
        return HttpResponse.json({ access_token: "new-token" });
      }),
    );

    const res = await api.get("/protected");

    expect(res.data).toEqual({ ok: true, auth: "Bearer new-token" });
    expect(localStorage.getItem("token")).toBe("new-token");
    expect(protectedCalls).toBe(2);
  });

  it("on refresh failure, clears tokens and redirects to /login", async () => {
    localStorage.setItem("token", "expired");
    localStorage.setItem("refresh_token", "refresh-abc");

    const assignSpy = vi.fn();
    const originalLocation = window.location;
    Object.defineProperty(window, "location", {
      configurable: true,
      value: { ...originalLocation, assign: assignSpy },
    });

    server.use(
      http.get("/api/protected2", () => {
        return HttpResponse.json({ detail: "unauthorized" }, { status: 401 });
      }),
      http.post("/api/auth/refresh", () => {
        return HttpResponse.json({ detail: "invalid refresh" }, { status: 401 });
      }),
    );

    await expect(api.get("/protected2")).rejects.toBeTruthy();

    expect(localStorage.getItem("token")).toBeNull();
    expect(localStorage.getItem("refresh_token")).toBeNull();
    expect(assignSpy).toHaveBeenCalledWith("/login");

    Object.defineProperty(window, "location", {
      configurable: true,
      value: originalLocation,
    });
  });

  it("on 401 with no refresh token stored, clears tokens and redirects to /login", async () => {
    localStorage.setItem("token", "expired");
    // no refresh_token set

    const assignSpy = vi.fn();
    const originalLocation = window.location;
    Object.defineProperty(window, "location", {
      configurable: true,
      value: { ...originalLocation, assign: assignSpy },
    });

    server.use(
      http.get("/api/protected3", () => {
        return HttpResponse.json({ detail: "unauthorized" }, { status: 401 });
      }),
    );

    await expect(api.get("/protected3")).rejects.toBeTruthy();

    expect(assignSpy).toHaveBeenCalledWith("/login");

    Object.defineProperty(window, "location", {
      configurable: true,
      value: originalLocation,
    });
  });

  it("passes through non-401 errors unchanged", async () => {
    server.use(
      http.get("/api/broken", () => {
        return HttpResponse.json({ detail: "server error" }, { status: 500 });
      }),
    );

    await expect(api.get("/broken")).rejects.toMatchObject({
      response: { status: 500 },
    });
  });
});
