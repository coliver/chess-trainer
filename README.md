# Chess-Trainer

A web-based chess openings trainer that drills specific lines and tracks improvement.

## Goal

Build a web-based chess openings trainer that:
- presents opening prompt positions,
- accepts your next-move attempts as UCI,
- validates the move against an openings dataset,
- provides deterministic feedback (including the expected resulting position),
- tracks your progress per opening/position.

## MVP (what’s working now)

### Backend (FastAPI + PostgreSQL)
Auth + training MVP implemented:

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/training-sessions`
- `GET /api/training-sessions/{id}/next`
- `POST /api/training-sessions/{id}/responses`

Validation behavior on response submission:
- invalid UCI → HTTP 400
- illegal move → `correct=false`, `reason="illegal move"`, `fen_after=null`
- wrong legal move → `correct=false`, `reason="wrong move"`, includes deterministic `fen_after`

### Frontend (not yet implemented)
Frontend UI (2D chess board, clickable pieces, move submission from the UI) is not complete yet.

## How it works (high level request flow)

1. **Create a training session**
   - `POST /api/training-sessions`
   - backend selects training items (MVP policy) and persists them as `training_items`.

2. **Ask for the next prompt**
   - `GET /api/training-sessions/{id}/next`
   - backend returns the current prompt position/item.

3. **Submit your answer**
   - `POST /api/training-sessions/{id}/responses`
   - backend validates the submitted UCI, records the attempt (`training_responses`), and updates progress (`user_position_stats`, aggregations).

4. **Completion**
   - once all items are answered, `training_sessions.status` becomes `completed`.

## Architecture

### Stack
- Frontend: TypeScript + React
- Backend: Python + FastAPI
- DB: PostgreSQL
- Infra: Dockerized full stack (docker-compose)
- Data import: opening dataset seeding/normalization command(s)

### Internal modules (backend)
`backend/app/modules/` (first MVP):
- `auth` (JWT login)
- `users` (profile + lookup)
- `openings` (resolve positions → allowed next moves; no runtime mutation)
- `training` (create sessions, serve next item, accept responses)
- `progress` (update/read user stats)
- `shared` (DB session, common schemas, auth dependency, error types)

### Data model (minimum)

**Opening content**
- `openings`
- `opening_lines`
- `opening_positions` (stable position identity key: FEN/derived hash)
- `opening_transitions` (`from_position_id` + `move_uci` → `to_position_id`)

**User progress**
- `user_opening_progress` (aggregate per opening)
- `user_position_stats` (aggregate per opening_position)

**Training sessions (immutable session artifacts)**
- `training_sessions` (mode, status, `dataset_version_id`)
- `training_items` (session_id, position_id, `correct_move_uci`, order_index)
- `training_responses` (`submitted_move_uci`, `is_correct`, timing, created_at)

## Public routes vs backend routes

The FastAPI app runs its routes without a `/api` prefix. The nginx container reverse-proxies:
- public: routes under `/api/*`
- backend: the same routes without `/api` (used internally by the container network)

Example:
- public `POST /api/auth/login` → backend `POST /auth/login`

## Local development (Docker)

1. Bring up the stack:
   - `docker compose up --build`

2. Run migrations:
   - `docker compose run --rm api alembic -c backend/app/migrations/alembic.ini upgrade head`

3. Optional: seed openings:
   - `docker compose run --rm api python -m app.seed_openings`

## API endpoints (current/required)

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/training-sessions`
- `GET /api/training-sessions/{id}`
- `GET /api/training-sessions/{id}/next`
- `POST /api/training-sessions/{id}/responses`
- `GET /api/progress/overview`
