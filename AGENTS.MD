# AGENTS.md
# Chess Openings Trainer (FastAPI + PostgreSQL + Docker + nginx)

## Goal
Help implement features in this repository following `backend/app/docs/ARCHITECTURE.md`, keeping changes minimal and production-friendly.

## Non-negotiables
- Keep the existing working scaffold working:
  - FastAPI app must still start
  - `/ping` must still work
  - nginx reverse proxy + self-signed TLS should not be changed unless the new feature requires it
- Make minimal, correct, testable changes.
- No secrets/credentials added to the repo.
- Dockerize end-to-end from the start (no dev-only non-container workflows).
- New user-facing React UI text must go through i18n, not a hardcoded string — add the key to `react/src/i18n/locales/en-US.json` (the source of truth), then run `npm run i18n:sync` to propagate it to the other 30+ locales. See `react/README.md`'s Internationalization section for details.

## Developer communication rule
When working with a developer, keep responses as short as possible and explain one thing at a time.

## Tech & libraries
- Backend: Python + FastAPI
- Frontend: TypeScript + React
- DB: PostgreSQL

Data-layer:
- Migrations with Alembic in `backend/app/migrations/`
- ORM + migrations consistent with `backend/app/docs/architecture.md` (SQLAlchemy + Alembic)

Chess rules:
- Use `python-chess` for legality checks and applying moves to compute resulting positions/FEN.
- Keep runtime logic inside trainer/opening modules; keep `app.py` thin.

## Status

Past the MVP stage — two full frontends (React + Angular) against one API, with auth,
opening training, puzzles, spaced-repetition progress tracking, i18n (30+ locales), and
sound feedback all shipped. See [`CHANGELOG.md`](./CHANGELOG.md) for what's landed and
[`ROADMAP.md`](./ROADMAP.md) for what's next.

### Auth (FastAPI paths; nginx exposes them under `/api`)
- `POST /auth/register` — creates an account and emails a verification link
- `POST /auth/login` — rejects unverified accounts with 403 "Email not verified"
- `POST /auth/refresh` — exchanges a refresh token for a new access token
- `GET /auth/me` — returns the authenticated user's `id` and `username`
- `GET /auth/verify-email` — confirms a verification token, idempotent
- `POST /auth/resend-verification` — resends the verification email (email or username)
- Enforcement is gated by `EMAIL_VERIFICATION_REQUIRED` (env var, default off). When off, `register()` auto-verifies and skips sending the email, and `login()` never checks `email_verified` — this is the current prod state while SES is still in the sandbox / awaiting production access. `verify-email` and `resend-verification` stay live either way.

### Training (position prompt + answer validation; FastAPI paths; nginx exposes them under `/api`)
- `POST /training-sessions` — start a new session (optionally for a specific opening, or as Black)
- `POST /training-sessions/from-due` — start a session from spaced-repetition due items
- `GET /training-sessions/{id}/next`
- `POST /training-sessions/{id}/responses`
- `POST /training-sessions/{id}/items` — bulk add items to an already-initialized session

### Puzzles (Lichess puzzle DB; FastAPI paths under `/api`)
- `GET /puzzles/next`
- `POST /puzzles/{puzzle_id}/attempts`
- `GET /puzzles/summary`

### Progress (SM-2 spaced repetition, streaks, mastery; FastAPI paths under `/api`)
- `GET /progress/summary`
- `GET /progress/due`
- `GET /progress/weak-spots`

### Openings
- `GET /openings` — list all openings that have parsed UCI moves (no auth required)

### Validation behavior (contract — must not change)
Validation is performed by `backend/app/modules/training/chess_rules.py:validate_and_apply()`:

- invalid UCI string (cannot parse):
  - `http_status=400`
  - `correct=false`
  - `reason="invalid move_uci"`
  - `fen_after=null`
  - `error_message` must explain the UCI parsing requirement
- illegal move (UCI parses but not legal from `fen`):
  - `http_status=200`
  - `correct=false`
  - `reason="illegal move"`
  - `fen_after=null`
- wrong legal move (UCI is legal but not equal to expected):
  - `http_status=200`
  - `correct=false`
  - `reason="wrong move"`
  - includes deterministic `fen_after` (computed by applying the submitted legal move)

## Current code layout (where logic lives)
- `backend/app/`
  - `app.py`: FastAPI wiring / startup concerns (keep thin)
  - `routers/`
    - `auth.py`, `training.py`, `puzzles.py`, `progress.py`, `openings.py`: routing + request/response models per domain

- `backend/app/modules/`
  - `openings/`
    - `models.py`: opening dataset model(s)
    - `service.py`: opening dataset lookup / prompt mapping
  - `training/`
    - `models.py`: `TrainingSession`, `TrainingItem`, `TrainingResponse`
    - `service.py`: session creation + "next item" selection + response submission
    - `chess_rules.py`: legality checks and `fen_after` computation
  - `puzzles/`
    - `models.py`, `service.py`: Lichess puzzle DB training
  - `progress/`
    - `models.py`, `service.py`: position progress tracking
    - `srs.py`: SM-2 spaced repetition scheduling
    - `streak.py`: streak calculation
  - `auth/`, `users/`: account/session models and auth logic backing the `auth.py` router
  - `email/`
    - `sender.py`: SMTP verification email sending
  - `shared/`
    - `db.py`: DB session/deps/helpers

- `backend/app/migrations/versions/`
  - only schema migrations

### Dataset → prompt mapping (openings contract)
- `backend/app/modules/openings/service.py:get_prompt_and_move(eco: str, move_index: int, db)`
  is the canonical mapping interface:
  - loads a single `Opening` by `Opening.eco`
  - splits `opening.uci_moves` into `moves`
  - builds a `python-chess` board from `opening.epd`
  - applies moves `[0..move_index-1]`
  - returns:
    - `fen` for the prompt position
    - `correct_move_uci = moves[move_index]` (exactly one expected next-move UCI)

### Validation contract
- `backend/app/modules/training/chess_rules.py:validate_and_apply()` remains the single source of truth for:
  - parsing invalid UCI => HTTP 400 + `reason="invalid move_uci"`
  - illegal moves => `reason="illegal move"` and `fen_after=null`
  - wrong legal moves => `reason="wrong move"` and deterministic `fen_after`

## Tests (required)
- Use `pytest`.
- Extend existing unit tests rather than creating new layouts.
- Add/adjust tests when changing validation, selection, or response mapping.

Key existing tests to update/extend as needed:
- `tests/test_openings_service.py`
- `tests/test_training_service.py`
- `tests/test_routers_training.py`
- any tests that assert exact `fen_after` or `reason` values

## Output constraints
- Only text/code changes.
- No hand-wavy steps.
- Ensure the server still runs and existing endpoints (`/`, `/ping`, and current training/auth routes) still behave.
