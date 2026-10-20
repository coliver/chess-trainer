import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { login, logout, AUTH_CHANGED_EVENT } from "./auth";

describe("auth", () => {
  beforeEach(() => {
    localStorage.clear();
    // logout() calls the backend; keep that off the (msw-guarded) network.
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 204 })));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("login stores all fields and dispatches AUTH_CHANGED_EVENT", () => {
    const listener = vi.fn();
    window.addEventListener(AUTH_CHANGED_EVENT, listener);

    login({
      access_token: "tok",
      refresh_token: "refresh",
      id: 42,
      username: "chris",
      email: "chris@example.com",
    });

    expect(localStorage.getItem("token")).toBe("tok");
    expect(localStorage.getItem("refresh_token")).toBe("refresh");
    expect(localStorage.getItem("user_id")).toBe("42");
    expect(localStorage.getItem("username")).toBe("chris");
    expect(localStorage.getItem("email")).toBe("chris@example.com");
    expect(listener).toHaveBeenCalledTimes(1);

    window.removeEventListener(AUTH_CHANGED_EVENT, listener);
  });

  it("logout clears all fields and dispatches AUTH_CHANGED_EVENT", () => {
    login({
      access_token: "tok",
      refresh_token: "refresh",
      id: 1,
      username: "chris",
      email: "chris@example.com",
    });

    const listener = vi.fn();
    window.addEventListener(AUTH_CHANGED_EVENT, listener);

    logout();

    expect(localStorage.getItem("token")).toBeNull();
    expect(localStorage.getItem("refresh_token")).toBeNull();
    expect(localStorage.getItem("user_id")).toBeNull();
    expect(localStorage.getItem("username")).toBeNull();
    expect(localStorage.getItem("email")).toBeNull();
    expect(listener).toHaveBeenCalledTimes(1);

    window.removeEventListener(AUTH_CHANGED_EVENT, listener);
  });

  it("logout tells the backend, using the token read before it is cleared", () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetchMock);
    localStorage.setItem("token", "tok");

    logout();

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/auth/logout",
      expect.objectContaining({
        method: "POST",
        headers: { Authorization: "Bearer tok" },
        keepalive: true,
      })
    );
    expect(localStorage.getItem("token")).toBeNull();
  });

  it("logout still clears state when the backend call fails or there is no token", () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error("offline"));
    vi.stubGlobal("fetch", fetchMock);

    logout();
    expect(fetchMock).not.toHaveBeenCalled();

    localStorage.setItem("token", "tok");
    logout();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem("token")).toBeNull();
  });
});
