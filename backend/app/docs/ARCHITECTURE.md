## Chess Openings Trainer (MVP) — Essential Architecture

### 1) Stack + structure
- **Frontend:** TypeScript + React (Next.js optional)
- **Backend:** **Python + FastAPI**
- **DB:** **PostgreSQL**
- **Monolith:** modularized codebase (one deployable), clean internal service boundaries
- **Infra:** **Docker everything** via `docker-compose` from day 1

### 2) Modules (first MVP)
Inside `backend/app/modules/`:
- `auth` (JWT login)
- `users` (profile + lookup)
- `openings` (query positions/allowed next moves; no runtime mutation)
- `training` (create sessions, serve next item, accept responses)
- `progress` (update/read user stats)
- `shared` (DB session, common schemas, auth dependency, error types)

### 3) Data model (minimum)
- **Opening content**
  - `openings`
  - `opening_lines`
  - `opening_positions` (derived position key: e.g., FEN or position hash)
  - `opening_transitions` (from_position_id + move_uci → to_position_id)
- **User progress**
  - `user_opening_progress` (aggregate per opening)
  - `user_position_stats` (aggregate per opening_position)
- **Training sessions (immutable session artifacts)**
  - `training_sessions` (mode, status, dataset_version_id)
  - `training_items` (session_id, position_id, correct_move_uci, order_index)
  - `training_responses` (submitted_move_uci, is_correct, timing, created_at)

### 4) Request/response flow
1. **Session create:** `POST /api/training-sessions`
   - `training` selects items (simple policy) using `progress` + `openings`
   - writes `training_items` (transaction)
2. **Training loop:**
   - `GET /api/training-sessions/{id}/next` (or returns session+next item)
   - `POST /api/training-sessions/{id}/responses` (records response)
3. **On each response submission:**
   - `training` writes `training_responses`
   - `progress` updates `user_position_stats` (and aggregates) in **same transaction**
4. **Completion:** when all items answered → mark `training_sessions.status=completed`

### 5) Opening dataset import (one-time/managed)
- Import/seeding runs as a **separate command** (not during request handling).
- Store an `opening_dataset_versions` id; sessions reference it so historical sessions remain consistent.

### 6) Local dev workflow (Docker)
- `docker compose up --build`
- Run migrations: `docker compose run --rm api alembic upgrade head`
- Optional seed: `docker compose run --rm api python -m app.seed_openings`

### 7) Migrations strategy (Alembic)
- All schema changes via Alembic migrations in `backend/app/migrations/versions`.
- Add indexes for:
  - session/item ordering and lookup
  - user stats filters
  - transitions lookup (`from_position_id`, `move_uci`)
- Keep data import idempotent/versioned (don’t mix with migrations).

### 8) Main trade-offs / risks (MVP)
- **Position identity:** choose stable position key (FEN/derived hash) early.
- **Selection quality:** keep selection simple for MVP (accuracy-weighted + new/review mix).
- **Dataset drift:** freeze dataset per MVP release (or version it and bind sessions).

### 9) Minimal endpoints to implement
- `POST /api/auth/login`
- `POST /api/training-sessions`
- `GET /api/training-sessions/{id}`
- `GET /api/training-sessions/{id}/next`
- `POST /api/training-sessions/{id}/responses`
- `GET /api/progress/overview`
