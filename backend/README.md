# ♞ Knight School Backend ♘

The backend for Knight School is a FastAPI application that provides chess training sessions, validates moves, and manages a library of chess openings.

## Tech Stack
- **Framework:** FastAPI
- **Server:** Uvicorn
- **Database:** PostgreSQL
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
    DATABASE_URL=postgresql://postgres:password@db:5432/knight_school
    DB_NAME=knight_school
    DB_USER=postgres
    DB_PASSWORD=password
    DB_HOST=db
    DB_PORT=5432
    DB_SCHEMA=public

    # Security
    JWT_SECRET=your_super_secret_random_string

### 2) Launch the Stack
Run:

    docker compose up -d

The API container is configured to automatically apply migrations (Alembic) on startup, so your database schema will be initialized automatically.

### 3) Seed the Openings Library
To populate the database with the chess openings, run:

    docker compose exec api python scripts/import_openings.py

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

## Training Endpoints

Training routes are under `/training-sessions`:

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/training-sessions` | Start new session (random opening) |
| `GET` | `/training-sessions/{id}/next` | Fetch next pending move |
| `POST` | `/training-sessions/{id}/responses` | Submit move (UCI) |
| `POST` | `/training-sessions/{id}/items` | Bulk add items to session |

Notes:
- The backend expects and validates moves using UCI strings.
- A session is marked `completed` when all training items have correct responses.

## Testing

Tests are executed inside the API container:

    # Run all tests
    docker compose exec api pytest

    # Run tests with coverage report
    docker compose exec api pytest --cov=backend.app tests/

## Development Tools
- **Linting/Formatting:** `ruff` and `black`
- **ER Diagrams:** If the repo includes the `erd` service, it generates `schema.svg` under `backend/app/docs`.
