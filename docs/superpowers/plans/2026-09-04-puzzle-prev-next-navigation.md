# Puzzle Prev/Next Navigation + Hint Tracking Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Track whether a user solved a puzzle and whether they used a hint doing so, stop theme/free-practice mode from re-serving an already-solved puzzle, and give the React Puzzles page session-local prev/next stepping through puzzles it has already fetched this session (read-only replay when stepping back).

**Architecture:** Add one boolean column (`hint_used`) to the existing `PuzzleProgress` row instead of a new history table — "solved" is already `correct_count > 0`. Backend changes are additive to `get_next_puzzle`'s theme branch and `submit_puzzle_attempt`'s finalize step. The React frontend replaces its single `puzzleId` tracking with an in-memory array of every puzzle payload fetched this session plus a pointer into it; "next" only calls the API once that pointer reaches the end of the array, and "prev" walks backward through it rendering a non-interactive replay.

**Tech Stack:** FastAPI + SQLAlchemy + Alembic (backend), React + TypeScript + vitest/testing-library (frontend), pytest (backend tests).

**Spec:** [docs/superpowers/specs/2026-09-04-puzzle-prev-next-navigation-design.md](../specs/2026-09-04-puzzle-prev-next-navigation-design.md)

## Global Constraints

- Normal (non-theme) SRS due-date re-show behavior is unchanged — do not touch it.
- Only a successful solve (`PuzzleProgress.correct_count > 0`) excludes a puzzle in theme mode; skipped/failed puzzles remain eligible to reappear.
- `hint_used` is sticky: once true for a `(user, puzzle)` pair, a later attempt without a hint must not clear it back to false.
- No new backend tables, no backend-persisted queue/history, no puzzle-move history stored server-side.
- Prev/next history is session-local (in-memory React state) — no `localStorage`, resets on reload.
- Stepping backward into history is **read-only**: no board input accepted, no `POST .../attempts` call fires.
- Angular is explicitly out of scope for this plan — tracked as a new `PARITY_GAPS.md` entry only.

---

## Task 1: `hint_used` column on `PuzzleProgress`

**Files:**
- Modify: `backend/app/modules/puzzles/models.py:1-30` (imports + `PuzzleProgress` class, currently ends line 61)
- Create: `backend/app/migrations/versions/0013_puzzle_progress_hint_used.py`
- Test: `tests/test_puzzles_service.py` (extends existing file, no new file)

**Interfaces:**
- Produces: `PuzzleProgress.hint_used: bool` (default `False`), readable/writable by later tasks in `backend/app/modules/puzzles/service.py`.

- [ ] **Step 1: Write the failing test**

Add to `tests/test_puzzles_service.py` (near the other `submit_puzzle_attempt` tests, e.g. after `test_submit_puzzle_attempt_wrong_move`):

```python
def test_submit_puzzle_attempt_records_hint_used_column_exists(db, test_user):
    make_puzzle(db)

    service.submit_puzzle_attempt(
        db, user_id=test_user.id, puzzle_id="p1", move_uci="e7e5", move_index=0
    )

    row = (
        db.query(PuzzleProgress)
        .filter(PuzzleProgress.user_id == test_user.id, PuzzleProgress.puzzle_id == "p1")
        .first()
    )
    assert row.hint_used is False
```

- [ ] **Step 2: Run test to verify it fails**

Run (inside the backend container per project convention): `docker compose exec api pytest tests/test_puzzles_service.py::test_submit_puzzle_attempt_records_hint_used_column_exists -v`
Expected: FAIL — `AttributeError: 'PuzzleProgress' object has no attribute 'hint_used'`

- [ ] **Step 3: Add the column to the model**

In `backend/app/modules/puzzles/models.py`, add `Boolean` to the sqlalchemy import (line 3):

```python
from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Integer, String, UniqueConstraint, func
```

Then add the column to `PuzzleProgress` (after `incorrect_count`, before `ease_factor`, around line 47):

```python
    hint_used: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
```

- [ ] **Step 4: Write the migration**

Create `backend/app/migrations/versions/0013_puzzle_progress_hint_used.py`:

```python
# Revision ID: '0013'
# Revises: '0012'
# Create Date: 2026-09-04

import sqlalchemy as sa
from alembic import op

revision = "0013"
down_revision = "0012"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column(
        "puzzle_progress",
        sa.Column("hint_used", sa.Boolean(), nullable=False, server_default=sa.text("false")),
    )


def downgrade():
    op.drop_column("puzzle_progress", "hint_used")
```

- [ ] **Step 5: Apply the migration and run the test**

Run: `docker compose exec api alembic -c backend/app/migrations/alembic.ini upgrade head`
Then: `docker compose exec api pytest tests/test_puzzles_service.py::test_submit_puzzle_attempt_records_hint_used_column_exists -v`
Expected: PASS

- [ ] **Step 6: Run the full puzzle test suite to check for regressions**

Run: `docker compose exec api pytest tests/test_puzzles_service.py tests/test_routers_puzzles.py tests/test_puzzles_text_routes.py -v`
Expected: all PASS (no existing test constructs `PuzzleProgress` without `hint_used`, since it has a default)

