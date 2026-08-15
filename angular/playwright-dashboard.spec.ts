import { test, expect, type Page } from "@playwright/test";

const baseURL = process.env.BASE_URL ?? "http://localhost:4200";

// RequireAuth-equivalent `authGuard` gates /dashboard on a valid GET /auth/me
// response. These tests hit the dev server directly (no nginx /api proxy), so
// every backend call the dashboard makes on load has to be mocked explicitly.
async function mockAuth(page: Page) {
  await page.route("**/api/auth/me", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ id: 1, username: "demo" }),
    });
  });
}

async function mockProgress(page: Page) {
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
    await route.fulfill({ status: 200, contentType: "application/json", body: "[]" });
  });
  await page.route("**/api/progress/weak-spots", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: "[]" });
  });
}

// Regression coverage for a bug where three unrelated "Sicilian Defense" root
// lines (B20/B27/B50 — the opening name text is reused across ECO codes, see
// groupOpenings.ts) all lit up as "selected" when only one was picked, because
// selection was compared by name alone. Selection must be keyed on eco+name.
async function mockDuplicateNameOpenings(page: Page) {
  await page.route("**/api/openings", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([
        { eco: "B20", name: "Sicilian Defense", epd: null, uci_moves: "e2e4 c7c5", description: null },
        { eco: "B27", name: "Sicilian Defense", epd: null, uci_moves: "e2e4 c7c5", description: null },
        { eco: "B50", name: "Sicilian Defense", epd: null, uci_moves: "e2e4 c7c5", description: null },
        {
          eco: "B90",
          name: "Sicilian Defense: Najdorf Variation",
          epd: null,
          uci_moves: "e2e4 c7c5 g1f3 d7d6 d2d4 c5d4 f3d4 g8f6 b1c3 a7a6",
          description: null,
        },
        {
          eco: "C60",
          name: "Ruy Lopez",
          epd: null,
          uci_moves: "e2e4 e7e5 g1f3 b8c6 f1b5",
          description: null,
        },
      ]),
    });
  });
}

test("selecting one duplicate-named main line highlights only that row", async ({ page }) => {
  await mockAuth(page);
  await mockProgress(page);
  await mockDuplicateNameOpenings(page);

  await page.goto(`${baseURL}/angular/dashboard`, { waitUntil: "domcontentloaded" });

  await page.getByRole("heading", { name: "Openings" }).waitFor();

  // Drill into the "Sicilian Defense" base — its three same-named root lines
  // (B20/B27/B50) collapse into one base card.
  await page.getByRole("button", { name: /Sicilian Defense/ }).first().click();

  // Their shared "Main line" label clusters them under one collapsible group;
  // expand it to reach the three individual ECO rows.
  const groupHeader = page.getByRole("button", { name: /^Main line/ });
  await groupHeader.waitFor();
  await groupHeader.click();

  const mainLineRows = page.getByRole("listitem").filter({ hasText: "Main line" });
  await expect(mainLineRows).toHaveCount(3);

  const b20Row = mainLineRows.filter({ hasText: "B20" });
  const b27Row = mainLineRows.filter({ hasText: "B27" });
  const b50Row = mainLineRows.filter({ hasText: "B50" });

  await b20Row.click();

  await expect(b20Row).toHaveAttribute("aria-pressed", "true");
  await expect(b27Row).toHaveAttribute("aria-pressed", "false");
  await expect(b50Row).toHaveAttribute("aria-pressed", "false");

  // Picking the second row moves the highlight instead of adding to it.
  await b27Row.click();
  await expect(b20Row).toHaveAttribute("aria-pressed", "false");
  await expect(b27Row).toHaveAttribute("aria-pressed", "true");
  await expect(b50Row).toHaveAttribute("aria-pressed", "false");
});
