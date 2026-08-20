---
name: run-react
description: Build, run, and drive the Knight School React frontend (chess-trainer). Use when asked to start the app, log in, take a screenshot (including phone/mobile viewports), walk through opening training, or otherwise interact with the running React UI, as opposed to just running its unit tests.
---

This is a Vite/React SPA served through the project's docker-compose
stack, reached via an nginx reverse proxy in front of the `react`
service's Vite dev server. Drive it with the Playwright driver at
`.claude/skills/run-react/driver.mjs`, run *inside* the `react`
container — the container already has `playwright` in
`node_modules`, so there is nothing extra to install. Don't use
`chromium-cli` from the host: this app must be reached through
nginx (see Gotchas), and the driver already handles that.

All paths below are relative to `react/` (the unit root), unless a
command explicitly `cd`s to the repo root for `docker compose`.

## Prerequisites

None beyond Docker — the whole stack (react, api, db, nginx)
runs via `docker compose`. From the repo root:

```bash
docker compose up -d
docker compose ps   # confirm react, api, db, nginx are all "running"/"healthy"
```

## Run (agent path)

Copy the driver into the running `react` container, then pipe it a
command script over stdin. From the repo root:

```bash
docker compose cp react/.claude/skills/run-react/driver.mjs react:/app/driver.mjs
docker compose exec -T react node driver.mjs <<'EOF'
nav /login
shot 01-login
login uxpolish TestPass123!
sleep 800
fill input[aria-label="Search openings"] | Najdorf
sleep 500
click .variation-row
sleep 300
click .ob-start
wait-url /training/
wait .board-host svg
sleep 600
shot training-board
fill input.text-input[placeholder*="type a move"] | e2e4
click button:has-text("Play")
sleep 800
shot after-move
quit
EOF
```

Pull the screenshots out to inspect them:

```bash
docker compose cp react:/app/driver-shots ./driver-shots
```

Viewport defaults to 375×812 (phone). Use `viewport <w> <h>` to change it.

Driver commands (one per line, space-separated args):

| command | what it does |
|---|---|
| `nav <path>` | `page.goto(baseURL + path)` — `baseURL` is `https://localhost` by default |
| `viewport <w> <h>` | resize the viewport |
| `login <user> <pass>` | fills the login form by label, submits, waits for redirect to `/dashboard` |
| `fill <selector> \| <value>` | fills an input — selector and value are split on `" \| "` (not a bare space), because CSS attribute selectors like `input[aria-label="Search openings"]` contain spaces themselves |
| `click <selector>` | clicks the first match |
| `wait <selector>` | waits for the selector to attach (15s timeout) |
| `wait-url <substring>` | waits until `location.pathname` contains the substring (e.g. `/training/`) |
| `sleep <ms>` | fixed wait — used after `fill`/`click` that trigger async state (React fetches, `useMemo` recompute) that don't have a DOM signal to wait on |
| `shot <name>` | full-page screenshot to `/app/driver-shots/<name>.png` in the container |
| `quit` | closes the browser and exits |

Real credentials for local QA: username `uxpolish`, password
`TestPass123!` (pre-verified, no email step needed).

## Run (human path)

`docker compose up -d`, then open `https://localhost` in a real
browser (self-signed cert — accept the warning). Useless for an
agent since there's no display; use the driver above instead.

## Test

```bash
docker compose exec react npx eslint .
docker compose exec react npx vitest run
docker compose exec react npx vite build
```

`npm run build` runs `tsc -b` first, which has pre-existing errors in
untouched files unrelated to most changes — the real gate is
eslint + vitest + `vite build`, not the full `npm run build`/`tsc -b`.
All three must pass before pushing (this repo pushes straight to
`main` with no PR review gate — CI failures are user-visible, not
caught in review first).

---

## Gotchas

- **Vite dev server rejects any Host header except `localhost`.**
  Hitting the app by its docker-compose service name (`https://nginx`,
  or any container IP directly) gets a 403 from Vite:
  `Blocked request. This host ("nginx") is not allowed.` nginx forwards
  the client's own `Host` header straight through
  (`proxy_set_header Host $host;`), so the fix has to happen on the
  client side: the driver launches Chromium with
  `--host-resolver-rules=MAP localhost <nginx-container-ip>` (looked up
  via `getent hosts nginx` at startup) so a request to `https://localhost`
  resolves to nginx's real IP *and* still carries a `Host: localhost`
  header that Vite accepts.
- **`react` is the compose service name, not `frontend`.** (Other
  project docs/memory reference "frontend" generically — the actual
  service in `docker-compose.yml` is `react`.)
- **The login form has no `name`/`type` selectors to key off** —
  `Login.tsx`'s inputs are bare `<input className="text-input" .../>`.
  Use `page.getByLabel("Username")` / `getByLabel("Password")` and
  `getByRole("button", { name: "Submit" })` instead.
- **The openings list loads asynchronously after `/dashboard` renders**
  (a `GET /openings` fetch in a `useEffect`). Filling the search box
  immediately after the login redirect can race this fetch and silently
  filter against an empty list, leaving the "bases" grid on screen
  instead of switching to the "search" view. Sleep ~800ms after the
  dashboard loads, before typing into search.
- **`getByRole("button", { name: /^Start/ })` is ambiguous** — there
  are two buttons matching "Start": the board-preview move-stepper's
  "Start" button (jumps to the initial position) and the actual
  "Start <opening>" session button. Use the `.ob-start` class instead.
- **`docker compose cp <container-dir> <host-dir>` nests one extra
  level** if `<host-dir>` already exists (copies to
  `<host-dir>/<container-dir-basename>/...`) — check the actual output
  path after copying screenshots out, don't assume the flat path.

## Troubleshooting

- **`page.goto` hangs / `net::ERR_CONNECTION_REFUSED` on `https://localhost`
  from inside the `react` container**: `localhost` inside that container
  is the container itself (nothing listens on 443 there) — you must be
  running the driver's host-resolver-rules workaround, not a bare
  `chromium.launch()`.
- **`locator.fill: Unexpected token "" while parsing css selector`**:
  a selector containing a literal space (e.g. an `aria-label` value)
  got mis-split by naive whitespace parsing. The driver's `fill` command
  requires the `" | "` delimiter for exactly this reason.
