import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { mockAuth } from "./auth-helpers";

const baseURL = process.env.BASE_URL ?? "http://localhost:5173";

const START_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

test.describe("Auth & flows coverage", () => {

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

    // Open the mobile header's overflow drawer, then click logout
    await page.getByRole("button", { name: "Menu" }).click();
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

  test("email verification succeeds with a valid token", async ({ page }) => {
    await page.route("**/api/auth/verify-email**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ email: "lobter@example.com" }),
      });
    });

    await page.goto(`${baseURL}/verify-email?token=valid-token`, {
      waitUntil: "domcontentloaded",
    });

    await expect(page.getByRole("link", { name: /go to login|log in/i })).toBeVisible({
      timeout: 15000,
    });
  });

  test("email verification shows an error with an invalid token", async ({
    page,
  }) => {
    await page.route("**/api/auth/verify-email**", async (route) => {
      await route.fulfill({
        status: 400,
        contentType: "application/json",
        body: JSON.stringify({ detail: "Invalid or expired token" }),
      });
    });

    await page.goto(`${baseURL}/verify-email?token=bad-token`, {
      waitUntil: "domcontentloaded",
    });

    await expect(
      page.getByRole("link", { name: /return to login|back to login/i }),
    ).toBeVisible({ timeout: 15000 });
  });

  test("training session gives correct-move feedback on a real move", async ({
    page,
  }) => {
    await mockAuth(page);

    await page.route("**/api/training-sessions/*/next", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          itemId: "item-1",
          fen: START_FEN,
          correctMoveUci: "e2e4",
          openingName: "Italian Game",
          openingEco: "C50",
          pgn: "",
        }),
      });
    });

    await page.route("**/api/training-sessions/*/responses", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ correct: true, fenAfter: START_FEN }),
      });
    });

    await page.goto(`${baseURL}/training/sess-1`, {
      waitUntil: "domcontentloaded",
    });

    await page.waitForSelector(".board-host svg", {
      state: "attached",
      timeout: 15000,
    });

    // cm-chessboard's click-click move input: click the source square, then
    // the destination square (data-square attrs come from ChessboardView.js).
    await page.locator('[data-square="e2"]').first().click();
    await page.locator('[data-square="e4"]').first().click();

    await expect(page.getByText(/correct/i)).toBeVisible({ timeout: 15000 });
  });

  test("puzzle attempt gives incorrect-move feedback on a wrong move", async ({
    page,
  }) => {
    await mockAuth(page);

    await page.route("**/api/puzzles/next", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          puzzleId: "puzzle-1",
          fen: START_FEN,
          correctMoveUci: "e2e4",
        }),
      });
    });

    await page.route("**/api/puzzles/*/attempts", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          correct: false,
          reason: "wrong move",
          fenAfter: null,
        }),
      });
    });

    await page.goto(`${baseURL}/puzzles`, { waitUntil: "domcontentloaded" });

    await page.waitForSelector(".board-host svg", {
      state: "attached",
      timeout: 15000,
    });

    // Attempt a deliberately wrong move (a2a3 instead of the correct e2e4).
    await page.locator('[data-square="a2"]').first().click();
    await page.locator('[data-square="a3"]').first().click();

    await expect(page.getByText(/wrong move/i)).toBeVisible({ timeout: 15000 });
  });

  test("a changed settings preference persists across reload", async ({
    page,
  }) => {
    let savedTheme = "classic";

    await mockAuth(page);
    // Override the blanket preferences mock from mockAuth() with a stateful
    // one so a PATCH is reflected in the next GET, proving persistence
    // rather than just optimistic local state.
    await page.route("**/api/users/me/preferences", async (route) => {
      if (route.request().method() === "PATCH") {
        const body = route.request().postDataJSON();
        if (body?.board_theme) savedTheme = body.board_theme;
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ board_theme: savedTheme }),
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ board_theme: savedTheme }),
        });
      }
    });

    await page.goto(`${baseURL}/settings`, { waitUntil: "domcontentloaded" });
    await page.waitForSelector("main.page .card", { timeout: 15000 });
    await page.waitForSelector(".settings-preview-board .board-host svg", {
      state: "attached",
      timeout: 15000,
    });

    await page.selectOption("#settings-board-theme", "green");
    await page.waitForTimeout(300);

    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForSelector(".settings-preview-board .board-host svg", {
      state: "attached",
      timeout: 15000,
    });

    await expect(page.locator("#settings-board-theme")).toHaveValue("green");
    await expect(page.locator(".settings-preview-board .cm-chessboard")).toHaveClass(
      /green/,
    );
  });

  test("login page has no automatically-detectable accessibility violations", async ({
    page,
  }) => {
    await page.goto(`${baseURL}/login`, { waitUntil: "domcontentloaded" });
    await page.waitForSelector("main.page .card", { timeout: 15000 });

    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa"])
      .exclude(".site-header-version") // pre-existing contrast issue, see e2e/README.md
      .analyze();

    expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual([]);
  });

  test("dashboard has no automatically-detectable accessibility violations", async ({
    page,
  }) => {
    await mockAuth(page);
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
    await page.route("**/api/puzzles/summary", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          puzzlesSeen: 0,
          overallAccuracy: 0,
          mastered: 0,
        }),
      });
    });

    await page.goto(`${baseURL}/dashboard`, { waitUntil: "domcontentloaded" });
    await page.waitForSelector("main.page .card", { timeout: 15000 });

    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa"])
      .exclude(".site-header-version") // pre-existing contrast issue, see e2e/README.md
      .analyze();

    expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual([]);
  });
});
