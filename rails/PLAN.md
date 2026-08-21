# Rails + Hotwire frontend for Knight School (chess-trainer)

## Context

Knight School currently has one production frontend (React) and one disconnected
legacy frontend (`angular/`, removed from prod/CI/compose because it doubled
build/disk cost without enough payoff). The repo's root README documents a
deliberate "swappable frontends" convention: any framework can be added as a
same-origin frontend under nginx, calling the backend at `/api`, with zero
backend changes required. The user wants to add a **Rails + Hotwire** frontend
following that convention, as a learning/exploration project alongside the
existing React app — not a replacement.

Given the size of a full frontend, and the cautionary tale of Angular's
prod/CI cost, the user has scoped this down deliberately:

- **New `rails/` directory in this repo** (not a separate repo).
- **Dev-only for now** — no prod compose/nginx wiring yet; mirrors how
  React/Angular are dev-only containers in prod (`docker-compose.prod.yml`
  only runs `db api nginx`, prod serves a static build instead). Rails can't
  be reduced to a static build, so full prod wiring is deferred.
- **"Core loop" scope for v1**: Login, Register, VerifyEmail (auth) +
  Dashboard (opening browser + progress summary) + Training (board, move
  submission, hints, timeline). **Out of scope for v1**: Puzzles page,
  Settings page, preferences backend sync (board uses hardcoded defaults
  matching React's `DEFAULT_PREFERENCES`).
- **Board legality**: reuse `@knight-school/chess-core` (already
  framework-neutral, built on `chess.js`, npm `file:` dependency) directly
  from Rails' JS bundle, the same way React and Angular do — not a hand-port.
- **i18n**: English-only for v1.

## Two load-bearing technical findings

1. **Subpath mounting.** `location /rails/ { proxy_pass http://rails:3000; }`
   passes the full `/rails/...` URI through unchanged (same pattern as
   `/vite-hmr` and Angular's old `--serve-path /angular/`). Rails must know
   it's mounted at `/rails` in three places: `config/routes.rb` (wrap routes
   in `scope "/rails" do ... end`), Propshaft asset prefix
   (`config.assets.prefix = "/rails/assets"`), and plain static files
   (cm-chessboard sprites, sound `.mp3`s — these are fetched by fixed
   unhashed paths at runtime, so they must live under `rails/public/rails/...`,
   which Rails serves at request path `/rails/...`). Don't add separate nginx
   locations for `/cm-chessboard-assets/` or `/sounds/` — those paths are
   already claimed by React's identical public assets under `location /`.

2. **No client-side backend access.** The JWT lives server-side in Rails'
   encrypted session cookie — browser JS has no access to it. So the
   Training page's Stimulus controller can't `fetch()` FastAPI directly; it
   must hit a thin Rails JSON endpoint (`POST /rails/trainings/:id/moves`)
   that forwards to FastAPI with the session's access token.

## Directory structure

```
rails/
  Dockerfile
  Gemfile / Gemfile.lock
  package.json / package-lock.json      # esbuild + npm deps
  Procfile.dev                          # web: rails server; js: esbuild --watch
  config/
    routes.rb                           # everything inside scope "/rails" do
    initializers/
      session_store.rb                  # cookie_store, path: "/rails"
      assets.rb                         # adds packages/shared-styles to assets.paths
  app/
    controllers/
      application_controller.rb         # require_auth!, api client accessor
      sessions_controller.rb            # login + resend-verification
      registrations_controller.rb       # register
      email_verifications_controller.rb # ?token= confirmation
      dashboard_controller.rb           # show + openings Turbo Frame
      trainings_controller.rb           # show + moves#create (JSON proxy)
    services/
      api_client.rb                     # Faraday wrapper, {"detail":...} -> ApiError
      authenticated_api_client.rb        # 401 -> refresh -> retry-once -> Unauthorized
      opening_grouping.rb                # Ruby port of react/src/lib/groupOpenings.ts
    views/
      layouts/application.html.erb
      sessions/new.html.erb
      registrations/new.html.erb
      email_verifications/show.html.erb
      dashboard/show.html.erb
      dashboard/_opening_list.html.erb   # turbo_frame_tag "opening_list"
      trainings/show.html.erb
    javascript/
      application.js
      controllers/
        training_controller.js           # board + move submit + hints + timeline
        board_preview_controller.js       # dashboard preview board (read-only)
        opening_browser_controller.js     # dashboard search/select
      chess/
        board_factory.js                  # shared cm-chessboard construction
        sound.js                          # ported subset of react sound.ts
  public/
    rails/
      cm-chessboard-assets/               # copied from packages/shared-assets/ at container boot
      sounds/                             # copied from packages/shared-assets/ (full set, shared with react)
```

No `app/models/`, no ActiveRecord, no `config/database.yml` — scaffold with
`rails new . --skip-active-record --skip-active-storage --skip-action-mailbox
--skip-action-text --javascript=esbuild --skip-test`. Rails is a pure
API-consuming view layer, same role React plays; it must not get its own
Postgres schema.

## Talking to FastAPI

`app/services/api_client.rb` wraps Faraday, hitting `API_BASE_URL`
(container-to-container `http://api:8000`, **not** through nginx/`/api` —
that path is for browsers). Maps FastAPI's `{"detail": "..."}` error shape
into `ApiClient::ApiError#detail`/`#status` for controllers to render as
flash/form errors. Gem: `faraday` only, keep it minimal for v1.

## Auth / session architecture

- **Storage**: Rails' default encrypted+signed cookie session store, scoped
  to `path: "/rails"`. Right call for a server-rendered Hotwire app — tokens
  are well under the 4KB cookie budget.
- **`require_auth!`** (`ApplicationController`, the Ruby equivalent of
  `RequireAuth.tsx`): redirects to login if no token in session, else
  re-validates via `GET /auth/me` through the authenticated client.
- **`AuthenticatedApiClient`** (the Ruby equivalent of `api.ts`'s 401-refresh
  interceptor): a service object (not Faraday middleware, since middleware
  can't reach back into the Rails session) that retries a request once after
  refreshing the access token on a 401, then raises `Unauthorized` — caught
  by `rescue_from` in `ApplicationController`, which resets the session and
  redirects to login.
- `SessionsController#create` on 403 "Email not verified" re-renders `:new`
  with a resend-verification action, mirroring `Login.tsx`.
  `RegistrationsController#create` shows a "check your email" view on
  success, no auto-login (matches React — register doesn't return tokens).

## Chess board + move logic

- **Consume `@knight-school/chess-core` as an npm dependency** (built in the
  Dockerfile before `npm ci`, exactly like `react/Dockerfile` does via
  `file:../packages/chess-core`) rather than hand-porting its TS. Avoids a
  second copy of `legalMoves`/`applyMove`/`deriveStatus`/`createTimeline`/etc.
  that could drift from React's.
- **Bundler: esbuild via `jsbundling-rails`**, not importmap-rails. cm-chessboard
  ships unbundled multi-file ESM source with relative imports
  (`Chessboard.js` importing `./ChessboardView.js`, extension files, etc.) —
  importmap's CDN-pin mechanism is built for single-entry packages and is
  fragile for this deep-import style. esbuild + real `npm install` mirrors
  what Vite does for React.
- `app/javascript/chess/board_factory.js`: shared cm-chessboard construction
  (assets at `/rails/cm-chessboard-assets/`, hardcoded style defaults
  matching React's `DEFAULT_PREFERENCES` since Settings/preferences are out
  of scope for v1).
- `training_controller.js`: **one fused Stimulus controller** combining the
  roles of `Board.tsx` + `Training.tsx` + `useTrainingSession.ts` — board
  construction, `enableMoveInput` handling (mirroring the
  `moveInputStarted`/`validateMoveInput` switch), move submission via
  `fetch()` (with `X-CSRF-Token` from a `<meta>` tag — easy to forget, causes
  silent 422s), timeline stepper, hint escalation. Kept as one controller
  because cm-chessboard's `validateMoveInput` needs a synchronous return
  value, which doesn't compose cleanly split across two Stimulus controllers
  talking over DOM events.
- `TrainingsController#show` server-renders the first `GET .../next` result
  straight into `data-training-*-value` attributes — no client-fetch-on-mount
  round trip needed, an improvement Hotwire gets "for free" over React's
  approach. `#create_response` (`POST /rails/trainings/:id/moves`) is a thin
  JSON proxy to `POST /api/training-sessions/:id/responses`.
- Only port the sound triggers Training actually needs (`move`, `capture`,
  `castle`, `promote`, `correct`, `incorrect`, `gameStart`, `moveOpponent`,
  `illegal`, `achievement`) into `chess/sound.js`, assets at `/rails/sounds/`.

## Shared styles

Reuse `packages/shared-styles/*.css` as-is (plain global CSS, framework
neutral) via `config.assets.paths << Rails.root.join("../packages/shared-styles")`
and `stylesheet_link_tag "tokens", "base", "header", "ui", "board", "login",
"training", "dashboard"` in the layout — inherits the plum/rose jewel-tone
theme (dark accent `#8a3f56`, light accent `#b5482a`, dark bg `#16171d`,
light bg `#f4f1ec`) without reinventing it. Reuse `AuthCard.tsx`'s exact
class names (`page`, `card`, `title`, `subtitle`, `auth-*`, `text-input`) in
the ERB auth views so `login.css` applies unmodified.

## Docker / nginx / CI wiring

**`rails/Dockerfile`**: `FROM ruby:3.3-slim`, install build-essential + Node
20 (for esbuild), build `packages/chess-core` first (same two-line pattern
as `react/Dockerfile`), `bundle install`, `npm ci`, copy source,
`EXPOSE 3000`, `CMD ["bin/dev"]` (Procfile.dev running rails server + esbuild
watch; add `foreman` to the Gemfile's dev group so `bin/dev` has a runner).

**`docker-compose.yml`**: new `rails` service mirroring `react`'s shape —
`build: {context: ., dockerfile: rails/Dockerfile}`, volumes
`./rails:/app`, `./packages:/packages`, anonymous `/app/node_modules`,
`expose: ["3000"]`, `depends_on: api`, env `API_BASE_URL: http://api:8000`,
`RAILS_ENV: development`, `restart: unless-stopped`, `logging: *default-logging`.
No changes to `docker-compose.prod.yml` / `nginx/conf-prod` (prod already
only runs `db api nginx`).

**`nginx/default.conf`**: add, after the `/api/` block:
```nginx
location /rails/ {
  set $rails_upstream rails;
  proxy_pass http://$rails_upstream:3000;
  proxy_set_header Host $host;
  proxy_set_header X-Real-IP $remote_addr;
  proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
  proxy_set_header X-Forwarded-Proto $scheme;
  proxy_http_version 1.1;
  proxy_read_timeout 86400;
}
```

**`.github/workflows/rails.yml`** (new, standalone `pull_request` +
`workflow_call` trigger, matching `react.yml`/`core.yml`'s pattern — note
`tests.yml` is its own standalone backend-only job, not an aggregator, and
`react.yml`/`core.yml` are only pulled together by `deploy.yml`; since Rails
is dev-only and not deployed, **`rails.yml` does not need to be added to
`deploy.yml`**): checkout, setup-node + build `packages/chess-core`,
`ruby/setup-ruby` with `bundler-cache: true`, `npm ci`,
`bin/rails assets:precompile RAILS_ENV=test`, a boot smoke check
(`bin/rails runner 'puts "Rails boots OK"'`).

**`rails/README.md`**: mirror `react/README.md`'s structure — Project
Navigation, Project Structure tree, Docker-only dev setup
(`docker compose up -d --build rails`, `docker compose exec rails bin/rails
...` per `AGENTS.md`'s Docker-only mandate), network architecture note
(base path `/rails`, `API_BASE_URL` internal vs `/api` external,
session-cookie auth vs React's localStorage), Known Gaps (Puzzles/Settings/
prod/i18n out of scope for v1).

## Build order (each step independently verifiable)

1. **Bare Rails app, Dockerized, nginx-proxied.** Scaffold via a throwaway
   `ruby:3.3-slim` container (not host Ruby — `docker run --rm -v
   "${PWD}/rails:/app" -w /app ruby:3.3-slim bash -c "gem install rails -v
   7.2 --no-document && rails new . --skip-active-record
   --skip-active-storage --skip-action-mailbox --skip-action-text
   --javascript=esbuild --skip-test"`), then `rails/Dockerfile`, the compose
   service, the nginx block, `scope "/rails"` with a `ping` route, assets
   prefix config.
   **Verify**: `docker compose up -d --build rails nginx api db`; `curl -s
   http://localhost/rails/ping` → `ok`.

2. **Asset pipeline + shared styles.** `config/initializers/assets.rb`,
   layout `stylesheet_link_tag`s, copy `react/public/cm-chessboard-assets`
   and the needed `sounds/*.mp3` subset into `rails/public/rails/`.
   **Verify**: `curl -I http://localhost/rails/assets/tokens.css` → 200;
   `curl -I http://localhost/rails/cm-chessboard-assets/pieces/standard.svg`
   → 200.

3. **Auth vertical slice.** `api_client.rb`, `authenticated_api_client.rb`,
   sessions/registrations/email_verifications controllers + views,
   `require_auth!`, session store initializer.
   **Verify**: register a throwaway user (EMAIL_VERIFICATION_REQUIRED is
   true in the dev compose override, so this needs either a real
   verification round-trip or a temporary bypass — check
   `docker-compose.override.yml` at implementation time), log in, confirm
   the `/rails`-scoped session cookie, confirm redirect-to-login when
   logged out on a gated stub route.

4. **Dashboard.** `dashboard_controller.rb`, `opening_grouping.rb` (Ruby
   port of `react/src/lib/groupOpenings.ts` — `openingKey`, `baseNameOf`,
   `colorOf`, `groupByBase`, `groupVariations`), views + Turbo Frame,
   `opening_browser_controller.js`, `board_preview_controller.js`,
   `board_factory.js`.
   **Verify**: land on `/rails/dashboard`, see progress tiles, search/filter
   openings, pick one, confirm preview board updates, "Start training"
   redirects into a real training session.

5. **Training.** `trainings_controller.rb` (`show`, `moves#create`,
   restart), view, `training_controller.js`, `chess/sound.js`.
   **Verify**: play a full opening line by hand — legal-move dots, illegal
   rejection, correct/incorrect feedback, hint escalation, timeline
   prev/next stepper, session-complete state with "train again"/"choose
   another".

6. **Polish.** Header/nav (logo + logout), consistent flash rendering,
   API-down error banners, sounds wired end-to-end.

7. **CI + docs.** `rails.yml`, `rails/README.md`.

## Verification commands

- `docker compose up -d --build rails`
- `curl -s http://localhost/rails/ping`
- `curl -I http://localhost/rails/assets/tokens.css`
- `curl -I http://localhost/rails/cm-chessboard-assets/pieces/standard.svg`
- Browser: `http://localhost/rails/`
- `docker compose logs -f rails`
- `docker compose exec rails bin/rails ...` for any generator/console work
  (Docker-only per `AGENTS.md`)

## Notes / risks carried forward

- Ruby 3.3 / Rails 7.2 pinned deliberately (not Rails 8, whose new default
  Gemfile adds `solid_cache`/`solid_queue`/`solid_cable`/`kamal`/`thruster` —
  all assume a local-DB/Kamal deploy model that doesn't fit this repo's
  compose+nginx setup).
- `docker-compose.override.yml` currently sets `EMAIL_VERIFICATION_REQUIRED:
  "true"` for dev — Step 3's verification flow needs to account for this
  (either complete a real email round-trip via the dev SMTP setup, or note
  it as a manual step).
