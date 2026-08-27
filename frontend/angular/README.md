# ♞ Knight School (Chess Trainer) — Angular Frontend

An Angular 19 (standalone) frontend for the Knight School chess-trainer backend. It lets a
user log in and browse the openings library, talking to the FastAPI backend over its `/api`
routes.

**Legacy, frozen** — no longer wired into `docker-compose.yml` or nginx; run it locally with
the Angular CLI (below) against the Dockerized backend.

## 📂 Structure

```text
angular/
├── src/
│   ├── app/
│   │   ├── core/
│   │   │   ├── auth.service.ts        # login/logout, token storage
│   │   │   ├── auth.interceptor.ts    # attaches Bearer, refreshes on 401
│   │   │   ├── auth.guard.ts          # guards routes via GET /auth/me
│   │   │   ├── openings.service.ts    # GET /api/openings
│   │   │   ├── progress.service.ts    # user progress tracking
│   │   │   ├── puzzles.service.ts     # GET /api/puzzles/next, POST /api/puzzles/:id/attempts
│   │   │   └── training.service.ts    # training session data
│   │   ├── pages/
│   │   │   ├── login/                 # POST /api/auth/login
│   │   │   ├── register/              # user registration
│   │   │   ├── dashboard/             # openings list (guarded)
│   │   │   ├── training/              # puzzle training view (guarded)
│   │   │   │   └── board.component.ts # chess board UI (used in training)
│   │   │   └── puzzles/               # puzzles library (guarded)
│   │   ├── shared/
│   │   │   ├── header.component.ts    # top navigation
│   │   │   ├── theme-toggle.component.ts   # light/dark theme switcher
│   │   │   ├── flip-board-button.component.ts # board orientation control
│   │   │   └── knight-school-icon.component.ts # branding icon
│   │   ├── lib/                       # utility functions
│   │   │   ├── group-openings.ts      # opening grouping logic
│   │   │   └── opening-text.ts        # opening name/description utilities
│   │   ├── app.routes.ts              # /login, /register, /dashboard, /training/:id, /puzzles (guarded), redirects
│   │   ├── app.config.ts              # provideHttpClient(withInterceptors([authInterceptor]))
│   │   └── app.component.*            # top bar shell + <router-outlet>
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
| `POST` | `/api/auth/refresh` | Exchange a refresh token for a new access token |
| `GET`  | `/api/auth/me` | Confirm the current user (used by the route guard) |
| `GET`  | `/api/openings` | List openings for the dashboard (no auth) |

## 🚧 Development

The app runs as a service in the root `docker-compose.yml`; from the repo root:

```bash
docker compose up -d --build       # http://localhost/angular/
```

For local iteration outside Docker (Node 20+):

```bash
cd angular
npm install
npm start -- --serve-path /angular/   # http://localhost:4200/angular/
```

(The `baseHref` is configured in `angular.json`, not as a CLI flag.)

## 🧪 Testing & linting

Run inside the container:

```bash
docker compose exec angular ./node_modules/.bin/ng lint
docker compose exec angular ./node_modules/.bin/ng test --watch=false --browsers=ChromeHeadlessNoSandbox
docker compose exec angular ./node_modules/.bin/ng build
```

- **Lint:** ESLint via `@angular-eslint`.
- **Unit tests:** Karma + Jasmine (`*.spec.ts`) — e.g. `auth.service.spec.ts` asserts the login
  flow stores tokens; `app.component.spec.ts` renders the shell.
- **E2E tests:** Playwright for end-to-end testing; run via `npm run test:playwright`.
