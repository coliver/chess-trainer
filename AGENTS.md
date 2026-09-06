# AGENTS.md

Knight School: a chess openings + puzzle trainer. FastAPI + PostgreSQL backend, three
frontends behind nginx — React (`/`, primary/production), Angular (`/angular/`, secondary,
static build, at parity with React), Rails+Hotwire (`/rails/`, secondary, core loop only) —
all same-origin against the same `/api`, so the backend is frontend-agnostic.

## Run everything in Docker — never on the host
- Never `pip install`/`npm install` into a local venv or `node_modules`, and never hand-set
  env vars to fake the DB/JWT config — the containers are the real, sufficient environment.
- Compose services: `db`, `api`, `react`, `angular`, `rails`, `nginx`, `erd` (SchemaCrawler,
  regenerates the DB diagram into `backend/app/docs/`). Bring the stack up with
  `docker compose up -d`; it mounts the repo live, so host edits are picked up without a
  rebuild.
- Backend checks: `docker compose exec api pytest`, `ruff check .`, `black --check .`,
  Alembic commands, one-off scripts.
- Frontend checks: `docker compose exec react npm run lint|test|build|test:e2e` — same
  pattern for `angular` and `rails` using their own `package.json` scripts.
- If an npm/ng command suddenly fails with a missing-package error after a dependency
  change, the container's anonymous `node_modules` volume is stale:
  `docker compose up -d --force-recreate --renew-anon-volumes <service>`.

## Repo map
- `backend/app/` — FastAPI app. `routers/` (one file per domain: auth, training, puzzles,
  progress, openings, users) is thin routing + request/response models; `modules/<domain>/`
  (`models.py`, `service.py`, plus `training/chess_rules.py` and `progress/srs.py` +
  `streak.py`) holds the actual logic; `migrations/versions/` is Alembic, schema changes
  only. Full walkthrough: `backend/app/docs/ARCHITECTURE.md`; setup: `backend/README.md`.
- `tests/` (repo root) — the pytest suite; extend existing files rather than inventing a new
  layout.
- `frontend/react/` — primary, production frontend (Vite + React). Its README covers
  page/hook structure and API contracts in detail.
- `frontend/angular/` — secondary frontend being brought to parity with React;
  `PARITY_GAPS.md` is the live punch list, ordered by what to port next.
- `frontend/rails/` — secondary Rails+Hotwire frontend covering the core loop;
  `README.md` has the architecture notes and a known-gaps list.
- `frontend/packages/` — shared code consumed by more than one frontend: `chess-core`
  (framework-neutral chess logic — consumed via built `dist/`, so `npm run build` there
  after editing `src/` or frontends silently run stale logic), `i18n-locales` (translation
  JSON, one file per locale, the single shared source of truth), `shared-styles`.
- `nginx/` — reverse proxy config; the one place that stitches the three frontends and
  `/api` together at the same origin.
- Root docs: `README.md` (project overview, the "Swappable frontends" convention for adding
  a new client, and a per-client feature matrix), `CHANGELOG.md` (dated log), `ROADMAP.md`
  (planned work, kept short).

Adding or changing how a frontend is served (new client, new nginx route, new CI workflow)
follows the convention in root `README.md`'s "Swappable frontends" section — don't duplicate
it here.

## The move-validation contract (must not change silently)
`backend/app/modules/training/chess_rules.py:validate_and_apply()` is the single source of
truth, and `tests/test_routers_training.py` / `tests/test_training_service.py` assert these
exact values:
- UCI doesn't parse → `400`, `correct=false`, `reason="invalid move_uci"`, `fen_after=null`
- UCI parses but is illegal from `fen` → `200`, `correct=false`, `reason="illegal move"`,
  `fen_after=null`
- UCI is legal but not the expected move → `200`, `correct=false`, `reason="wrong move"`,
  deterministic `fen_after` from applying the submitted move

Changing any of this is a breaking change to every frontend's move-submission handling —
treat it as deliberate, not incidental.

## i18n
Source of truth is `frontend/packages/i18n-locales/locales/en-US.json`. Add or rename a key
there, then run `docker compose exec react npm run i18n:sync` (the sync script lives in the
react container regardless of which frontend the string is for) to propagate the change to
the other 30+ locales. Details: `frontend/react/README.md`'s Internationalization section.

## Keep docs in sync
When you land a notable change, add a `CHANGELOG.md` entry and update whichever doc actually
describes the thing you changed (a frontend's `README.md`, `PARITY_GAPS.md`,
`backend/app/docs/ARCHITECTURE.md`) — don't wait to be asked.

## Working style
- No secrets or credentials committed to the repo.
- Minimal, surgical, testable changes — extend existing tests rather than restructuring.
- Don't break the running app: FastAPI boots, `/ping` responds, nginx + TLS proxy stays
  untouched unless the task actually requires changing it.
- Keep responses short and explain one thing at a time.
