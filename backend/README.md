# ♞ Knight School Backend ♘

The backend for Knight School is a modular FastAPI application designed to provide chess training sessions, track user progress, and manage a library of chess openings.

### 📂 Project Navigation
- **[Frontend](../frontend/README.md)**: React components, State management, and UI/UX.
- **[Infrastructure](./nginx)**: Nginx configuration and Docker orchestration.


## 🛠 Tech Stack

- **Framework:** FastAPI
- **Server:** Uvicorn
- **Database:** PostgreSQL 16
- **ORM:** SQLAlchemy
- **Migrations:** Alembic
- **Chess Logic:** `python-chess`
- **Authentication:** PyJWT & Pydantic
- **Infrastructure:** Docker & Nginx

---

## 🚀 Getting Started

This project is designed to run entirely within Docker.

### 1. Configuration

Create a `.env` file in the project root. The `docker-compose.yml` relies on these variables:

```env
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
```

### 2. Launch the Stack

Run the following command to build the images and start the services in the background:

```bash
docker compose up -d
```

**Note:** The API container is configured to automatically run `alembic upgrade head` upon startup, so your database schema will be initialized automatically.

### 3. Seeding Openings

To populate the database with the chess openings library, run the import script inside the running API container:

```bash
docker compose exec api python scripts/import_openings.py
```

### 4. Accessing the API

Once the containers are healthy:

- **API Base URL:** `http://localhost:8000` (or via Nginx on port 80)
- **Interactive Docs (Swagger):** `http://localhost:8000/docs`
- **Alternative Docs (ReDoc):** `http://localhost:8000/redoc`

---

## 🏗 Architecture

The project follows a **Domain-Driven Design (DDD)** approach to ensure scalability and maintainability.

### Directory Structure

```text
backend/
├── app/
│   ├── app.py              # Application entry point & router aggregation
│   ├── db/                 # Database connection & session management
│   │   └── migrations/     # Alembic migration history
│   ├── docs/               # Architecture diagrams and DB schema
│   ├── modules/            # Core business logic (Domain layer)
│   │   ├── auth/           # Authentication & security logic
│   │   ├── openings/       # Chess opening catalog management
│   │   ├── progress/       # User training progress tracking
│   │   ├── shared/         # Cross-cutting utilities & DB helpers
│   │   ├── training/       # Chess rule validation & session logic
│   │   └── users/          # User profile and account management
│   ├── opening_importer/   # Logic for seeding and importing openings
│   └── routers/            # API delivery layer (Controller layer)
│       ├── auth.py         # Auth endpoints
│       └── training.py     # Training session endpoints
└── README.md
```

### Data Flow

To maintain a clean separation of concerns, the application follows a strict unidirectional data flow:

**`Client`** $\rightarrow$ **`Routers`** (Request Handling) $\rightarrow$ **`Modules`** (Business Logic) $\rightarrow$ **`DB`** (Persistence)

- **Routers:** Act as the entry point. They handle HTTP parsing and call the appropriate service in the module layer.
- **Modules:** The "heart" of the application. This is where chess rules are validated and training logic is executed.
- **DB:** A thin layer for SQLAlchemy models and migration management.

## ⚙️ Logic & Validation

**Move Validation Flow:**

1. **UCI Format:** Validated via `python-chess` $\rightarrow$ `400 Bad Request` if invalid.
2. **Legality:** Validated via `board.legal_moves` $\rightarrow$ `200 OK` (Correct: False) if illegal.
3. **Correctness:** Compared against target move $\rightarrow$ `200 OK` (Correct: True) if match.

**Session Completion:**

- A session is marked **completed** automatically when all associated `TrainingItems` have a correct `TrainingResponse`.

**Tracking Metrics:** TODO

- **Accuracy:** Success rate based on `is_correct` flags.
- **Consistency:** Session volume tracked via `created_at` timestamps.

## 📡 API Reference

### Auth

| Method | Endpoint         | Description                     |
| :----- | :--------------- | :------------------------------ |
| `POST` | `/auth/register` | Create account                  |
| `POST` | `/auth/login`    | Authenticate user (returns JWT) |

### Training

| Method | Endpoint                            | Description                        |
| :----- | :---------------------------------- | :--------------------------------- |
| `POST` | `/training-sessions`                | Start new session (random opening) |
| `GET`  | `/training-sessions/{id}/next`      | Fetch next pending move            |
| `POST` | `/training-sessions/{id}/responses` | Submit move (UCI)                  |
| `POST` | `/training-sessions/{id}/items`     | Bulk add items to session          |

---

## 🧪 Testing

Tests are executed inside the API container to ensure the environment matches production.

```bash
# Run all tests
docker compose exec api pytest

# Run tests with coverage report
docker compose exec api pytest --cov=backend.app tests/
```

## 🛠 Development Tools

- **Linting/Formatting:** This project uses `ruff` and `black` to maintain code quality.
- **ER Diagrams:** The `erd` service uses SchemaCrawler to automatically generate a `schema.svg` in `backend/app/docs` based on the current database state.
