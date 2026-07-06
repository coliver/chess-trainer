# AGENTS.md
# Chess Trainer (FastAPI + Uvicorn + nginx + Docker)
# Project layout (from repo root):
# - app.py
# - trainer/ (module/package for trainer logic)
# - requirements.txt

You are an AI coding assistant helping implement features in this repository.

## Non-negotiables
- Keep the existing working scaffold working:
  - FastAPI app must still start
  - /ping must still work
  - nginx reverse proxy + self-signed TLS should not be changed unless the new feature requires it
- Make minimal, correct, testable changes.
- No secrets/credentials added to the repo.

## Tech & libraries
- Use FastAPI + Pydantic for request/response models.
- Use python-chess for chess rules:
  - FEN parsing
  - legal move checks
  - applying moves to compute resulting positions/FEN
- Put chess/trainer logic in the trainer/ module; keep app.py as thin as possible.

## Primary implementation target (next feature)
Add the first trainer flow (position prompt):
1) Backend creates a prompt for a chess position.
2) Client submits a move.
3) Backend validates:
   - move is legal in the given position
   - move matches the expected move for the prompt
4) Backend returns JSON for a future UI.

## API endpoints to implement (under /trainer/*)
Choose one approach and stick to it:

### Option A (simplest v1; stateless)
- POST /trainer/session
  - Request: optional initial FEN (string)
  - Response: prompt_id, fen, expected_move (UCI), maybe side-to-move (optional)
- POST /trainer/answer
  - Request: prompt_id, move_uci
  - Response JSON must include:
    - correct: bool
    - reason: string
    - expected: string | null (UCI)
    - fen_after: string | null (null if move is illegal)

## JSON behavior rules
- If move_uci is invalid UCI or cannot be parsed:
  - return HTTP 400 with a clear error message
- If the move is not legal in the provided FEN/position:
  - correct = false
  - reason = "illegal move"
  - fen_after = null
- If the move is legal but wrong:
  - correct = false
  - reason should clearly say "wrong move" (or equivalent)
  - fen_after should be included if computing it is straightforward; otherwise keep it null, but be consistent.

## Where code should live
- app.py:
  - routing only (FastAPI endpoints)
  - request/response models
- trainer/:
  - prompt creation
  - move parsing/validation
  - correctness checking
  - FEN after-move computation

## Dependencies
- Add python-chess only if it is missing from requirements.txt.
- Keep dependencies minimal.

## Tests (required)
- Use pytest.
- Add unit tests covering:
  - UCI parsing to Move
  - legality checking from FEN
  - correctness checking vs expected UCI move
- Tests must be deterministic and run quickly.

## Output constraints
- Only text/code changes. No hand-wavy steps.
- Ensure the server still runs and existing endpoints (/ and /ping) still behave.
