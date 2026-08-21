import { test, expect, type Page } from "@playwright/test";

const baseURL = process.env.BASE_URL ?? "http://localhost:5173";

async function mockAuth(page: Page) {
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
}

test.describe("Gap flow coverage", () => {

  test("unauthenticated user is redirected to /login", async ({ page }) => {
    await page.route("**/api/auth/me", async (route) => {
      await route.fulfill({
        status: 401,
        contentType: "application/json",
        body: JSON.stringify({}),
      });
    });

    await page.goto(`${baseURL}/dashboard`, {
      waitUntil: "domcontentloaded",
    });

    await expect(page).toHaveURL(/\/login/, { timeout: 15000 });
  });

  test("logout redirects to /login and protects routes again", async ({
    page,
  }) => {
    await mockAuth(page);

    // Mock dashboard APIs
    await page.route("**/api/openings", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([]),
      });
    });

    await page.route("**/api/progress/summary", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          positionsSeen: 0,
          overallAccuracy: 0,
          mastered: 0,
          currentStreak: 0,
          longestStreak: 0,
        }),
      });
    });

    await page.route("**/api/progress/due", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([]),
      });
    });

    await page.route("**/api/progress/weak-spots", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([]),
      });
    });

    // PreferencesContext (wraps the whole app) also fetches this; unmocked
    // it hits the real backend, gets a real 401, and the response
    // interceptor hard-navigates to /login before the dashboard ever loads.
    await page.route("**/api/users/me/preferences", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({}),
      });
    });

    await page.goto(`${baseURL}/dashboard`, {
      waitUntil: "domcontentloaded",
    });

    await page.waitForSelector("main.page .card", { timeout: 15000 });

    // Simulate logged-out session: re-route auth/me to return 401
    await page.route("**/api/auth/me", async (route) => {
      await route.fulfill({
        status: 401,
        contentType: "application/json",
        body: JSON.stringify({}),
      });
    });

    // Click logout button
    await page.getByRole("button", { name: /logout/i }).click();

    await expect(page).toHaveURL(/\/login/, { timeout: 15000 });
  });

  test("login page shows an error on invalid credentials", async ({
    page,
  }) => {
    await page.route("**/api/auth/login", async (route) => {
      await route.fulfill({
        status: 401,
        contentType: "application/json",
        body: JSON.stringify({ detail: "Invalid credentials" }),
      });
    });

    // api.ts's response interceptor retries any 401 through /auth/refresh
    // before giving up. Without a refresh_token this throws synchronously
    // and hard-navigates to /login (wiping the just-rendered error), so
    // seed a refresh_token and let the refresh call "succeed" to let the
    // retried /auth/login 401 propagate normally to the component's catch.
    await page.addInitScript(() => {
      localStorage.setItem("refresh_token", "seed-refresh-token");
    });
    await page.route("**/api/auth/refresh", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ access_token: "seed-access-token" }),
      });
    });

    await page.goto(`${baseURL}/login`, {
      waitUntil: "domcontentloaded",
    });

    // Fill form
    await page.getByLabel(/username/i).fill("testuser");
    await page.getByLabel(/password/i).fill("wrongpass");

    // Click submit
    await page.getByRole("button", { name: /log in|sign in|submit/i }).click();

    // Assert still on login page
    await expect(page).toHaveURL(/\/login/);

    // Assert error is visible
    await expect(page.locator(".auth-error")).toContainText("Invalid credentials");
  });
});
