# Frontend (React)

React + TypeScript + Vite UI for the chess training application.

## Development setup

### Requirements
- Node.js (LTS recommended)

### Install
From `frontend/`:
    npm install

### Run (dev)
    npm run dev

Dev-time backend connection: the Vite dev server proxies `/api` to:
- `http://localhost:8000`

### Build
    npm run build

### Preview
    npm run preview

### Lint
    npm run lint

## Frontend routes

- `GET /login` — login form
- `GET /register` — registration form
- `GET /dashboard` — dashboard placeholder
- `GET /training` — training UI
- `*` — falls back to `/dashboard`

## API (what the frontend calls)

Base path is always `/api` (proxied in dev).

### Auth — Register
**Request**
- `POST /api/auth/register`
- Body (JSON):
  - `{ "email": string, "username": string, "password": string }`

**Success**
- Frontend checks only `resp.ok` (does not parse JSON).
- Then it navigates to `/login`.

**Error**
- Frontend reads `await resp.text()` and displays it.

---

### Auth — Login
**Request**
- `POST /api/auth/login`
- Body (JSON):
  - `{ "username": string, "password": string }`

**Success**
- Frontend checks `resp.ok` only.
- Then it navigates to `/dashboard`.

**Error**
- Frontend reads `await resp.text()` and displays it.

---

### Training — Start a new session
**Request**
- `POST /api/training-sessions`
- No body

**Success (JSON)**
The frontend expects JSON with:
- `{ "id": number }`

**Error**
- Not explicitly handled beyond the normal fetch flow (it will fail and the UI won’t proceed).

---

### Training — Fetch next item
**Request**
- `GET /api/training-sessions/:sessionId/next`

**Success (JSON)**
Frontend expects:
- `{
  "session_id": number,
  "item_id": number,
  "order_index": number,
  "fen": string,
  "move_count_limit": number | null
}`

**Error (JSON)**
On non-2xx responses, the frontend tries:
- `const err = await res.json().catch(() => ({}));`
- then uses `err.detail ?? "Training completed"`

So you should return (on failure) JSON like:
- `{ "detail": string }`

---

### Training — Submit an answer
**Request**
- `POST /api/training-sessions/:sessionId/responses`
- Body (JSON):
  - `{ "move_uci": string, "item_id": number }`
- Content-Type: `application/json`

**Success (JSON)**
Frontend expects:
- `{
  "correct": boolean,
  "reason": string,
  "fen_after": string | null
}`

On success, the UI uses:
- `data.correct ? "Correct!" : "Wrong: ${data.reason}"`
and then immediately fetches `.../next`.

**Error (JSON)**
On non-2xx responses, the frontend expects:
- `const data = await res.json();`
- uses `data.detail ?? "Error"`

So you should return (on failure) JSON like:
- `{ "detail": string }`

---

## Frontend code layout
- `src/main.tsx` — React + router bootstrap
- `src/App.tsx` — route definitions
- `src/Login.tsx` — login page
- `src/Register.tsx` — register page
- `src/Dashboard.tsx` — dashboard placeholder
- `src/Training.tsx` — training session logic + API calls
- `src/index.css` — global styles

If you want, I can also add a short “Expected response schemas” section with a copy/paste JSON example for each endpoint (matching the types above).