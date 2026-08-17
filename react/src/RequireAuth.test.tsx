// frontend/src/RequireAuth.test.tsx
import { vi, describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { RequireAuth } from "./RequireAuth";
import api from "./api";

vi.mock("./api", () => ({
  default: { get: vi.fn() },
}));

const renderGuarded = () =>
  render(
    <MemoryRouter initialEntries={["/dashboard"]}>
      <Routes>
        <Route
          path="/dashboard"
          element={
            <RequireAuth>
              <div>Protected Content</div>
            </RequireAuth>
          }
        />
        <Route path="/login" element={<div>Login Page</div>} />
      </Routes>
    </MemoryRouter>,
  );

describe("RequireAuth", () => {
  it("renders the protected content when /auth/me returns a valid user", async () => {
    (api.get as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      data: { id: 1, username: "chris" },
    });

    renderGuarded();

    expect(await screen.findByText("Protected Content")).toBeInTheDocument();
  });

  it("redirects to /login when /auth/me rejects (e.g. 401)", async () => {
    (api.get as unknown as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error("401"));

    renderGuarded();

    expect(await screen.findByText("Login Page")).toBeInTheDocument();
  });

  it("redirects to /login when /auth/me resolves with a non-user body (e.g. an HTML SPA fallback)", async () => {
    // Regression: hitting a dev server that doesn't proxy /api can return a
    // 200 with the index.html body instead of a real error. That must not
    // be treated as authenticated just because the request didn't throw.
    (api.get as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      data: "<!doctype html><html>...</html>",
    });

    renderGuarded();

    expect(await screen.findByText("Login Page")).toBeInTheDocument();
  });
});
