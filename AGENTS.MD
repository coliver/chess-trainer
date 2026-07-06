# AGENTS.md
# Chess Openings Trainer (FastAPI + PostgreSQL + Docker + nginx)

## Goal
You are an AI coding assistant helping implement features in this repository.
Follow the architecture in `backend/app/docs/architecture.md` and keep changes minimal and production-friendly.

When working with a developer on this project, keep your responses as short as possible. I have adhd, short responses. One thing at a time.

## Non-negotiables
- Keep the existing working scaffold working:
  - FastAPI app must still start
  - `/ping` must still work
  - nginx reverse proxy + self-signed TLS should not be changed unless the new feature requires it
- Make minimal, correct, testable changes.
- No secrets/credentials added to the repo.
- Dockerize end-to-end from the start (don’t add non-containerized dev-only workflows).

## Tech & libraries
- Backend: **Python + FastAPI**
- Frontend: **TypeScript + React** (implementation can be minimal for MVP)
- DB: **PostgreSQL**
- Data-layer:
  - Use migrations with **Alembic** (via `backend/app/migrations/`).
  - Use an ORM + migrations approach consistent with `architecture.md` (e.g., SQLAlchemy + Alembic).
- Chess rules:
  - Use **python-chess** for FEN parsing, legality checks, and applying moves to compute resulting positions/FEN.
  - Keep runtime logic inside trainer/opening modules; keep `app.py` thin.

## Primary implementation target (next feature)
Implement the first MVP training flow: **position prompt + answer validation**.
1) Backend creates a prompt for a chess position (with expected next move).
2) Client submits a move.
3) Backend validates:
   - move is legal in the given position
   - move matches expected move for the prompt (for MVP: one correct move per item)
4) Backend returns JSON suitable for a future UI.

## API endpoints (route under `/api`)
Implement endpoints in the FastAPI layer. Keep route modules thin and delegate logic to modules.

Expected endpoints for MVP:
- `POST /api/training-sessions`
  - Creates a training session and its first batch of items.
- `GET /api/training-sessions/{id}/next`
  - Returns the next training item (prompt).
- `POST /api/training-sessions/{id}/responses`
  - Accepts submitted move for the current item, validates, stores response, updates progress.

If the repo already has different names, follow what’s present, but keep the same behavior contract.

## JSON behavior rules (MVP strict)
When a user submits an answer:
- If `move_uci` is invalid UCI / cannot be parsed:
  - return HTTP 400 with a clear error message
- If the move is not legal in the provided position:
  - `correct = false`
  - `reason = "illegal move"`
  - `fen_after = null`
- If the move is legal but wrong:
  - `correct = false`
  - `reason = "wrong move"` (or equivalent consistent phrasing)
  - include `fen_after` if computing it is straightforward and deterministic; otherwise keep it `null` but be consistent.

## Where code should live (align to `backend/app/docs/architecture.md`)
- `backend/app/`:
  - FastAPI routing entrypoints (e.g., `app.py` / routers): request/response models + wiring only
- `backend/app/modules/` (logical modules):
  - `auth/` (if/when needed for MVP auth)
  - `users/`
  - `openings/` (opening content + resolving positions/transitions)
  - `training/` (session + item selection, response submission, completion)
  - `progress/` (stats updates/reads)
  - `shared/` (DB session, common dependencies, schemas, error helpers)
- `backend/app/opening_importer/`:
  - `importer/` + `seed/` code for opening dataset import/seed (no request-path mutation)
- `backend/app/migrations/versions/`:
  - only schema migrations (no ad-hoc DB edits)

## Dependencies
- Add **python-chess** only if missing from `requirements.txt`.
- Keep new dependencies minimal.
- If you add packages, update Docker build requirements as well.

## Environment / Docker expectations
- Use environment variables (e.g., `DATABASE_URL`, auth secrets) provided via Docker Compose / container env.
- No local-only configuration that breaks `docker compose up`.

## Tests (required)
- Use **pytest**.
- Add unit tests for:
  - UCI parsing to chess move
  - legality checking from FEN/position
  - correctness checking vs expected UCI move
- Tests must be deterministic and fast.
- If the repo has an existing test layout, extend it rather than inventing a new structure.

## Output constraints
- Only text/code changes.
- Don’t include hand-wavy steps in your output.
- Ensure the server still runs and existing endpoints (`/`, `/ping`) still behave.
