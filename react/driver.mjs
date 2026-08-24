// Generic Playwright driver for the Knight School React app, run *inside*
// the `react` docker compose service (see SKILL.md — the container already
// has `playwright` in node_modules; nothing to install).
//
// Piped a small command script via stdin, one command per line:
//
//   nav /dashboard
//   login uxpolish TestPass123!
//   fill input[aria-label="Search openings"] Najdorf
//   click .variation-row
//   click .ob-start
//   wait .board-host svg
//   shot training-board
//   fill input.text-input[placeholder*="type a move"] e2e4
//   click button:has-text("Play")
//   shot after-move
//
// Screenshots land in /app/driver-shots/<name>.png inside the container —
// `docker compose cp react:/app/driver-shots <host-path>` to pull them out.
//
// Why this exists instead of chromium-cli: this app is served through an
// nginx reverse proxy (see SKILL.md "Gotchas" — Vite's dev-server host check
// rejects any Host header that isn't "localhost"), which needs a Chromium
// launch flag (`--host-resolver-rules`) that a bare chromium-cli session
// doesn't expose. This driver sets that up once, then behaves like a tiny
// chromium-cli.

import { chromium } from "playwright";
import readline from "node:readline";
import { mkdirSync } from "node:fs";
import { execSync } from "node:child_process";

const outDir = "/app/driver-shots";
mkdirSync(outDir, { recursive: true });

const baseURL = process.env.BASE_URL ?? "https://localhost";

// Vite's dev server only allows Host: localhost (see SKILL.md Gotchas).
// nginx forwards whatever Host header the client sent, so a plain
// `nav https://nginx/...` gets a 403 from Vite. Map "localhost" to nginx's
// real container IP so requests to https://localhost carry the right Host
// header and still land on the nginx container.
function nginxIp() {
  if (process.env.NGINX_IP) return process.env.NGINX_IP;
  const out = execSync("getent hosts nginx").toString().trim();
  return out.split(/\s+/)[0];
}

const browser = await chromium.launch({
  args: ["--no-sandbox", `--host-resolver-rules=MAP localhost ${nginxIp()}`],
});
const context = await browser.newContext({
  viewport: { width: 375, height: 812 },
  ignoreHTTPSErrors: true,
});
const page = await context.newPage();
page.on("console", (m) => {
  if (m.type() === "error") console.log("[console:error]", m.text());
});
page.on("pageerror", (e) => console.log("[pageerror]", e.message));

const rl = readline.createInterface({ input: process.stdin });

for await (const raw of rl) {
  const line = raw.trim();
  if (!line || line.startsWith("#")) continue;
  const [cmd, ...rest] = line.split(" ");
  const arg = rest.join(" ");
  try {
    switch (cmd) {
      case "nav": {
        await page.goto(`${baseURL}${arg}`, { waitUntil: "domcontentloaded" });
        break;
      }
      case "viewport": {
        const [w, h] = arg.split(" ").map(Number);
        await page.setViewportSize({ width: w, height: h });
        break;
      }
      case "login": {
        const [user, pass] = arg.split(" ");
        await page.getByLabel("Username").fill(user);
        await page.getByLabel("Password").fill(pass);
        await page.getByRole("button", { name: "Submit" }).click();
        await page.waitForURL(/\/dashboard/, { timeout: 15000 });
        break;
      }
      case "fill": {
        // Selector and value are separated by " | " (not a plain space) —
        // CSS attribute selectors like input[aria-label="Search openings"]
        // contain spaces themselves, so a naive first-space split breaks.
        const sp = arg.indexOf(" | ");
        const [sel, val] = [arg.slice(0, sp), arg.slice(sp + 3)];
        await page.locator(sel).first().fill(val);
        break;
      }
      case "click": {
        await page.locator(arg).first().click();
        break;
      }
      case "wait": {
        await page.waitForSelector(arg, { state: "attached", timeout: 15000 });
        break;
      }
      case "wait-url": {
        await page.waitForURL((url) => url.pathname.includes(arg), {
          timeout: 15000,
        });
        break;
      }
      case "sleep": {
        await page.waitForTimeout(Number(arg));
        break;
      }
      case "shot": {
        await page.screenshot({ path: `${outDir}/${arg}.png`, fullPage: true });
        console.log("screenshot:", arg);
        break;
      }
      case "quit": {
        await browser.close();
        process.exit(0);
      }
      default:
        console.log("unknown command:", cmd);
    }
    console.log("ok:", line);
  } catch (e) {
    console.log("ERROR on:", line, "\n ", e.message);
  }
}

await browser.close();
