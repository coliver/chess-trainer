import { test, type Page } from "@playwright/test";
import { mockAuth } from "./auth-helpers";

const baseURL = process.env.BASE_URL ?? "http://localhost:5173";

// One representative width per CSS breakpoint band. The app's media queries
// break at max-width 1024px and max-width 600px (see styles/*.css), giving
// three bands: desktop (>1024), tablet (601–1024), mobile (≤600).
const VIEWPORTS = [
  { label: "desktop", width: 1440, height: 900 },
  { label: "tablet", width: 900, height: 1000 },
  { label: "mobile", width: 375, height: 812 },
] as const;

const THEMES = ["light", "dark"] as const;

const START_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

function logPageIssues(page: Page, tag: string) {
  page.on("console", (msg) => {
    if (msg.type() === "error" || msg.type() === "warning") {
      console.log(`[console:${tag}]`, msg.text());
    }
  });
  page.on("pageerror", (err) => {
    console.log(`[pageerror:${tag}]`, err.message);
  });
}

async function applyTheme(page: Page, theme: (typeof THEMES)[number]) {
  await page.addInitScript((t) => {
    localStorage.setItem("theme", t);
    const el = document.documentElement;
    if (el) el.setAttribute("data-theme", t);
  }, theme);
}

test.describe("Dashboard screenshots (breakpoints × theme)", () => {
  for (const vp of VIEWPORTS) {
    for (const theme of THEMES) {
      test(`dashboard ${theme} @ ${vp.label} (${vp.width}px)`, async ({
        page,
      }) => {
        const tag = `${theme}:${vp.label}`;
        logPageIssues(page, tag);
        await page.setViewportSize({ width: vp.width, height: vp.height });
        await applyTheme(page, theme);
        await mockAuth(page);

        await page.route("**/api/openings", async (route) => {
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify([
              {
                eco: "B20",
                name: "Sicilian Defense",
                epd: null,
                uci_moves: "e2e4 c7c5",
                description: null,
              },
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
              {
                eco: "C00",
                name: "French Defense",
                epd: null,
                uci_moves: "e2e4 e7e6",
                description: null,
              },
              {
                eco: "D30",
                name: "Queen's Gambit Declined",
                epd: null,
                uci_moves: "d2d4 d7d5 c2c4 e7e6",
                description: null,
              },
            ]),
          });
        });

        await page.route("**/api/progress/summary", async (route) => {
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({
              positionsSeen: 15,
              overallAccuracy: 0.85,
              mastered: 4,
              currentStreak: 2,
              longestStreak: 2,
            }),
          });
        });
        await page.route("**/api/progress/due", async (route) => {
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify([
              {
                fen: "rnbqkbnr/pp1ppppp/8/2p5/4P3/8/PPPP1PPP/RNBQKBNR w KQkq c6 0 2",
                correctMoveUci: "g1f3",
                openingEco: "B20",
                openingName: "Sicilian Defense",
                dueAt: "2026-08-14T09:00:00Z",
              },
              {
                fen: "rnbqkbnr/pppp1ppp/4p3/8/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2",
                correctMoveUci: "d2d4",
                openingEco: "C00",
                openingName: "French Defense",
                dueAt: "2026-08-14T09:00:00Z",
              },
              {
                fen: "rnbqkbnr/ppp1pppp/8/3p4/2PP4/8/PP2PPPP/RNBQKBNR b KQkq c3 0 2",
                correctMoveUci: "e7e6",
                openingEco: "D30",
                openingName: "Queen's Gambit Declined",
                dueAt: "2026-08-14T09:00:00Z",
              },
              {
                fen: "r1bqkbnr/pppp1ppp/2n5/1B2p3/4P3/5N2/PPPP1PPP/RNBQK2R b KQkq - 3 3",
                correctMoveUci: "a7a6",
                openingEco: "C60",
                openingName: "Ruy Lopez",
                dueAt: "2026-08-14T09:00:00Z",
              },
            ]),
          });
        });
        await page.route("**/api/progress/weak-spots", async (route) => {
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify([
              {
                openingName: "Nimzo-Larsen Attack: Dutch Variation",
                attempts: 3,
                correctCount: 2,
                incorrectCount: 1,
              },
              { openingName: "Review", attempts: 9, correctCount: 7, incorrectCount: 2 },
              {
                openingName: "French Defense",
                attempts: 8,
                correctCount: 7,
                incorrectCount: 1,
              },
            ]),
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
        await page.route("**/api/progress/step-accuracy", async (route) => {
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify([
              {
                openingEco: "B20",
                openingName: "Sicilian Defense",
                orderIndex: 4,
                correctMoveUci: "d2d4",
                attempts: 6,
                correctCount: 2,
                incorrectCount: 4,
                accuracy: 0.33,
                commonWrongMoves: [{ moveUci: "g1f3", count: 3 }],
              },
              {
                openingEco: "D43",
                openingName: "Semi-Slav Defense: Meran Variation, Lundin Variation",
                orderIndex: 5,
                correctMoveUci: "c1d2",
                attempts: 4,
                correctCount: 0,
                incorrectCount: 4,
                accuracy: 0,
                commonWrongMoves: [{ moveUci: "c1g5", count: 4 }],
              },
              {
                openingEco: "C60",
                openingName: "Ruy Lopez",
                orderIndex: 6,
                correctMoveUci: "e1g1",
                attempts: 5,
                correctCount: 3,
                incorrectCount: 2,
                accuracy: 0.6,
                commonWrongMoves: [{ moveUci: "d2d3", count: 2 }],
              },
            ]),
          });
        });

        await page.goto(`${baseURL}/dashboard`, {
          waitUntil: "domcontentloaded",
        });

        await page.waitForSelector("#root", { timeout: 15000 });
        await page.waitForSelector("main.page .card", { timeout: 15000 });
        await page.getByRole("heading", { name: "Openings" }).waitFor();
        await page.getByText("Sicilian Defense", { exact: true }).waitFor();

        await page.waitForTimeout(300);

        await page.screenshot({
          path: `dashboard-${theme}-${vp.width}.png`,
          fullPage: true,
        });
      });
    }
  }
});

