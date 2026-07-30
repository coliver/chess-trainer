import { test } from "@playwright/test";

test.describe("Dashboard screenshots (light/dark)", () => {
  const baseURL = process.env.BASE_URL ?? "http://localhost:5173";

  for (const theme of ["light", "dark"] as const) {
    test(`dashboard (${theme})`, async ({ page }) => {
      page.on("console", (msg) => {
        if (msg.type() === "error" || msg.type() === "warning") {
          console.log(`[console:${theme}]`, msg.text());
        }
      });

      page.on("pageerror", (err) => {
        console.log(`[pageerror:${theme}]`, err.message);
      });

      await page.addInitScript((t) => {
        localStorage.setItem("theme", t);
        const el = document.documentElement;
        if (el) el.setAttribute("data-theme", t);
      }, theme);

      await page.route("**/api/openings", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify([
            {
              eco: "C20",
              name: "King's Pawn Game",
              epd: null,
              pgn: null,
              uci_moves: "e2e4 e7e5",
              description: "mock",
            },
          ]),
        });
      });

      await page.goto(`${baseURL}/dashboard`, { waitUntil: "domcontentloaded" });

      await page.waitForSelector("#root", { timeout: 15000 });
      await page.waitForSelector("main.page .card", { timeout: 15000 });
      await page.getByText("Start Training an Opening", { exact: true }).waitFor();

      await page.waitForTimeout(300);

      await page.screenshot({ path: `dashboard-${theme}.png`, fullPage: true });
    });
  }
});
