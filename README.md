## Project plan (v1)
**Goal:** Build a chess openings trainer that helps me drill specific lines and measure improvement.

### Epics
- Import openings database and normalize move lines
- Training sessions (select an opening, start position)
- Move validation and feedback (correct/incorrect)
- Progress tracking and review scheduling

### Tickets (examples)
- Set up “positions → opening” lookup
  - Done when: input moves return the correct opening id; unknown lines handled
- Implement move parser (canonicalization)
  - Done when: same PGN line always normalizes to the same stored format
- Training session: accept next-move attempts
  - Done when: UI/API accepts a move and returns pass/fail + next expected state
- Branch handling for alternative continuations
  - Done when: trainer accepts any valid next move for the chosen line
- Progress logging (correct/incorrect)
  - Done when: session attempts persist and can be summarized per opening