test.describe("Training board screenshots (breakpoints × theme)", () => {
  for (const vp of VIEWPORTS) {
    for (const theme of THEMES) {
      test(`training ${theme} @ ${vp.label} (${vp.width}px)`, async ({
        page,
      }) => {
        const tag = `${theme}:${vp.label}`;
        logPageIssues(page, tag);
        await page.setViewportSize({ width: vp.width, height: vp.height });
        await applyTheme(page, theme);
        await mockAuth(page);

        // First (and any) training item: white to move, so no autoplay fires.
        await page.route(
          "**/api/training-sessions/*/next",
          async (route) => {
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
          },
        );

        await page.route(
          "**/api/training-sessions/*/responses",
          async (route) => {
            await route.fulfill({
              status: 200,
              contentType: "application/json",
              body: JSON.stringify({ correct: true, fenAfter: START_FEN }),
            });
          },
        );

        await page.goto(`${baseURL}/training/sess-1`, {
          waitUntil: "domcontentloaded",
        });

        await page.waitForSelector("#root", { timeout: 15000 });
        await page.waitForSelector("main.page .card", { timeout: 15000 });
        // The board host holds the cm-chessboard <svg>. Matching the SVG's
        // class directly is unreliable in Playwright, so wait for the svg via
        // the plain HTML host, then give the piece sprites a moment to paint.
        await page.waitForSelector(".board-host svg", {
          state: "attached",
          timeout: 15000,
        });

        await page.waitForTimeout(600);

        await page.screenshot({
          path: `training-${theme}-${vp.width}.png`,
          fullPage: true,
        });
      });
    }
  }
});
