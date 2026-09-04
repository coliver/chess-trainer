# ♞ Knight School (Chess Trainer) — Angular Frontend

An Angular 22 (standalone) frontend for the Knight School chess-trainer backend. It lets a
user log in and browse the openings library, talking to the FastAPI backend over its `/api`
routes.

A secondary frontend alongside React, being brought back up to feature parity — see
[`PARITY_GAPS.md`](./PARITY_GAPS.md) for what's still missing and the backport order.

## 📂 Structure

```text
angular/
├── src/
│   ├── app/
│   │   ├── core/
│   │   │   ├── auth.service.ts        # login/register/logout, verify-email, resend-verification
│   │   │   ├── auth.interceptor.ts    # attaches Bearer, single-flight refresh on 401
│   │   │   ├── auth.guard.ts          # guards routes via GET /auth/me
│   │   │   ├── openings.service.ts    # GET /api/openings
│   │   │   ├── progress.service.ts    # summary/due/weak-spots progress tracking
│   │   │   ├── puzzles.service.ts     # next/attempts/summary/themes
│   │   │   ├── training.service.ts    # training session data
│   │   │   ├── preferences.ts         # Preferences type + defaults
│   │   │   ├── preferences.service.ts # GET/PATCH /api/users/me/preferences
│   │   │   ├── preferences-store.service.ts # signal-based store over PreferencesService
│   │   │   ├── sound.service.ts       # sound-effect playback
│   │   │   ├── snow-preference.service.ts   # signal wrapper around the snow toggle
│   │   │   ├── game-status.service.ts # status text shared into GameHeader
│   │   │   └── i18n/                  # TranslateService/TranslatePipe, loads packages/i18n-locales
│   │   ├── pages/
│   │   │   ├── login/                 # POST /api/auth/login (+ resend-verification on 403)
│   │   │   ├── register/              # user registration
│   │   │   ├── verify-email/          # GET /api/auth/verify-email (unguarded)
│   │   │   ├── dashboard/             # openings list (guarded)
│   │   │   ├── training/              # puzzle training view (guarded)
│   │   │   │   └── board.component.ts # chess board UI (used in training/puzzles)
│   │   │   ├── puzzles/               # puzzles library (guarded)
│   │   │   ├── puzzle-themes/         # theme browser, links into puzzles (guarded)
│   │   │   └── settings/              # preferences UI incl. live board preview (guarded)
│   │   ├── shared/
│   │   │   ├── home-header.component.ts    # hamburger + brand + tabs (dashboard/puzzles)
│   │   │   ├── game-header.component.ts    # back/status/settings (training/puzzles play)
│   │   │   ├── overflow-menu.component.ts  # hamburger dropdown
│   │   │   ├── theme-toggle.component.ts   # light/dark theme switcher
│   │   │   ├── language-toggle.component.ts # language switcher
│   │   │   ├── flip-board-button.component.ts # board orientation control
│   │   │   ├── knight-school-icon.component.ts # branding icon
│   │   │   ├── auth-card.component.ts      # shared login/register/verify-email card shell
│   │   │   ├── progress-stat.component.ts  # dashboard stat display
│   │   │   ├── settings-toggle-row.component.ts  # settings on/off row
│   │   │   └── settings-radio-group.component.ts # settings radio group
│   │   ├── lib/                       # utility functions
│   │   │   ├── group-openings.ts      # opening grouping logic
│   │   │   ├── opening-text.ts        # opening name/description utilities
│   │   │   ├── puzzle-themes.ts       # theme groups/labels/icons
│   │   │   ├── snow.ts                # snow animation
│   │   │   └── win-celebration.ts     # confetti celebration
│   │   ├── app.routes.ts              # login, register, verify-email, dashboard, training/:id,
│   │   │                              # puzzles, puzzles/themes, settings (guarded where noted)
│   │   ├── app.config.ts              # provideHttpClient(withInterceptors([authInterceptor]))
│   │   └── app.component.*            # routes HomeHeader/GameHeader by URL + <router-outlet>
│   ├── index.html
│   └── styles.css
├── Dockerfile                          # ng serve under /angular/ on :4200
└── angular.json
```

## 🌐 Network architecture

All API calls use the **root-absolute `/api`** path. nginx serves this app under `/angular/`
and proxies `/api/` to the FastAPI backend, so requests are **same-origin** — there is no CORS
to configure. On login, the access and refresh tokens are stored in `localStorage`; the HTTP
interceptor attaches the access token as a `Bearer` header and, on a `401`, performs a single
`POST /api/auth/refresh` and retries the request before falling back to `/login`.

### API contract used

| Method | Endpoint | Purpose |
|---|---|---|
| `POST` | `/api/auth/login` | Authenticate; returns `{ id, email, username, access_token, refresh_token }` |
| `POST` | `/api/auth/register` | Register a new account |
| `POST` | `/api/auth/refresh` | Exchange a refresh token for a new access token (single-flight) |
| `GET`  | `/api/auth/me` | Confirm the current user (used by the route guard) |
| `GET`  | `/api/auth/verify-email` | Verify an account via emailed token |
| `POST` | `/api/auth/resend-verification` | Resend the verification email |
| `GET`  | `/api/openings` | List openings for the dashboard (no auth) |
| `GET`  | `/api/progress/summary` | Dashboard progress summary |
| `GET`  | `/api/progress/due` | Positions due for review |
| `GET`  | `/api/progress/weak-spots` | Weak-spot list |
| `POST` | `/api/training-sessions` | Start a training session for an opening |
| `POST` | `/api/training-sessions/from-due` | Start a review session from due positions |
| `GET`  | `/api/training-sessions/:id/next` | Next training item |
| `POST` | `/api/training-sessions/:id/responses` | Submit a training move |
| `GET`  | `/api/puzzles/next` | Fetch the next puzzle |
| `POST` | `/api/puzzles/:id/attempts` | Submit a puzzle attempt (supports multi-move via `moveIndex`) |
| `GET`  | `/api/puzzles/summary` | Puzzle progress summary |
| `GET`  | `/api/puzzles/themes` | Puzzle theme counts (Puzzle Themes page) |
| `GET`  | `/api/users/me/preferences` | Fetch user preferences |
| `PATCH`| `/api/users/me/preferences` | Update user preferences |

## 🚧 Development

The app runs as a service in the root `docker-compose.yml`; from the repo root:

```bash
docker compose up -d --build       # http://localhost/angular/
```

For local iteration outside Docker (Node 22.22+/24.15+/26+, per the Angular 22 CLI's
engines requirement):

```bash
cd angular
npm install
npm start -- --serve-path /angular/   # http://localhost:4200/angular/
```

(The `baseHref` is configured in `angular.json`, not as a CLI flag. `npm start`/`build`/`test`
all run `scripts/sync-i18n-locales.mjs` first, copying `packages/i18n-locales/locales/` into
`public/i18n/` — the Angular CLI's asset glob can't reach outside the workspace root, so calling
`ng serve`/`build`/`test` directly instead of the npm script skips that sync.)

## 🧪 Testing & linting

Run inside the container:

```bash
docker compose exec angular ./node_modules/.bin/ng lint
docker compose exec angular npm run test:ci
docker compose exec angular npm run build
```

- **Lint:** ESLint via `@angular-eslint`.
- **Unit tests:** Karma + Jasmine (`*.spec.ts`) — e.g. `auth.service.spec.ts` asserts the login
  flow stores tokens; `app.component.spec.ts` renders the shell.
- **E2E tests:** Playwright for end-to-end testing; run via `npm run test:playwright`.
