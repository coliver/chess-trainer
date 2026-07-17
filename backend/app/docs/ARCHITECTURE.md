# Knight School Architecture Overview

## Project Structure (Backend)

```text
backend/
├── app/
│   ├── db/
│   │   └── base.py
│   ├── docs/
│   │   ├── ARCHITECTURE.md
│   │   └── schema.svg
│   ├── migrations/
│   └── app.py
├── modules/
│   ├── auth/
│   │   ├── service.py
│   │   └── __init__.py
│   ├── openings/
│   │   ├── models.py
│   │   └── service.py
│   ├── progress/
│   │   ├── shared/
│   │   │   └── db.py
│   │   └── __init__.py
│   ├── training/
│   │   ├── chess_rules.py
│   │   ├── models.py
│   │   └── service.py
│   └── users/
│       └── models.py
├── opening_importer/
│   └── importer/
│       └── seed/
├── routers/
│   ├── auth.py
│   └── training.py
└── __init__.py
```

## High-Level Request Flow

1. Request arrives at FastAPI endpoints in `backend/routers/`.
2. Routers call module services in `backend/modules/`.
3. Services use domain models in `backend/modules/*/models.py` (and rules in `backend/modules/training/chess_rules.py`).
4. Persistence is handled via the DB utilities in `backend/app/db/base.py` and via Alembic migrations in `backend/app/migrations/`.
5. Training progress read/write uses helpers in `backend/modules/progress/shared/db.py`.

## Component Overview

### Routers (`backend/routers/`)
- `auth.py`
- `training.py`

### Services (`backend/modules/*/service.py`)
- `modules/auth/service.py`
- `modules/openings/service.py`
- `modules/training/service.py`

### Domain Models
- `modules/users/models.py`
- `modules/openings/models.py`
- `modules/training/models.py`

### Rules / Validation Helpers
- `modules/training/chess_rules.py`

### Progress DB Helpers
- `modules/progress/shared/db.py`

### DB / Migrations
- `app/db/base.py`
- `app/migrations/*` (Alembic)

### Import / Seed Tooling
- `opening_importer/` (offline seed/import utilities)

## Key Architecture Decisions

| Decision | Implementation |
|---|---|
| API design | FastAPI routers grouped by feature area (`routers/auth.py`, `routers/training.py`) |
| Business logic placement | Module services own workflows (`modules/*/service.py`) |
| Domain boundaries | Feature-specific model files (`modules/*/models.py`) |
| Rules location | Move legality and related rules kept in `modules/training/chess_rules.py` |
| Persistence and migrations | Central DB plumbing in `app/db/base.py` with Alembic migrations in `app/migrations/` |
| Progress coupling | Progress DB operations centralized in `modules/progress/shared/db.py` |