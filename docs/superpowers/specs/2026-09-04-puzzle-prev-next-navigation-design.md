# Puzzle prev/next navigation + solved/hint tracking

Status: approved, ready for planning
Date: 2026-09-04

## Problem

`ROADMAP.md` logged "Prev/next puzzle navigation" (chess.com-style stepping
back/forth through puzzles) as architectural work needing a spec pass, because
today there is no puzzle-queue/history concept anywhere in the app:

- `GET /puzzles/next` (`backend/app/routers/puzzles.py:64`) resolves via
  `get_next_puzzle` (`backend/app/modules/puzzles/service.py:56`), which takes
  a single `exclude_id` — "don't hand back the puzzle I was just shown," not a
  history or queue.
- In theme/free-practice mode (a `theme` query param is given), there is *no*
  repeat protection beyond that single `exclude_id` — the same puzzle can be
  served again almost immediately.
- In normal mode, `PuzzleProgress.due_at` drives SRS re-shows, which is
  intentional spaced repetition, not a bug.
- Neither frontend (React `Puzzles.tsx`, Angular `puzzles.component.ts`) keeps
  any client-side history of puzzles seen this session.
- There's no tracking of whether a hint was used on a given puzzle.

## Scope for this pass

- Backend: persist "has this user solved this puzzle" (already derivable) and
  add new tracking for "did they use a hint on it."
- Backend: theme/free-practice mode must not re-serve an already-solved
  puzzle.
- React: session-local (in-memory, resets on reload) prev/next stepping
  through puzzles already seen this session, as a read-only replay.
- Explicitly **out of scope**: normal/SRS-mode repeat behavior (unchanged),
  any backend-persisted queue/history table, puzzle-move history in the DB
  (frontend already holds what it needs), Angular parity (tracked separately).

## Design

### 1. Data model

Add one column to `PuzzleProgress` (`backend/app/modules/puzzles/models.py:32`):

```python
hint_used: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, server_default="false")
```

No new tables. "Solved" is already expressible as `PuzzleProgress.correct_count > 0`
for a given `(user_id, puzzle_id)` — no new column needed for that.

One Alembic migration: add `hint_used` boolean column, `NOT NULL DEFAULT false`.

### 2. `get_next_puzzle` — theme/free-practice exclusion

In `backend/app/modules/puzzles/service.py:56`, the `theme is not None` branch
(lines 68-81) currently only excludes `exclude_id`. Add an exclusion for any
puzzle this user has already solved:

```python
solved_ids = select(PuzzleProgress.puzzle_id).where(
    PuzzleProgress.user_id == user_id, PuzzleProgress.correct_count > 0
)
query = query.where(Puzzle.id.not_in(solved_ids))
```

Applied alongside the existing theme-match and `exclude_id` filters. The
normal (non-theme) branch (lines 83-102, SRS due-date + unseen-puzzle
selection) is unchanged — solved puzzles are meant to resurface there via SRS.

Skipped/failed puzzles (never solved) remain eligible to be re-served in
theme mode — only a successful solve (`correct_count > 0`) excludes a puzzle.

### 3. Attempt API — hint tracking

`PuzzleAttemptRequest` (`backend/app/routers/puzzles.py:39`) gains:

```python
used_hint: bool = False
```

`submit_puzzle_attempt` (`backend/app/modules/puzzles/service.py:125`) takes
a new `used_hint: bool = False` parameter. Intermediate correct-but-not-final
moves (lines 140-151) still return early without touching the DB — hint usage
on an earlier move in a multi-move puzzle would be lost if not carried
forward, so **the frontend is responsible for tracking "was a hint shown
anywhere during this puzzle's move sequence" and passing that flag on every
attempt call**, not just the final one.

At finalization (puzzle complete, or wrong final move — where the function
already creates/updates the `PuzzleProgress` row, lines 153-197), set:

```python
row.hint_used = row.hint_used or used_hint
```

Sticky: once a puzzle has ever been hint-assisted, it stays flagged, even
across later re-attempts (e.g. SRS due-date reviews) without a hint.

The `.text` CLI endpoints (`attempts.text`) get the equivalent
`used_hint: bool = Query(False, alias="usedHint")` for parity, since they
call the same `submit_puzzle_attempt`.

### 4. React — prev/next navigation

In `frontend/react/src/pages/Puzzles.tsx`, replace the single `puzzleId`
tracking (currently just used as `excludeId` for the next fetch, line 42/115)
with a session-local array of visited puzzle entries:

```ts
type VisitedPuzzle = {
  position: PuzzleNextResponse;   // the full payload already fetched
  solved: boolean;
  usedHint: boolean;
};
```

- `history: VisitedPuzzle[]` plus a `historyIndex` pointer.
- **Next**: if `historyIndex < history.length - 1`, just advance the pointer
  (no API call — the puzzle's already in memory). Otherwise call
  `/puzzles/next` as today, append the result, and advance.
- **Prev**: decrement `historyIndex`. Renders the puzzle at that index in a
  **read-only replay** mode: board shows the solved position (or steps through
  the solution moves), accepts no input, makes no backend calls. This avoids
  re-submitting attempts and double-counting SRS/progress for a puzzle
  already resolved this session.
- The existing hint button's client state now needs to also set a per-puzzle
  `usedHint` flag that gets included on every `POST .../attempts` call for
  that puzzle (see §3).
- "Skip" behavior is unchanged (still just calls `loadNext`); skipped puzzles
  are not added to `history` as solved, matching the backend's
  solved-only exclusion.
- Resets to empty `history` on page reload / navigating away, per session-local
  scope decision — no persistence intended.

### 5. Angular

Out of scope. Add an entry to `frontend/angular/PARITY_GAPS.md` noting the
prev/next feature and hint-tracking as a new gap once React ships.

## Testing

- Backend (pytest):
  - Theme-mode `get_next_puzzle` excludes a puzzle with `correct_count > 0`
    for the requesting user, but still returns puzzles that were only
    skipped/failed.
  - `submit_puzzle_attempt(..., used_hint=True)` sets `hint_used=True` on
    finalization; a later call with `used_hint=False` does not clear it.
  - Migration applies cleanly (existing `alembic upgrade head` check).
- React (vitest):
  - History array stepping: `next` from the frontier fetches; `next`/`prev`
    within existing history do not call the API.
  - Prev renders read-only (no move input accepted, no attempt POST fires).

## Out of scope / explicitly deferred

- Any backend-persisted session/queue table.
- Changing normal-mode SRS re-show behavior.
- Analytics/reporting on hint usage ("data crap later," per user).
- Angular implementation.
