# ♞ Knight School Backend ♘

The backend for Knight School is a FastAPI application that provides chess training sessions, validates moves, and manages a library of chess openings.

## Tech Stack
- **Framework:** FastAPI
- **Server:** Uvicorn
- **Database:** PostgreSQL (via `psycopg` v3)
- **ORM:** SQLAlchemy
- **Migrations:** Alembic
- **Chess logic:** `python-chess`
- **Authentication:** PyJWT & Pydantic
- **Infrastructure:** Docker & Nginx

## Getting Started

This project is designed to run entirely within Docker.

### 1) Configuration
Create a `.env` file in the project root. The `docker-compose.yml` relies on these variables:

    # Database Configuration
    DB_NAME=knight_school
    DB_USER=postgres
    DB_PASSWORD=password
    DB_HOST=db
    DB_PORT=5432
    DB_SCHEMA=public
    DATABASE_URL="postgresql+psycopg://$DB_USER:$DB_PASSWORD@$DB_HOST:$DB_PORT/$DB_NAME"

    # Security
    JWT_SECRET=your_super_secret_random_string

Note the `+psycopg` in `DATABASE_URL` — the app depends on `psycopg` (v3), not `psycopg2`, so the scheme must include the driver name.

Optional auth tuning (defaults shown): `JWT_ALGORITHM=HS256`, `JWT_EXPIRES_MINUTES=60`, `JWT_REFRESH_EXPIRES_DAYS=7`.

### 2) Launch the Stack
Run:

    docker compose up -d

The API container is configured to automatically apply migrations (Alembic) on startup, so your database schema will be initialized automatically.

### 3) Seed the Openings Library
To populate the database with the chess openings, run:

    docker compose exec api python scripts/import_openings.py

### 3a) Adding Opening Descriptions (Batches)

Opening descriptions are added in batches, tracked in git as JSON files. Each batch file (`scripts/opening_descriptions_batch*.json`) contains 50-200 opening descriptions. 

**Adding a new batch:**

1. Create a JSON file with the descriptions:
   ```json
   [
     {"eco": "B06", "name": "Modern Defense: Example", "description": "..."},
     ...
   ]
   ```
   Commit it as `scripts/opening_descriptions_batch{N}.json`.

2. Apply all unapplied batches to the database (safe to run multiple times—uses UPDATE...WHERE):

   ```bash
   docker compose exec api python backend/scripts/apply_all_description_batches.py
   ```

   Or apply a specific batch:

   ```bash
   docker compose exec api python scripts/apply_opening_descriptions.py scripts/opening_descriptions_batch8.json
   ```

The batches are idempotent—reapplying a batch just sets the same descriptions again. In production, run `apply_all_description_batches.py` as part of your post-deploy workflow.

### 4) Accessing the API
Once the containers are healthy:

- **API Base URL:** `http://localhost:8000` (or via Nginx on port 80)
- **Interactive Docs (Swagger):** `http://localhost:8000/docs`
- **Alternative Docs (ReDoc):** `http://localhost:8000/redoc`

## Authentication Endpoints

Auth routes are under `/auth`:

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/auth/register` | Create account |
| `POST` | `/auth/login` | Authenticate user (returns JWTs) |
| `POST` | `/auth/refresh` | Exchange a refresh token for a new access token |
| `GET` | `/auth/me` | Return the authenticated user's `id` and `username` |
| `GET` | `/auth/verify-email` | Confirm a verification token (idempotent) |
| `POST` | `/auth/resend-verification` | Resend the verification email (by email or username) |

## Training Endpoints

Training routes are under `/training-sessions`. All of them require a
`Authorization: Bearer <access_token>` header, and every session/item lookup
is scoped to the authenticated user — a mismatched or missing token returns
`404 Training session not found` rather than leaking another user's data.

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/training-sessions` | Start a new session. Optional JSON body `{"openingEco": "...", "openingName": "..."}` picks a specific opening; omit both to get a random opening the user hasn't trained on yet |
| `GET` | `/training-sessions/{id}/next` | Fetch the next pending move for the session |
| `POST` | `/training-sessions/{id}/responses` | Submit a move (`{"itemId": ..., "moveUci": "..."}`) |
| `POST` | `/training-sessions/{id}/items` | Bulk add items to an already-initialized session |
| `POST` | `/training-sessions/from-due` | Start a new session from the user's spaced-repetition due items |

Notes:
- Requests/responses use camelCase JSON (e.g. `moveUci`, `sessionCompleted`); the Python layer underneath is snake_case.
- `GET .../next` includes `correctMoveUci` in its response. A stale test comment labels this "DEBUG ONLY" but the frontend's hint feature (`Training.tsx`) actually depends on it — don't remove it as cleanup.
- The backend expects and validates moves using UCI strings.
- A session is marked `completed` when all of its training items have a correct response.
- `POST .../items` returns `400` if the session has no `opening_eco`/`opening_name` set yet (i.e. wasn't created via `POST /training-sessions`).

## User Preferences Endpoints

Preferences routes are under `/users/me/preferences`. Require authentication.

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/users/me/preferences` | Return the authenticated user's preferences: `language`, `theme`, `board_theme`, `piece_set`, `show_coordinates`, `board_animations`, `board_orientation_mode` |
| `PATCH` | `/users/me/preferences` | Partially update preferences — only send the fields you want to change. Each field is validated against an allow-list (e.g. `board_theme` against cm-chessboard's built-in skins, `language` against `supported_languages()`); an unrecognized value returns `422` |

## Openings Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/openings` | List all openings that have parsed UCI moves (no auth required) |

## Progress Endpoints

Progress routes provide spaced-repetition tracking and analysis of the user's training performance. All require authentication.

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/progress/summary` | Return overall training statistics: positions seen, overall accuracy, number mastered, per-opening breakdown, current and longest streak |
| `GET` | `/progress/due` | Return list of positions the user should review soon (spaced-repetition due items) with FEN, correct move, opening info, and due timestamp |
| `GET` | `/progress/weak-spots` | Return list of positions the user struggles with (low accuracy) with attempt counts and success/failure breakdown |

## Puzzles Endpoints

Puzzle routes present tactical puzzles to the user and track their performance. All require authentication.

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/puzzles/next` | Fetch the next puzzle with FEN position, rating, themes, correct move, and opponent's setup move for board highlighting |
| `POST` | `/puzzles/{puzzle_id}/attempts` | Submit an attempted move (`{"moveUci": "..."}`) and receive feedback on correctness and next board state |
| `GET` | `/puzzles/summary` | Return overall puzzle statistics: puzzles seen, overall accuracy, number mastered |

## Testing

Tests are executed inside the API container. Coverage (HTML + terminal) is
enabled by default via `pytest.ini`'s `addopts`, so a plain run already
produces a report — no separate `--cov` invocation is needed:

    docker compose exec api pytest

    # Skip coverage for a faster run
    docker compose exec api pytest --no-cov

The generated `htmlcov/` report is served by nginx at `http://localhost/htmlcov/`.

## Development Tools
- **Linting/Formatting:** `ruff` + `black`, enforced in CI
  (`.github/workflows/tests.yml`). Run locally in the API container:

      docker compose exec api ruff check .
      docker compose exec api black --check .

- **ER Diagrams:** If the repo includes the `erd` service, it generates `schema.svg` under `backend/app/docs`.
