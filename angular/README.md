# ♞ Knight School (Chess Trainer) — Angular Frontend

> One of two interchangeable frontends against the same `/api` backend (the other is
> [`../react`](../react/README.md)). Served by nginx under **`/angular/`**.

A minimal Angular 19 (standalone) app that demonstrates the same-origin `/api` contract:
log in, then list the openings library — talking to the exact same FastAPI backend as the
React app, with **no backend or CORS changes**.

## 📂 Structure

```text
angular/
├── src/
│   ├── app/
│   │   ├── core/
│   │   │   ├── auth.service.ts        # login/logout, token storage (shared keys with React)
│   │   │   ├── auth.interceptor.ts    # attaches Bearer, refreshes on 401 (mirrors react/src/api.ts)
│   │   │   ├── auth.guard.ts          # calls GET /auth/me (mirrors react/src/RequireAuth.tsx)
│   │   │   └── openings.service.ts    # GET /api/openings
│   │   ├── pages/
│   │   │   ├── login/                 # POST /api/auth/login
│   │   │   └── dashboard/             # openings list (guarded)
│   │   ├── app.routes.ts              # /login, /dashboard (guarded), redirects
│   │   ├── app.config.ts              # provideHttpClient(withInterceptors([authInterceptor]))
│   │   └── app.component.*            # top bar shell + <router-outlet>
│   ├── index.html
│   └── styles.css
├── Dockerfile                          # ng serve under /angular/ on :4200
└── angular.json
```

## 🌐 Network architecture

Identical to the React app: all API calls use the **root-absolute `/api`** path. nginx
serves this app under `/angular/` and proxies `/api/` to FastAPI, so everything is
**same-origin** — no CORS. Because both frontends share the `localhost` origin, they also
share `localStorage`, so a login in one frontend is recognised by the other.

## 🚧 Development

The app runs as a service in the root `docker-compose.yml`; from the repo root:

```bash
docker compose up -d --build       # http://localhost/angular/
```

For local iteration outside Docker (Node 20+):

```bash
cd angular
npm install
npm start -- --serve-path /angular/ --base-href /angular/   # http://localhost:4200/angular/
```

## 🧪 Testing & linting

Run inside the container (Docker-only workflow):

```bash
docker compose exec angular ./node_modules/.bin/ng lint
docker compose exec angular ./node_modules/.bin/ng test --watch=false --browsers=ChromeHeadlessNoSandbox
docker compose exec angular ./node_modules/.bin/ng build
```

- **Lint:** ESLint via `@angular-eslint`.
- **Unit tests:** Karma + Jasmine (`*.spec.ts`), e.g. `auth.service.spec.ts` asserts the
  login flow stores tokens; `app.component.spec.ts` renders the shell.
