import { test, expect, type Page } from "@playwright/test";

// Logs into the persistent smoke-test account and exercises core features.
// Defaults to prod so this can be run ad hoc after a deploy:
//   BASE_URL=http://localhost:5173 npx playwright test playwright-prod-smoke.spec.ts
//
// Requires a pre-existing account (see playwright-prod-register.spec.ts) —
// this test does NOT register, so repeated runs don't pile up throwaway
// accounts on prod.
const baseURL = process.env.BASE_URL ?? "https://knightschool.click";
const username = process.env.SMOKE_USERNAME ?? "smoketest-persistent";
const password = process.env.SMOKE_PASSWORD ?? "SmokeTest123!";

function logPageIssues(page: Page) {
  const errors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg.text());
  });
  page.on("pageerror", (err) => errors.push(String(err)));
  return errors;
}

test("login and exercise core features", async ({ page }) => {
  const consoleErrors = logPageIssues(page);

  await page.goto(baseURL);
  await expect(page).toHaveTitle(/Knight School/);

  await page.goto(`${baseURL}/login`);
  await page.getByLabel(/username/i).fill(username);
  await page.getByLabel(/^password/i).fill(password);
  await Promise.all([
    page.waitForURL(/\/dashboard/, { timeout: 15000 }),
    page.getByRole("button", { name: /log in|sign in|submit/i }).click(),
  ]);

  // Dashboard: openings list should render for the authenticated user.
  await page.waitForSelector("main.page .card", { timeout: 15000 });
  await page.getByRole("heading", { name: "Openings" }).waitFor();

  // Puzzles: nav to the new puzzle trainer and confirm a real puzzle loads.
  await page.getByRole("link", { name: /puzzle/i }).click();
  await expect(page.getByRole("heading", { name: "Puzzles" })).toBeVisible();
  await page.waitForSelector(".board-host svg, svg", { timeout: 15000 });

  const fatalErrors = consoleErrors.filter(
    (e) =>
      !e.includes("No refresh token available") && // benign pre-auth race on initial dashboard fetch
      !e.includes("status of 401"), // the resource-load errors paired with the above
  );
  expect(fatalErrors, `unexpected console errors: ${fatalErrors.join("\n")}`).toEqual([]);
});
