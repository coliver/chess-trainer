***

# ♟️ Knight School (Chess Trainer)

A web-based chess openings trainer designed to drill specific lines and track performance metrics.

## 🛠 Tech Stack
- **Backend:** Python 3.10+ / FastAPI / SQLAlchemy / Alembic
- **Frontend:** TypeScript / React / `chess.js` / `react-chessboard`
- **Infrastructure:** PostgreSQL / Nginx / Docker

## 📂 Project Structure
```text
├── backend/
│   ├── app/               # FastAPI application
│   │   ├── modules/       # Domain logic (openings, training, shared)
│   │   └── app.py         # App entry point
│   └── migrations/        # Alembic migrations
├── tests/                 # Backend tests
├── requirements.txt       # Backend dependencies
└── frontend/
    └── src/               # React source
```

## 🚀 Quick Start

### Prerequisites
- Python $\ge$ 3.10
- PostgreSQL $\ge$ 14
- Node.js $\ge$ 18

### Local Setup

**1. Backend**
```bash
# Copy environment variables template
cp .env.example .env

# Setup and activate virtual environment
python -m venv venv && source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Create the database
createdb chess_trainer

# Run migrations to set up tables
alembic upgrade heads
```

**2. Frontend**
```bash
cd frontend
npm install
npm run dev
```

### Docker Setup
```bash
docker-compose up -d --build
```

## 📡 API Reference

### Auth
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/auth/register` | Create account |
| `POST` | `/auth/login` | Authenticate user (returns JWT) |

### Training
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/training-sessions` | Start new session (random opening) |
| `GET` | `/training-sessions/{id}/next` | Fetch next pending move |
| `POST` | `/training-sessions/{id}/responses` | Submit move (UCI) |
| `POST` | `/training-sessions/{id}/items` | Bulk add items to session |

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

## 🤝 Contribution
- **Python:** Type hints required $\rightarrow$ **Ruff**.
- **Commits:** Use conventional commits (`feat:`, `fix:`, `docs:`, `test:`).
- **PRs:** Must include tests for any new logic.

## Project Credits

### 🎨 Frontend
- ⚛️ [React](https://github.com/facebook/react)
- 🛣️ [React Router](https://github.com/remix-run/react-router)
- 🌐 [Axios](https://github.com/axios/axios)
- ♟️ [Chess.js](https://github.com/jhlywa/chess.js)
- 🏁 [React-Chessboard](https://github.com/Clarielle/react-chessboard)

### ⚙️ Backend
- ⚡ [FastAPI](https://github.com/tiangolo/fastapi)
- 🛢️ [SQLAlchemy](https://github.com/sqlalchemy/sqlalchemy)
- ♟️ [Python-Chess](https://github.com/niklasf/python-chess)
- 🚀 [Uvicorn](https://github.com/encode/uvicorn)
- 🔑 [PyJWT](https://github.com/pyjwt/pyjwt)
- 📦 [Pydantic](https://github.com/pydantic/pydantic)
- 🐘 [Psycopg](https://github.com/psycopg/psycopg)