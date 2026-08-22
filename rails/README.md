# Knight School — Rails + Hotwire Frontend

![Coverage](https://img.shields.io/badge/coverage-98%25-brightgreen)

> A second frontend against the same `/api` backend, now deployed alongside
> React at `/rails/...`. See the root README's "Swappable frontends" section
> for the convention this follows, and [`PLAN.md`](./PLAN.md) for the full
> design rationale and build order this app was implemented against.

This is a Rails 8 + Hotwire (Turbo + Stimulus) exploration/learning project,
built alongside the production React frontend rather than replacing it. It
covers the "core loop" only: login/register/email verification, a dashboard
with an opening browser and progress summary, a training session with move
submission, hints, and a timeline stepper, a puzzles page, and a settings
page with preferences sync. See `PLAN.md`'s Context section for the v1 cuts
that remain (i18n beyond English).

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
docker compose exec rails bundle exec rspec     # request/service/helper specs (WebMock-stubbed API calls)
docker compose exec rails bundle exec rubocop   # style (rubocop-rails-omakase + rubocop-rspec)
```

`rspec` prints a SimpleCov line-coverage summary and writes a full report
to `coverage/index.html`. rubocop-rspec enforces the automated form of
[betterspecs.org](https://www.betterspecs.org/) conventions — `context
"when ..."` wording, `described_class`, one clear behavior per example —
with `ExampleLength`/`MultipleExpectations`/`NestedGroups` thresholds
raised in `.rubocop.yml` to fit how the request specs here are actually
written (several WebMock stubs plus a couple of closely-related
assertions per example), rather than the gem's stricter defaults.

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
│   │                          # email_verifications, dashboard, trainings, puzzles, settings
│   ├── services/              # ApiClient, AuthenticatedApiClient, OpeningGrouping (Ruby port of
│   │                          # react/src/lib/groupOpenings.ts)
│   ├── views/                 # ERB templates + Turbo Frame partials (dashboard/opening browser,
│   │                          # trainings/show, puzzles/show)
│   ├── javascript/
│   │   ├── controllers/       # Stimulus: training, puzzle, board_preview, opening_thumb
│   │   └── chess/              # board_factory.js (cm-chessboard setup), sound.js
│   └── assets/stylesheets/    # application.css (page-flash, etc.) — most styling comes from
│                               # packages/shared-styles/*.css instead
├── spec/requests/             # RSpec request specs, WebMock-stubbed FastAPI calls
├── config/routes.rb            # scope "/rails" do ... end
└── PLAN.md                     # design doc + step-by-step build order this app followed
```

## Known gaps (v1)

- Puzzles serves the next due puzzle from `/puzzles/next`, tracks a
  solved/streak counter client-side, and proxies attempts through
  `POST /rails/puzzles/:id/attempts`; shows a "no puzzles due" panel on
  a 404 instead of a board.
- Settings covers theme, board colors/piece set/coordinates/animations,
  board orientation mode, and sound — all round-trip to
  `/users/me/preferences` and actually apply. It does not cover the
  language toggle (still English-only) or the snow effect (client-only
  in React, not backend-synced).
- I18n is wired throughout (`t()` in views/controllers,
  `app/javascript/i18n.js` bridging translations into Stimulus
  controllers). `config.i18n.available_locales` is derived at boot from
  every file in `packages/i18n-locales/locales/*.json` (currently 37),
  matching what React's `LanguageToggle` and the backend's
  `supported_languages()` already offer. Settings' `language` row lets a
  user pick any of them, round-trips through `/users/me/preferences`, and
  `ApplicationController#set_locale` applies it to `I18n.locale` on
  subsequent requests by reading the cached `session[:preferences]` (no
  extra API call — it takes effect starting with the next full-page
  request after the one that saved it, since a fresh session hasn't cached
  preferences yet on its very first request).
- Rails and React now render the same English copy for every UI concept
  both apps have, pulled from one shared file:
  `packages/i18n-locales/locales/en-US.json` (the same file React's
  `i18next` setup reads) is the single source of truth for shared strings.
  `config/initializers/i18n_json_loader.rb` transforms it at boot — i18next
  conventions (`{{var}}`, `key_one`/`key_other`) become Ruby I18n's
  (`%{var}`, `key: { one:, other: }`) — into `tmp/i18n_json_cache/en-US.json`,
  which is added to `I18n.load_path` like any other locale file, so it
  participates in normal reload/caching and both `I18n.t` and views' `t()`
  resolve shared keys (e.g. `t("puzzles.title")`) exactly like React's
  `t()` does. `ApplicationHelper#js_translations` serializes that same
  generated file into the layout's `<script id="i18n-strings">` tag, so a
  Stimulus controller and its ERB view reference the literal same key —
  there's no separate `js:` namespace. Only strings with no React
  equivalent — because the concept doesn't exist on that side, or the flow
  is structurally different (e.g. a full-page flash-redirect vs React's
  inline optimistic UI) — stay local in `config/locales/en.yml`.
- Deployed alongside React and served at `/rails/...` on
  knightschool.click — `docker-compose.prod.yml` runs it with
  `RAILS_ENV=production`, and `.github/workflows/deploy.yml` builds/starts
  it and gates deploys on `rails.yml`'s CI job passing first.
