# AGENTS.md
# Chess Openings Trainer (FastAPI + PostgreSQL + Docker + nginx)

## Goal
Help implement features in this repository following `backend/app/docs/architecture.md`, keeping changes minimal and production-friendly.

When working with a developer, keep responses as short as possible (one thing at a time).

## Non-negotiables
- Keep the existing working scaffold working:
  - FastAPI app must still start
  - `/ping` must still work
  - nginx reverse proxy + self-signed TLS should not be changed unless the new feature requires it
- Make minimal, correct, testable changes.
- No secrets/credentials added to the repo.
- Dockerize end-to-end from the start (no dev-only non-container workflows).

## Tech & libraries
- Backend: **Python + FastAPI**
- Frontend: **TypeScript + React**
- DB: **PostgreSQL**
- Data-layer:
  - Migrations with **Alembic** in `backend/app/migrations/`
  - ORM + migrations consistent with `architecture.md` (SQLAlchemy + Alembic)
- Chess rules:
  - Use **python-chess** for legality checks and applying moves to compute resulting positions/FEN.
  - Keep runtime logic inside trainer/opening modules; keep `app.py` thin.

## Status (MVP done)
Auth (FastAPI paths; nginx exposes them under `/api`):
- `POST /auth/register`
- `POST /auth/login`

Training MVP (position prompt + answer validation; FastAPI paths; nginx exposes them under `/api`):
- `POST /training-sessions`
- `GET /training-sessions/{id}/next`
- `POST /training-sessions/{id}/responses`

Validation behavior:
- invalid UCI -> HTTP 400 with clear error message
- illegal move -> `correct=false`, `reason="illegal move"`, `fen_after=null`
- wrong legal move -> `correct=false`, `reason="wrong move"`, includes deterministic `fen_after`

## Primary implementation target (next feature)
Replace the current MVP static items with real opening-dataset-driven selection:
- `training.create_training_session()` should generate `training_items` from the openings dataset (via `backend/app/modules/openings/`)
- Each item must provide:
  - `fen` for the prompt position
  - exactly one expected correct next-move UCI (MVP behavior contract)
- Keep selection logic deterministic for MVP.

## Where code should live (align to `backend/app/docs/architecture.md`)
- `backend/app/`:
  - FastAPI routing entrypoints (wiring + request/response models only)
- `backend/app/modules/`:
  - `openings/` (resolve position -> expected next moves)
  - `training/` (session creation, next-item selection, response submission)
  - `progress/` (only when implementing progress endpoints/updates)
  - `shared/` (DB session + common deps/helpers)
- `backend/app/migrations/versions/`:
  - only schema migrations

## Tests (required)
- Use **pytest**.
- Extend existing unit tests rather than creating new layouts.
- Add/adjust tests when changing validation, selection, or response mapping.

## Output constraints
- Only text/code changes.
- No hand-wavy steps.
- Ensure the server still runs and existing endpoints (`/`, `/ping`, and current training/auth routes) still behave.