- [ ] **Step 7: Commit**

```bash
git add backend/app/modules/puzzles/models.py backend/app/migrations/versions/0013_puzzle_progress_hint_used.py tests/test_puzzles_service.py
git commit -m "Add hint_used column to PuzzleProgress"
```

---

## Task 2: Theme mode excludes already-solved puzzles

**Files:**
- Modify: `backend/app/modules/puzzles/service.py:56-81` (`get_next_puzzle`, theme branch)
- Test: `tests/test_puzzles_service.py`

**Interfaces:**
- Consumes: `PuzzleProgress.correct_count` (existing field), `PuzzleProgress.user_id`, `PuzzleProgress.puzzle_id`.
- Produces: no new interface — `get_next_puzzle(db, user_id, theme=..., exclude_id=...)` signature unchanged.

- [ ] **Step 1: Write the failing tests**

Add to `tests/test_puzzles_service.py`, near the other theme-mode tests (after `test_get_next_puzzle_with_theme_ignores_due_dates`):

```python
def test_get_next_puzzle_with_theme_excludes_solved_puzzles(db, test_user):
    make_puzzle(db, id="p1", themes="fork")
    make_puzzle(db, id="p2", themes="fork")

    service.submit_puzzle_attempt(
        db, user_id=test_user.id, puzzle_id="p1", move_uci="e7e5", move_index=0
    )

    result = service.get_next_puzzle(db, test_user.id, theme="fork")
    assert result is not None
    assert result.puzzle_id == "p2"


def test_get_next_puzzle_with_theme_still_returns_skipped_but_unsolved_puzzle(db, test_user):
    make_puzzle(db, id="p1", themes="fork")

    # A wrong (unsolved) attempt must not exclude the puzzle from theme mode.
    service.submit_puzzle_attempt(
        db, user_id=test_user.id, puzzle_id="p1", move_uci="e7e6", move_index=0
    )

    result = service.get_next_puzzle(db, test_user.id, theme="fork")
    assert result is not None
    assert result.puzzle_id == "p1"


def test_get_next_puzzle_with_theme_none_when_all_matches_solved(db, test_user):
    make_puzzle(db, id="p1", themes="fork")

    service.submit_puzzle_attempt(
        db, user_id=test_user.id, puzzle_id="p1", move_uci="e7e5", move_index=0
    )

    result = service.get_next_puzzle(db, test_user.id, theme="fork")
    assert result is None
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `docker compose exec api pytest tests/test_puzzles_service.py -k "theme_excludes_solved or theme_still_returns_skipped or theme_none_when_all_matches_solved" -v`
Expected: FAIL — `test_get_next_puzzle_with_theme_excludes_solved_puzzles` and `test_get_next_puzzle_with_theme_none_when_all_matches_solved` return `p1` / a puzzle instead of `p2` / `None` (no exclusion exists yet); `test_get_next_puzzle_with_theme_still_returns_skipped_but_unsolved_puzzle` already passes (no code change needed for it, it's a regression guard).

- [ ] **Step 3: Add the solved-puzzle exclusion**

In `backend/app/modules/puzzles/service.py`, modify the theme branch of `get_next_puzzle` (currently lines 68-81):

```python
    if theme is not None:
        solved_ids = select(PuzzleProgress.puzzle_id).where(
            PuzzleProgress.user_id == user_id, PuzzleProgress.correct_count > 0
        )
        query = (
            select(Puzzle)
            .where(text("string_to_array(themes, ' ') @> ARRAY[:theme]"))
            .params(theme=theme)
            .where(Puzzle.id.not_in(solved_ids))
        )
        if exclude_id is not None:
            query = query.where(Puzzle.id != exclude_id)
        puzzle = db.execute(query.order_by(func.random()).limit(1)).scalar_one_or_none()

        if puzzle is None:
            return None

        return _build_puzzle_position(puzzle)
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `docker compose exec api pytest tests/test_puzzles_service.py -v`
Expected: all PASS, including `test_get_next_puzzle_with_theme_ignores_due_dates` (that test solves `p1` then re-fetches it in theme mode expecting it back — re-read it now that solved puzzles are excluded).

- [ ] **Step 4b: Fix the now-contradictory existing test**

`test_get_next_puzzle_with_theme_ignores_due_dates` (existing, around line 303) solves puzzle `p1` and then asserts theme mode still returns `p1` — that assertion is now wrong given the new exclusion. Replace its body to assert exclusion instead, since "ignores due dates" is now covered by `test_get_next_puzzle_with_theme_excludes_solved_puzzles`'s sibling tests:

```python
def test_get_next_puzzle_with_theme_ignores_due_dates_for_unsolved_puzzles(db, test_user):
    make_puzzle(db, id="p1", themes="fork")

    # A due_at in the future must not block an unsolved puzzle from theme mode.
    row = PuzzleProgress(
        user_id=test_user.id,
        puzzle_id="p1",
        attempts=1,
        correct_count=0,
        incorrect_count=1,
        due_at=datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(days=5),
    )
    db.add(row)
    db.commit()

    result = service.get_next_puzzle(db, test_user.id, theme="fork")
    assert result is not None
    assert result.puzzle_id == "p1"
```

