# Chess-Trainer

## Project plan (v1)

**Goal:** Build a web-based chess openings trainer that drills specific lines and tracks improvement.

## Developers
- Christopher Oliver (@coliver)

## Planning
Planning is done in clickUp.com

## Architecture (high level)
- **Frontend:** TypeScript + React
- **Backend:** Python + FastAPI
- **DB:** PostgreSQL
- **Infra:** Dockerized full stack with nginx reverse proxy (with websocket proxying for `/ws`)
- **Data import:** opening dataset importer/seed code

## Epics

### Import openings database
- Status: In progress
- Goal: Load an openings dataset and support deterministic opening/line prompting from stored data.
- Current behavior:
  - Training items are generated from opening records using `opening.epd` (starting position) and `opening.uci_moves` (move sequence).
  - Prompt generation can be derived by **(ECO, move index)** using the opening moves and `python-chess` to compute the prompt FEN.

### Training core
- Status: Developing
- Key APIs:
  - `POST /training-sessions` - Create new training sessions
    - Creates a session and stores `opening_eco` and `opening_name` on the session.
    - Training items are generated from the opening dataset (`epd` + `uci_moves`) at session creation time.
  - `GET /training-sessions/{id}/next` - Get next training item
    - Returns the next item’s `fen` and (optionally) move limits.
    - Also includes `opening_eco` and `opening_name` in the response.
  - `POST /training-sessions/{id}/responses` - Submit responses
    - Validates the submitted move against the expected correct UCI for the current item.

### Validation and feedback
- Status: Core functionality complete
- Features:
  - Move validation with UCI parsing
  - Illegal move detection
  - Correct/wrong move feedback with FEN states
  - Error handling with HTTP 400 for invalid input

## Tickets (examples)

| Ticket | Status | Definition |
|--------|--------|------------|
| Positions lookup | In progress | Given a position, resolve to opening/line deterministically |
| Move canonicalization | To-do | Standardize PGN move notation parsing |
| Session persistence | Complete | Training sessions are creatable and savable |

## Current MVP status

- **Completed:**
  - ✓ `POST /auth/register`
  - ✓ `POST /auth/login`
  - ✓ `POST /training-sessions`
  - ✓ `GET /training-sessions/{id}/next`
  - ✓ `POST /training-sessions/{id}/responses`

- **Validation rules implemented:**
  - ✅ Invalid UCI strings → HTTP 400 with error message
  - ✅ Illegal moves → `correct=false`, shows next FEN
  - ✅ Correct move → `correct=true`, shows new state
  - ✅ Wrong legal move → `correct=false`, shows new state

- **Additional training session metadata (current code behavior):**
  - `GET /training-sessions/{id}/next` response includes:
    - `opening_eco`
    - `opening_name`

## Frontend routes (current behavior)

- The app navigates to training using `/training/:id` (training session id in the path).
- The dashboard starts a new session and then redirects to `/training/:id`.

## Running the Application

```bash
# Start the development environment
docker-compose up --build

docker compose up -d
```

The application is available at https://localhost behind nginx.

nginx also proxies websocket traffic at /ws (used by the frontend dev server / Vite HMR). 

nginx is configured with TLS on port 443 using the self-signed certificate in the container. 

