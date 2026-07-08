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
- **Infra:** Dockerized full stack
- **Data import:** opening dataset importer/seed code

## Epics
- Import openings database and normalize move lines
- Training sessions (select an opening, start position; serve prompts and accept answers)
- Move validation and feedback (correct/incorrect + FEN-after handling)
- Progress tracking and review scheduling

## Tickets (examples)
- Set up “positions → opening/line” lookup
  - Done when: given input moves/position, the trainer resolves to the correct opening/line; unknown lines handled deterministically
- Implement move parser (canonicalization)
  - Done when: same PGN/UCI line consistently normalizes to the same stored move representation
- Training session: accept next-move attempts
  - Done when: UI/API accepts a move and returns pass/fail + next expected state
- Branch handling for alternative continuations
  - Done when: trainer accepts any valid next move for the chosen line/allowed transitions
- Progress logging (correct/incorrect)
  - Done when: session attempts persist and can be summarized per opening/position