- [ ] **Step 5: Run the full suite again**

Run: `docker compose exec api pytest tests/test_puzzles_service.py tests/test_routers_puzzles.py tests/test_puzzles_text_routes.py -v`
Expected: all PASS

- [ ] **Step 6: Commit**

```bash
git add backend/app/modules/puzzles/service.py tests/test_puzzles_service.py
git commit -m "Exclude already-solved puzzles from theme/free-practice mode"
```

---

## Task 3: `used_hint` on attempt submission (backend)

**Files:**
- Modify: `backend/app/modules/puzzles/service.py:125-199` (`submit_puzzle_attempt`)
- Modify: `backend/app/routers/puzzles.py:39-41,87-113,132-154` (`PuzzleAttemptRequest`, `post_puzzle_attempt`, `post_puzzle_attempt_text`)
- Test: `tests/test_puzzles_service.py`, `tests/test_routers_puzzles.py`

**Interfaces:**
- Consumes: `PuzzleProgress.hint_used` (Task 1).
- Produces: `submit_puzzle_attempt(db, user_id, puzzle_id, move_uci, move_index, used_hint=False)` — new keyword param, default `False`, backward compatible with all existing call sites.

- [ ] **Step 1: Write the failing service-level tests**

Add to `tests/test_puzzles_service.py` (near `test_submit_puzzle_attempt_correct_updates_progress_and_streak`):

```python
def test_submit_puzzle_attempt_used_hint_true_sets_hint_used(db, test_user):
    make_puzzle(db)

    service.submit_puzzle_attempt(
        db, user_id=test_user.id, puzzle_id="p1", move_uci="e7e5", move_index=0, used_hint=True
    )

    row = (
        db.query(PuzzleProgress)
        .filter(PuzzleProgress.user_id == test_user.id, PuzzleProgress.puzzle_id == "p1")
        .first()
    )
    assert row.hint_used is True


def test_submit_puzzle_attempt_hint_used_is_sticky_across_later_attempts(db, test_user):
    make_puzzle(db)

    service.submit_puzzle_attempt(
        db, user_id=test_user.id, puzzle_id="p1", move_uci="e7e6", move_index=0, used_hint=True
    )
    service.submit_puzzle_attempt(
        db, user_id=test_user.id, puzzle_id="p1", move_uci="e7e5", move_index=0, used_hint=False
    )

    row = (
        db.query(PuzzleProgress)
        .filter(PuzzleProgress.user_id == test_user.id, PuzzleProgress.puzzle_id == "p1")
        .first()
    )
    assert row.hint_used is True


def test_submit_puzzle_attempt_no_hint_leaves_hint_used_false(db, test_user):
    make_puzzle(db)

    service.submit_puzzle_attempt(
        db, user_id=test_user.id, puzzle_id="p1", move_uci="e7e5", move_index=0
    )

    row = (
        db.query(PuzzleProgress)
        .filter(PuzzleProgress.user_id == test_user.id, PuzzleProgress.puzzle_id == "p1")
        .first()
    )
    assert row.hint_used is False
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `docker compose exec api pytest tests/test_puzzles_service.py -k used_hint -v`
Expected: FAIL — `TypeError: submit_puzzle_attempt() got an unexpected keyword argument 'used_hint'`

- [ ] **Step 3: Add `used_hint` to `submit_puzzle_attempt`**

In `backend/app/modules/puzzles/service.py`, change the signature (line 125):

```python
def submit_puzzle_attempt(
    db: Session, user_id: int, puzzle_id: str, move_uci: str, move_index: int, used_hint: bool = False
):
```

Then, in the finalize block (currently lines 160-171, where a new `PuzzleProgress` row is created if `row is None`), the new row already defaults `hint_used` via the model — no change needed there. Immediately after that `if row is None:` block (right before `row.attempts += 1` at line 173), set:

```python
    row.hint_used = row.hint_used or used_hint
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `docker compose exec api pytest tests/test_puzzles_service.py -v`
Expected: all PASS

- [ ] **Step 5: Wire `used_hint` through the JSON attempt endpoint**

In `backend/app/routers/puzzles.py`, add the field to `PuzzleAttemptRequest` (line 39-41):

```python
class PuzzleAttemptRequest(CamelModel):
    move_uci: str
    move_index: int = 0
    used_hint: bool = False
```

Then pass it through in `post_puzzle_attempt` (line 87-100):

```python
    result = submit_puzzle_attempt(
        db,
        user_id=current_user.id,
        puzzle_id=puzzle_id,
        move_uci=req.move_uci,
        move_index=req.move_index,
        used_hint=req.used_hint,
    )
```

- [ ] **Step 6: Wire `used_hint` through the `.text` attempt endpoint**

In `backend/app/routers/puzzles.py`, update `post_puzzle_attempt_text` (line 132-149):

