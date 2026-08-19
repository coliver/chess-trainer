import { test, expect } from "@playwright/test";

const baseURL = process.env.BASE_URL ?? "http://localhost:5173";

async function mockAuth(page: import("@playwright/test").Page) {
  await page.addInitScript(() => {
    localStorage.setItem("username", "lobter");
  });
  await page.route("**/api/auth/me", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ id: 1, username: "lobter" }),
    });
  });
}

test("settings page shows a live board preview that updates with preference changes", async ({
  page,
}) => {
  await mockAuth(page);
  await page.setViewportSize({ width: 900, height: 1000 });

  await page.goto(`${baseURL}/settings`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("main.page .card", { timeout: 15000 });

  // Board should render inside the new preview section.
  await page.waitForSelector(".settings-preview-board .board-host svg", {
    state: "attached",
    timeout: 15000,
  });
  await page.waitForTimeout(300);
  await page.screenshot({ path: "settings-preview-default.png" });

  // Change board colors -> css class on the board host's inner element should change.
  await page.selectOption("#settings-board-theme", "green");
  await page.waitForTimeout(300);
  await expect(page.locator(".settings-preview-board .cm-chessboard")).toHaveClass(/green/);
  await page.screenshot({ path: "settings-preview-green.png" });

  // Change piece set.
  await page.selectOption("#settings-piece-set", "staunty");
  await page.waitForTimeout(300);
  await page.screenshot({ path: "settings-preview-staunty.png" });

  // Toggle coordinates off.
  await page.getByText("Show board coordinates").locator("..").locator('input[type="checkbox"]').click();
  await page.waitForTimeout(300);
  await page.screenshot({ path: "settings-preview-nocoords.png" });

  // Flip orientation to Black-on-bottom.
  await page.getByText("Always keep Black on bottom").click();
  await page.waitForTimeout(300);
  await page.screenshot({ path: "settings-preview-black-bottom.png" });
});
