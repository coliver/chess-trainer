# Knight School — Rails + Hotwire Frontend

> A second, dev-only frontend against the same `/api` backend. Not deployed to
> prod. See the root README's "Swappable frontends" section for the
> convention this follows, and [`PLAN.md`](./PLAN.md) for the full design
> rationale and build order this app was implemented against.

This is a Rails 8 + Hotwire (Turbo + Stimulus) exploration/learning project,
built alongside the production React frontend rather than replacing it. It
covers the "core loop" only: login/register/email verification, a dashboard
with an opening browser and progress summary, and a training session with
move submission, hints, and a timeline stepper. Puzzles, Settings, and
preferences sync are out of scope for v1 — see `PLAN.md`'s Context section
for the full list of deliberate cuts.

## Architecture

- **Session-based auth.** Unlike React (which stores the JWT in
  `localStorage`), Rails keeps the access/refresh tokens server-side in its
  encrypted session cookie — the browser never sees them directly.
- **No database.** This app has no models; `--skip-active-record` at
  scaffold time. All state lives in the FastAPI backend, reached through
  `ApiClient` (a Faraday wrapper) and `AuthenticatedApiClient` (adds
  401-refresh-retry on top).
- **Shared chess logic.** Board legality, FEN computation, and move
  helpers come from `@knight-school/chess-core` (the same `file:` npm
  dependency React uses) — bundled into Rails' JS via `jsbundling-rails`
  (esbuild), not hand-ported.
- **Shared CSS.** Page styles come from `packages/shared-styles/*.css`,
  the same framework-neutral stylesheets React imports — see that
  package's `STYLE_GUIDE.md`.
- **Subpath mount.** Served behind nginx at `/rails/...`
  (`location /rails/ { proxy_pass http://rails:3000; }`, no path
  rewriting), so routes are wrapped in `scope "/rails"`, and the asset
  prefix / static files (cm-chessboard sprites, sound `.mp3`s) all carry
  that prefix too.

## Running it

From the repo root:

```sh
docker compose up -d --build rails nginx api db
```

Then visit **http://localhost/rails/dashboard** (redirects to login if
logged out). The container runs `bin/dev` (Puma + `esbuild --watch`), so
Ruby and JS/CSS changes both pick up live — no rebuild step needed for
local iteration.

## Tests and linting

Per this repo's Docker-only convention, run everything through the
running container, not host Ruby:

```sh
docker compose exec rails bundle exec rspec     # request specs (WebMock-stubbed API calls)
docker compose exec rails bundle exec rubocop   # style (rubocop-rails-omakase)
```

CI runs the same two checks on every PR — see
[`.github/workflows/rails.yml`](../.github/workflows/rails.yml). It also
builds `packages/chess-core` and the esbuild bundle first, since request
specs render full views and Propshaft needs `app/assets/builds/*` on disk.
CI boots in `RAILS_ENV=test` using the committed
`config/credentials/test.key` — a throwaway key with no real secrets,
kept separate from `config/master.key` (gitignored, dev/prod only).

## Project structure

```text
rails/
├── app/
│   ├── controllers/          # ApplicationController (auth/error rescue), sessions, registrations,
│   │                          # email_verifications, dashboard, trainings
│   ├── services/              # ApiClient, AuthenticatedApiClient, OpeningGrouping (Ruby port of
│   │                          # react/src/lib/groupOpenings.ts)
│   ├── views/                 # ERB templates + Turbo Frame partials (dashboard/opening browser)
│   ├── javascript/
│   │   ├── controllers/       # Stimulus: training, board_preview, opening_thumb
│   │   └── chess/              # board_factory.js (cm-chessboard setup), sound.js
│   └── assets/stylesheets/    # application.css (page-flash, etc.) — most styling comes from
│                               # packages/shared-styles/*.css instead
├── spec/requests/             # RSpec request specs, WebMock-stubbed FastAPI calls
├── config/routes.rb            # scope "/rails" do ... end
└── PLAN.md                     # design doc + step-by-step build order this app followed
```

## Known gaps (v1)

- Puzzles page doesn't exist — the header links to Dashboard
  ("Openings"), Settings, and logout.
- Settings covers theme, board colors/piece set/coordinates/animations,
  board orientation mode, and sound — all round-trip to
  `/users/me/preferences` and actually apply. It does not cover the
  language toggle (still English-only) or the snow effect (client-only
  in React, not backend-synced).
- English-only (no i18n).
- Not wired into `docker-compose.prod.yml` or the deploy workflow —
  dev-only, matching how Angular was dev-only before its removal.