```python
@router.post("/puzzles/{puzzle_id}/attempts.text", response_class=PlainTextResponse)
def post_puzzle_attempt_text(
    puzzle_id: str,
    move_uci: str = Query(..., alias="moveUci"),
    move_index: int = Query(0, alias="moveIndex"),
    used_hint: bool = Query(False, alias="usedHint"),
    ansi: bool = Query(True),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user_or_none),
):
    if current_user is None:
        return text_response(LOGIN_INSTRUCTIONS, ansi, status_code=401)
    result = submit_puzzle_attempt(
        db,
        user_id=current_user.id,
        puzzle_id=puzzle_id,
        move_uci=move_uci,
        move_index=move_index,
        used_hint=used_hint,
    )
```

- [ ] **Step 7: Update the existing router tests' fake signatures**

`tests/test_routers_puzzles.py` has monkeypatched lambdas for `submit_puzzle_attempt` that will now receive an unexpected `used_hint` kwarg and raise `TypeError`. Update each lambda/function signature to accept it:

- Line 117: `lambda db, user_id, puzzle_id, move_uci, move_index, used_hint=False: None,`
- Line 138: `lambda db, user_id, puzzle_id, move_uci, move_index, used_hint=False: Result(),`
- Line 168-170:
  ```python
  def fake_submit(db, user_id, puzzle_id, move_uci, move_index, used_hint=False):
      captured["move_index"] = move_index
      return Result()
  ```

- [ ] **Step 8: Add a router-level test asserting `used_hint` is passed through**

Add to `tests/test_routers_puzzles.py` (after `test_post_puzzle_attempt_intermediate_move_maps_opponent_reply`):

```python
def test_post_puzzle_attempt_passes_used_hint(client, monkeypatch: pytest.MonkeyPatch):
    class Result:
        http_status = 200
        correct = True
        reason = "correct move"
        fen_after = "after-fen"
        error_message = None
        puzzle_complete = True
        opponent_reply_uci = None
        next_correct_move_uci = None

    captured = {}

    def fake_submit(db, user_id, puzzle_id, move_uci, move_index, used_hint=False):
        captured["used_hint"] = used_hint
        return Result()

    monkeypatch.setattr(puzzles_router, "submit_puzzle_attempt", fake_submit)

    r = client.post("/puzzles/p1/attempts", json={"moveUci": "e7e5", "usedHint": True})
    assert r.status_code == 200
    assert captured["used_hint"] is True
```

- [ ] **Step 9: Run the full backend puzzle test suite**

Run: `docker compose exec api pytest tests/test_puzzles_service.py tests/test_routers_puzzles.py tests/test_puzzles_text_routes.py -v`
Expected: all PASS

- [ ] **Step 10: Run ruff and black**

Run: `docker compose exec api ruff check backend/app/modules/puzzles/service.py backend/app/routers/puzzles.py` and `docker compose exec api black --check backend/app/modules/puzzles/service.py backend/app/routers/puzzles.py`
Expected: no issues (run `black` without `--check` to auto-fix if it reports formatting diffs)

- [ ] **Step 11: Commit**

```bash
git add backend/app/modules/puzzles/service.py backend/app/routers/puzzles.py tests/test_puzzles_service.py tests/test_routers_puzzles.py
git commit -m "Track hint usage on puzzle attempt submission"
```

---

## Task 4: React — send `usedHint` on attempt submission

**Files:**
- Modify: `frontend/react/src/pages/Puzzles.tsx:47-219` (hint state + `submit`)
- Test: `frontend/react/src/pages/Puzzles.test.tsx`

**Interfaces:**
- Consumes: nothing new from other tasks (independent of backend column beyond the API accepting the extra field, which it now does per Task 3).
- Produces: a `usedHintRef`-backed flag included as `usedHint` in every `POST /puzzles/{id}/attempts` body; consumed by Task 5/6 only in that they must not regress it.

- [ ] **Step 1: Write the failing test**

Add to `frontend/react/src/pages/Puzzles.test.tsx`, inside the `describe("Hint", ...)` block (after the "does not carry an active hint over into the next puzzle" test):

