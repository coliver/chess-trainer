import { test, expect } from "@playwright/test";

// One-off: creates the persistent smoke-test account used by
// playwright-prod-smoke.spec.ts. Not part of the regular test:smoke run —
// only re-run this if that account needs to be recreated (e.g. after a DB
// reset), since prod shouldn't accumulate a fresh registration on every run.
//
//   BASE_URL=http://localhost:5173 SMOKE_USERNAME=... SMOKE_PASSWORD=... \
//     npx playwright test playwright-prod-register.spec.ts
const baseURL = process.env.BASE_URL ?? "https://knightschool.click";
const username = process.env.SMOKE_USERNAME;
const password = process.env.SMOKE_PASSWORD;

test("register the persistent smoke-test account", async ({ page }) => {
  test.skip(!username || !password, "SMOKE_USERNAME/SMOKE_PASSWORD not set");

  await page.goto(`${baseURL}/register`);
  await page.getByLabel(/email/i).fill(`${username}@example.com`);
  await page.getByLabel(/username/i).fill(username!);
  await page.getByLabel(/^password/i).fill(password!);
  const confirm = page.getByLabel(/confirm password/i);
  if (await confirm.isVisible()) await confirm.fill(password!);
  await page.getByRole("button", { name: /register|sign up|create account/i }).click();
  await expect(page.getByRole("link", { name: /return to login|back to login/i })).toBeVisible({ timeout: 15000 });
  await expect(page.getByText(/username.*taken|already exists/i)).not.toBeVisible();
});
