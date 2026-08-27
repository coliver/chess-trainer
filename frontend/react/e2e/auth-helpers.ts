import type { Page } from "@playwright/test";

// RequireAuth gates protected routes on a valid GET /auth/me response, and
// PreferencesContext (wraps the whole app) fetches /users/me/preferences on
// every authenticated page. These tests hit the Vite dev server directly (no
// nginx /api proxy), so both must be mocked explicitly rather than passing
// through via the SPA fallback — otherwise they hit the real backend, get a
// real 401, and the response interceptor hard-navigates to /login before the
// page under test ever renders.
export async function mockAuth(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem("username", "lobter");
    localStorage.setItem("token", "test-token");
  });
  await page.route("**/api/auth/me", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ id: 1, username: "lobter" }),
    });
  });
  await page.route("**/api/users/me/preferences", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({}),
    });
  });
}