```typescript
    it("sends usedHint: true on the attempt after the hint button was clicked", async () => {
      (api.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        data: NEXT_PUZZLE,
      });
      (api.post as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        data: {
          correct: true,
          reason: "",
          fenAfter: NEXT_PUZZLE.fen,
          puzzleComplete: true,
        },
      });

      renderPuzzles();
      await screen.findByText("Rating ~1500");

      await user.click(screen.getByRole("button", { name: /hint/i }));

      applyMoveMock.mockReturnValueOnce({
        nextFen: NEXT_PUZZLE.fen,
        uci: "e2e4",
      });
      act(() => {
        capturedProps.onMove?.("e2", "e4");
      });

      await screen.findByText("✅ Correct!");
      expect(api.post).toHaveBeenCalledWith("/puzzles/p1/attempts", {
        moveUci: "e2e4",
        moveIndex: 0,
        usedHint: true,
      });
    });

    it("sends usedHint: false when no hint was used", async () => {
      (api.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        data: NEXT_PUZZLE,
      });
      (api.post as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        data: {
          correct: true,
          reason: "",
          fenAfter: NEXT_PUZZLE.fen,
          puzzleComplete: true,
        },
      });

      renderPuzzles();
      await screen.findByText("Rating ~1500");

      applyMoveMock.mockReturnValueOnce({
        nextFen: NEXT_PUZZLE.fen,
        uci: "e2e4",
      });
      act(() => {
        capturedProps.onMove?.("e2", "e4");
      });

      await screen.findByText("✅ Correct!");
      expect(api.post).toHaveBeenCalledWith("/puzzles/p1/attempts", {
        moveUci: "e2e4",
        moveIndex: 0,
        usedHint: false,
      });
    });
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `docker compose exec react npx vitest run src/pages/Puzzles.test.tsx -t "usedHint"`
Expected: FAIL — actual `api.post` body has no `usedHint` key, so `toHaveBeenCalledWith` mismatches. Also, the pre-existing exact-match test at line 273-276 (`b8c6`/`moveIndex: 1` with no `usedHint`) will start failing once Step 3 below ships — note it now for Step 5.

- [ ] **Step 3: Track hint usage and include it in the attempt body**

In `frontend/react/src/pages/Puzzles.tsx`, add a ref next to `moveIndexRef` (near line 88-95):

```typescript
  // Sticky per-puzzle: true once the hint button has been clicked anywhere
  // in this puzzle's move sequence, sent on every attempt so the backend can
  // persist it even though intermediate correct moves never touch the DB.
  const usedHintRef = useRef(false);
```

Reset it in `loadNext` alongside the other per-puzzle resets (near line 109, next to `setHintLevel(-1)`):

```typescript
      setHintLevel(-1);
      usedHintRef.current = false;
```

Set it to `true` in the hint button's `onClick` (currently lines 362-365):

```typescript
                  onClick={() => {
                    if (!puzzleId || isSubmitting || puzzleComplete) return;
                    usedHintRef.current = true;
                    setHintLevel((h) => (h < 0 ? 0 : 1));
                  }}
```

Include it in the `submit` request body (currently lines 172-175):

```typescript
        }>(`/puzzles/${puzzleId}/attempts`, {
          moveUci,
          moveIndex: moveIndexRef.current,
          usedHint: usedHintRef.current,
        });
```

- [ ] **Step 4: Run the new tests to verify they pass**

Run: `docker compose exec react npx vitest run src/pages/Puzzles.test.tsx -t "usedHint"`
Expected: PASS

- [ ] **Step 5: Fix the pre-existing exact-match assertion**

`Puzzles.test.tsx`'s "keeps the puzzle open after a correct-but-not-final move" test asserts (around line 273-276):

```typescript
    expect(api.post).toHaveBeenLastCalledWith("/puzzles/p1/attempts", {
      moveUci: "b8c6",
      moveIndex: 1,
    });
```

Update it to include the new field:

```typescript
    expect(api.post).toHaveBeenLastCalledWith("/puzzles/p1/attempts", {
      moveUci: "b8c6",
      moveIndex: 1,
      usedHint: false,
    });
```

- [ ] **Step 6: Run the full Puzzles test file**

Run: `docker compose exec react npx vitest run src/pages/Puzzles.test.tsx`
Expected: all PASS

- [ ] **Step 7: Commit**

```bash
git add frontend/react/src/pages/Puzzles.tsx frontend/react/src/pages/Puzzles.test.tsx
git commit -m "Send usedHint flag on puzzle attempt submission"
```

---

## Task 5: React — session-local puzzle history with prev/next navigation

**Files:**
- Modify: `frontend/react/src/pages/Puzzles.tsx` (full state model changes, see below)
- Test: `frontend/react/src/pages/Puzzles.test.tsx`

**Interfaces:**
- Consumes: `usedHintRef` (Task 4) — a completed history entry's `usedHint` field is read from this ref at the moment the puzzle finalizes.
- Produces: no new interface consumed by other tasks — this is the last frontend task in this plan.

**Design of the state change:**

Replace the single `puzzleId` (line 42-46) with a session history array. Each entry holds everything needed to redisplay a puzzle without a network call:

```typescript
type HistoryEntry = {
  puzzle: NextPuzzle;
  solved: boolean;
  usedHint: boolean;
  finalFen: string;       // board position to show when replaying read-only
  finalLastMoveUci: string;
};
```

- `history: HistoryEntry[]` — every puzzle fetched this session, in fetch order.
- `historyIndex: number` — which entry is currently displayed. `historyIndex === history.length - 1` means "viewing the live/current puzzle" (interactive, unless already solved and awaiting "Next"); any smaller index is a past entry, always read-only.
- The existing live-puzzle state (`fen`, `correctMoveUci`, `lastMoveUci`, `moveIndex`, `solverMovesTotal`, `rating`, `themes`, `puzzleComplete`, hint/wrong-attempt state) continues to represent **only** the entry at `history.length - 1`. When that entry finishes (solved or skipped), Step 3 pushes/updates its `HistoryEntry` in `history` before moving on.
- Viewing a past entry (`historyIndex < history.length - 1`) renders `entry.finalFen`/`entry.finalLastMoveUci` on the board with `interactive={false}` and hides the hint/skip buttons; a "Prev"/"Next" pair replaces them for navigating history.

- [ ] **Step 1: Write the failing tests**

Add to `frontend/react/src/pages/Puzzles.test.tsx` (a new `describe` block after the `Hint` block):

```typescript
  describe("Prev/next history navigation", () => {
    it("does not show Prev on the first puzzle", async () => {
      (api.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        data: NEXT_PUZZLE,
      });

      renderPuzzles();
      await screen.findByText("Rating ~1500");

      expect(
        screen.queryByRole("button", { name: /Previous puzzle/ }),
      ).not.toBeInTheDocument();
    });

    it("steps back to a solved puzzle read-only, then forward again without re-fetching", async () => {
      (api.get as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce({ data: NEXT_PUZZLE })
        .mockResolvedValueOnce({ data: { ...NEXT_PUZZLE, puzzleId: "p2", fen: "8/8/8/8/8/8/8/8 w - - 0 1" } });
      (api.post as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        data: {
          correct: true,
          reason: "",
          fenAfter: NEXT_PUZZLE.fen,
          puzzleComplete: true,
        },
      });

      renderPuzzles();
      await screen.findByText("Rating ~1500");

      applyMoveMock.mockReturnValueOnce({
        nextFen: NEXT_PUZZLE.fen,
        uci: "e2e4",
      });
      act(() => {
        capturedProps.onMove?.("e2", "e4");
      });
      await screen.findByText("✅ Correct!");

      const nextButton = await screen.findByRole("button", { name: /Next puzzle/ });
      await user.click(nextButton);
      await waitFor(() => expect(api.get).toHaveBeenCalledTimes(2));

      // Now viewing puzzle 2 (the live, unsolved puzzle) — Prev should be available.
      const prevButton = screen.getByRole("button", { name: /Previous puzzle/ });
      await user.click(prevButton);

      // Back on puzzle 1's solved position, read-only: board is not interactive.
      expect(capturedProps.position).toBe(NEXT_PUZZLE.fen);
      expect(capturedProps.interactive).toBe(false);
      expect(
        screen.queryByRole("button", { name: /hint/i }),
      ).not.toBeInTheDocument();

      // Stepping forward again must not hit the API a third time.
      const forwardButton = screen.getByRole("button", { name: /Next puzzle/ });
      await user.click(forwardButton);
      expect(api.get).toHaveBeenCalledTimes(2);
      expect(capturedProps.position).toBe("8/8/8/8/8/8/8/8 w - - 0 1");
    });

    it("fetching a new puzzle from the frontier still calls the API as before", async () => {
      (api.get as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce({ data: NEXT_PUZZLE })
        .mockResolvedValueOnce({ data: { ...NEXT_PUZZLE, puzzleId: "p2" } });
      (api.post as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        data: {
          correct: true,
          reason: "",
          fenAfter: NEXT_PUZZLE.fen,
          puzzleComplete: true,
        },
      });

      renderPuzzles();
      await screen.findByText("Rating ~1500");

      applyMoveMock.mockReturnValueOnce({
        nextFen: NEXT_PUZZLE.fen,
        uci: "e2e4",
      });
      act(() => {
        capturedProps.onMove?.("e2", "e4");
      });
      const nextButton = await screen.findByRole("button", { name: /Next puzzle/ });

      await user.click(nextButton);
      await waitFor(() => expect(api.get).toHaveBeenCalledTimes(2));
      expect(api.get).toHaveBeenNthCalledWith(2, "/puzzles/next", {
        params: { excludeId: "p1" },
      });
    });
  });
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `docker compose exec react npx vitest run src/pages/Puzzles.test.tsx -t "Prev/next history"`
Expected: FAIL — no "Previous puzzle" button exists yet.

- [ ] **Step 3: Implement the history array and pointer**

In `frontend/react/src/pages/Puzzles.tsx`, replace the `puzzleId` state block (lines 42-46) with:

```typescript
  type HistoryEntry = {
    puzzle: NextPuzzle;
    solved: boolean;
    usedHint: boolean;
    finalFen: string;
    finalLastMoveUci: string;
  };

  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const historyRef = useRef(history);
  useEffect(() => {
    historyRef.current = history;
  }, [history]);
  const historyIndexRef = useRef(historyIndex);
  useEffect(() => {
    historyIndexRef.current = historyIndex;
  }, [historyIndex]);

  const atFrontier = historyIndex === history.length - 1;
  const viewingPast = !atFrontier && historyIndex >= 0;
  const currentEntry = viewingPast ? history[historyIndex] : null;

  const puzzleId = atFrontier ? (history[historyIndex]?.puzzle.puzzleId ?? null) : null;
  const puzzleIdRef = useRef(puzzleId);
  useEffect(() => {
    puzzleIdRef.current = puzzleId;
  }, [puzzleId]);
```

Note: `puzzleId` becomes `null` while `viewingPast` is true, which already disables board interactivity, the hint/skip buttons, and `submit`/`onMove` (all gated on `!!puzzleId` today) — no changes needed to those guards.

- [ ] **Step 4: Push a new entry when a puzzle is fetched**

In `loadNext` (lines 105-151), after `setThemes(res.data.themes ?? null)` (around line 126), append the freshly-fetched puzzle to history and move the pointer to it:

```typescript
      setHistory((prev) => [
        ...prev,
        {
          puzzle: res.data,
          solved: false,
          usedHint: false,
          finalFen: res.data.fen,
          finalLastMoveUci: res.data.lastMoveUci,
        },
      ]);
      setHistoryIndex((prev) => prev + 1);
```

`loadNext`'s existing `params` block (lines 113-116) already uses `puzzleIdRef.current` as `excludeId`, which now only has a value at the frontier — this is correct, since `excludeId` should be the last-fetched puzzle, not whatever past entry might be displayed.

- [ ] **Step 5: Finalize the history entry when a puzzle is solved**

In `submit` (lines 160-219), where `puzzleComplete` is set true on a correct final move (around line 188), update the entry at the frontier in place. `submit`'s own `moveUci` parameter is exactly the solver's final move (the board doesn't auto-play anything after the last correct move), so use it directly rather than reading it back off state:

```typescript
          setPuzzleComplete(true);
          setHistory((prev) => {
            const next = [...prev];
            const idx = next.length - 1;
            next[idx] = {
              ...next[idx],
              solved: true,
              usedHint: usedHintRef.current,
              finalFen: fenRef.current,
              finalLastMoveUci: moveUci,
            };
            return next;
          });
```

- [ ] **Step 6: Add Prev/Next navigation controls and read-only rendering**

Add navigation callbacks near `skip`/`next` (lines 221-229):

```typescript
  const goToPrev = useCallback(() => {
    setHistoryIndex((idx) => Math.max(0, idx - 1));
  }, []);

  const goToNext = useCallback(() => {
    if (historyIndexRef.current < historyRef.current.length - 1) {
      setHistoryIndex((idx) => idx + 1);
    } else {
      void loadNext();
    }
  }, [loadNext]);
```

Replace the existing `next` callback's only call site — the "Next puzzle" button (lines 445-454) — to use `goToNext` instead of `next`, and remove the now-unused `next` callback (lines 227-229). The button becomes:

```typescript
            {((puzzleId && puzzleComplete) || viewingPast) && (
              <button
                ref={nextButtonRef}
                type="button"
                className="puzzles-next"
                onClick={goToNext}
              >
                {t("puzzles.nextPuzzle")}
              </button>
            )}
```

Add a "Prev" button in the board toolbar (lines 356-385), alongside the flip/hint/skip buttons:

```typescript
                {historyIndex > 0 && (
                  <Button
                    type="button"
                    variant="secondary"
                    className="icon-btn"
                    onClick={goToPrev}
                    aria-label={t("puzzles.previousPuzzle")}
                    title={t("puzzles.previousPuzzle")}
                  >
                    <span aria-hidden="true">⏮</span>
                  </Button>
                )}
```

Add the translation key `puzzles.previousPuzzle` ("Previous puzzle") next to the existing `puzzles.skipPuzzle`/`puzzles.nextPuzzle` keys in the shared locale JSON (`frontend/packages/i18n-locales/locales/en-US.json` — locate the `puzzles` block and add `"previousPuzzle": "Previous puzzle"` alongside the existing keys).

- [ ] **Step 7: Route the board's displayed position through history when viewing the past**

Update the `<Board>` props (lines 337-347) to source from `currentEntry` when `viewingPast`:

```typescript
              <Board
                position={viewingPast ? currentEntry!.finalFen : fen}
                orientation={orientation}
                interactive={!viewingPast && !!puzzleId && !isSubmitting && !puzzleComplete}
                moveColor={solverColor === "b" ? "black" : "white"}
                markers={markers}
                arrows={hintArrows}
                onMoveStart={canPickUp}
                getLegalMoves={getLegalMoves}
                onMove={onMove}
              />
```

Update the `markers` memo (lines 291-303) to use the past entry's `finalLastMoveUci` when viewing the past, and suppress hint markers entirely in that mode (a past puzzle is already solved, hints are meaningless):

```typescript
  const markers = useMemo((): BoardMarker[] => {
    const arr: BoardMarker[] = [];
    const lastMove = viewingPast ? currentEntry?.finalLastMoveUci : lastMoveUci;
    if (lastMove && lastMove.length >= 4) {
      arr.push({ square: lastMove.slice(0, 2), type: "lastmove" });
      arr.push({ square: lastMove.slice(2, 4), type: "lastmove" });
    }
    if (viewingPast) return arr;
    const hint = deriveHintMarkers(correctMoveUci, effectiveHintLevel, puzzleComplete);
    if (hint) {
      arr.push({ square: hint.from, type: "hint" });
      if (hint.to) arr.push({ square: hint.to, type: "hint" });
    }
    return arr;
  }, [viewingPast, currentEntry, lastMoveUci, correctMoveUci, effectiveHintLevel, puzzleComplete]);
```

Hide the hint and skip buttons while `viewingPast` (they're already gated on `puzzleId`/`puzzleComplete`, both of which are falsy/irrelevant while viewing the past since `puzzleId` is `null` per Step 3 — verify no extra guard is needed, since `!puzzleId` already disables the hint button via its `disabled` prop and hides skip via its `puzzleId &&` condition).

- [ ] **Step 8: Run the new tests to verify they pass**

Run: `docker compose exec react npx vitest run src/pages/Puzzles.test.tsx -t "Prev/next history"`
Expected: PASS

- [ ] **Step 9: Run the full Puzzles test file for regressions**

Run: `docker compose exec react npx vitest run src/pages/Puzzles.test.tsx`
Expected: all PASS. Pay particular attention to the "advances to the next puzzle only when the Next puzzle button is clicked" test (uses `next`, now `goToNext`, at the frontier) and the hint tests (must still work when `history.length === 1`, i.e. `historyIndex === 0 === history.length - 1`, so `atFrontier` is true and behavior is unchanged from before this task).

- [ ] **Step 10: Add the missing translation key to other locale files**

Run: `docker compose exec react node -e "console.log('check locales')"` is not needed — instead grep for where `puzzles.skipPuzzle` is defined across locales to find every file needing the new key:

Run: `grep -rl "skipPuzzle" frontend/packages/i18n-locales/locales/`

For each file found, add `"previousPuzzle": "Previous puzzle"` next to `"skipPuzzle"` using the same English fallback text in every locale (translation is a separate concern, not blocking this feature — matches how new keys have been introduced before in this codebase, e.g. `nextPuzzle`).

- [ ] **Step 11: Run eslint and the full frontend test suite**

Run: `docker compose exec react npx eslint src/pages/Puzzles.tsx`
Run: `docker compose exec react npx vitest run`
Expected: no lint errors, all tests PASS

- [ ] **Step 12: Manually verify in the browser**

Use the `run-react` skill (or `docker compose up`) to load `/puzzles`, solve a puzzle, click "Next puzzle" to fetch a second one, click the new "Prev" (⏮) button to confirm it shows the first puzzle's solved position with no interactive board and no hint/skip buttons, then click "Next puzzle" again to confirm it returns to the second (live) puzzle without an extra network request (check the browser Network tab).

- [ ] **Step 13: Commit**

```bash
git add frontend/react/src/pages/Puzzles.tsx frontend/react/src/pages/Puzzles.test.tsx frontend/packages/i18n-locales/locales/
git commit -m "Add session-local prev/next puzzle history navigation"
```

---

## Task 6: Log Angular parity gap

**Files:**
- Modify: `frontend/angular/PARITY_GAPS.md` (append new section before "## Suggested backport order", currently line 236)

**Interfaces:** none (documentation only).

- [ ] **Step 1: Add the new section**

In `frontend/angular/PARITY_GAPS.md`, insert immediately before the `## Suggested backport order` heading:

```markdown
## 11. Puzzle prev/next navigation + hint tracking (new gap)

**Status: not started.** React's Puzzles page (`frontend/react/src/pages/Puzzles.tsx`) gained
session-local prev/next stepping through puzzles already fetched this session (read-only replay
when stepping back — see `docs/superpowers/specs/2026-09-04-puzzle-prev-next-navigation-design.md`),
plus a `usedHint` flag sent on attempt submission so the backend can persist whether a hint was
used solving a puzzle (`PuzzleProgress.hint_used`). Angular's `puzzles.component.ts` still only
tracks a single current puzzle id and has no hint-usage tracking or prev/next controls at all.
This compounds with the already-flagged §10 structural gap on the same page.

**To port:** mirror the `HistoryEntry[]`/`historyIndex` state model and the Prev/Next buttons from
`Puzzles.tsx`, and send `usedHint` on `POST /puzzles/{id}/attempts` from `puzzles.component.ts`'s
attempt submission (the backend endpoint already accepts it as of the React implementation).
```

- [ ] **Step 2: Commit**

```bash
git add frontend/angular/PARITY_GAPS.md
git commit -m "Log Angular parity gap for puzzle prev/next navigation"
```

---

## Task 7: Update ROADMAP.md and CHANGELOG.md

**Files:**
- Modify: `ROADMAP.md` (remove the now-implemented "Prev/next puzzle navigation" entry added under "🏗️ Next up")
- Modify: `CHANGELOG.md` (add an entry for this feature, following the file's existing format)

**Interfaces:** none (documentation only).

- [ ] **Step 1: Remove the ROADMAP entry**

In `ROADMAP.md`, delete the "🏗️ Next up" section and its "Prev/next puzzle navigation" bullet (the block added in the working-tree diff this plan implements), since the feature is now shipped.

- [ ] **Step 2: Add a CHANGELOG entry**

Read the top of `CHANGELOG.md` to match its existing entry format (heading style, date format), then add an entry summarizing: puzzle history/hint tracking (`PuzzleProgress.hint_used`), theme-mode no longer re-serves solved puzzles, and React's session-local prev/next puzzle navigation with read-only replay.

- [ ] **Step 3: Commit**

```bash
git add ROADMAP.md CHANGELOG.md
git commit -m "Update docs for puzzle prev/next navigation"
```
