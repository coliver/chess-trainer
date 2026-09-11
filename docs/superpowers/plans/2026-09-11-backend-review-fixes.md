# Backend Review Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the nine issues (three security, two correctness/efficiency, two
dependency, two style) found in a manual audit of `backend/app/`, security
first, each as an independently reviewable and revertable task with its own
tests.

**Architecture:** No new services or architectural changes. Two small
additions (a module-level dummy-hash constant, a shared `slowapi` `Limiter`)
plus surgical edits to existing files. Every fix keeps existing response
shapes, status codes, and the training-session 404-not-leak pattern intact.

**Tech Stack:** FastAPI + SQLAlchemy (backend), PyJWT, `slowapi` (new, for
rate limiting), pytest + `fastapi.testclient.TestClient` (tests), all run via
`docker compose exec api ...` — never a host venv.

**Spec:** [docs/superpowers/specs/2026-09-11-backend-review-fixes-design.md](../specs/2026-09-11-backend-review-fixes-design.md)

## Global Constraints

- Docker-only: every test/lint/pip command in this plan runs inside the
  `api` container via `docker compose exec api ...` (start it first with
  `docker compose up -d db api` if it isn't running).
- Training-session and training-item lookups must keep returning `404
  Training session not found` / `404 Training item not found` for a
  mismatched or missing token/owner — never leak another user's data. Task 4
  must not change this.
- `backend/app/modules/training/chess_rules.py:validate_and_apply()`'s
  contract (exact `reason`/status values asserted by
  `tests/test_routers_training.py` and `tests/test_training_service.py`) is
  untouched by every task in this plan.
- No new tables, no new migrations — none of these nine fixes touch the
  schema.
- Existing tests keep passing after every task; each task's own steps
  include running the full suite, not just the new test.
- Match existing code style: no comments beyond what's specified, no
  unrelated cleanup.

---

## Task 1: Fix login timing side-channel

**Files:**
- Modify: `backend/app/routers/auth.py:27-37` (add dummy-hash constant near
  `hash_password`/`verify_password`), `backend/app/routers/auth.py:88-104`
  (`login`)
- Test: `tests/test_auth_login_verification.py` (extends existing file)

**Interfaces:**
- Produces: no new public symbols; `login`'s behavior when `user is None`
  now calls `verify_password` before raising, so response time stops
  correlating with account existence.

- [ ] **Step 1: Write the failing test**

Add to `tests/test_auth_login_verification.py`:

```python
from unittest.mock import patch

from backend.app.routers import auth as auth_module


def test_login_with_nonexistent_user_still_verifies_password():
    with patch(
        "backend.app.routers.auth.verify_password",
        wraps=auth_module.verify_password,
    ) as spy:
        response = client.post(
            "/auth/login",
            json={"username": "no-such-user", "password": "whatever"},
        )

    assert response.status_code == 401
    assert response.json()["detail"] == "Invalid credentials"
    spy.assert_called_once()
```

- [ ] **Step 2: Run test to verify it fails**

Run: `docker compose exec api pytest tests/test_auth_login_verification.py::test_login_with_nonexistent_user_still_verifies_password -v`
Expected: FAIL — `spy.assert_called_once()` raises `AssertionError: Expected 'verify_password' to have been called once. Called 0 times.`

- [ ] **Step 3: Add the dummy-hash constant and use it in `login`**

In `backend/app/routers/auth.py`, right after the `verify_password`
function definition (currently ending at line 37):

```python
_DUMMY_PASSWORD_HASH = hash_password("dummy-password-for-timing")
```

Then change `login` (currently lines 88-104):

```python
@router.post("/login")
def login(req: LoginRequest, db=Depends(get_db)):
    if not req.email and not req.username:
        raise HTTPException(status_code=400, detail="Provide email or username")

    q = db.query(User)
    user = None
    if req.email:
        user = q.filter(User.email == req.email).first()
    else:
        user = q.filter(User.username == req.username).first()

    if user is None:
        verify_password(req.password, _DUMMY_PASSWORD_HASH)
        raise HTTPException(status_code=401, detail="Invalid credentials")

    if not verify_password(req.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")
```

(The rest of `login` — email-verification check, token issuance, return
value — is unchanged.)

- [ ] **Step 4: Run test to verify it passes**

Run: `docker compose exec api pytest tests/test_auth_login_verification.py -v`
Expected: PASS (both the new test and the two existing ones in that file)

- [ ] **Step 5: Run the full suite**

Run: `docker compose exec api pytest`
Expected: all tests pass (no regressions in other auth tests)

- [ ] **Step 6: Commit**

```bash
git add backend/app/routers/auth.py tests/test_auth_login_verification.py
git commit -m "fix(auth): close login timing side-channel for unknown users"
```

---

## Task 2: Rate-limit `/auth/login`, `/auth/register`, `/auth/resend-verification`

**Files:**
- Create: `backend/app/modules/shared/rate_limit.py`
- Modify: `backend/app/app.py` (register limiter + exception handler),
  `backend/app/routers/auth.py` (decorate the three routes),
  `requirements.txt` (add `slowapi`)
- Modify: `tests/conftest.py` (autouse fixture to reset the limiter between
  tests)
- Test: `tests/test_auth_rate_limit.py` (new file)

**Interfaces:**
- Produces: `backend.app.modules.shared.rate_limit.limiter` (a
  `slowapi.Limiter` instance), imported by `app.py` and `routers/auth.py`.

- [ ] **Step 1: Add the dependency**

Add to `requirements.txt`, after the `pyjwt` line:

```
slowapi
```

- [ ] **Step 2: Rebuild the api image so slowapi is installed**

Run: `docker compose build api && docker compose up -d db api`

- [ ] **Step 3: Create the shared limiter module**

Create `backend/app/modules/shared/rate_limit.py`:

```python
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)
```

- [ ] **Step 4: Register the limiter on the app**

In `backend/app/app.py`, add to the imports (near the other
`backend.app.modules.shared` imports):

```python
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from backend.app.modules.shared.rate_limit import limiter
```

Then, right after `app = FastAPI(title="Knight School")`:

```python
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
```

- [ ] **Step 5: Apply the limit to the three routes**

In `backend/app/routers/auth.py`, add to the imports:

```python
from fastapi import Request

from backend.app.modules.shared.rate_limit import limiter
```

Decorate `register`, `login`, and `resend_verification`. Each route
function needs a `request: Request` parameter for `slowapi` to key on the
client IP. For example, `register` (currently `def register(req:
RegisterRequest, background_tasks: BackgroundTasks, db=Depends(get_db)):`)
becomes:

```python
@router.post("/register")
@limiter.limit("5/minute")
def register(
    request: Request,
    req: RegisterRequest,
    background_tasks: BackgroundTasks,
    db=Depends(get_db),
):
```

`login` becomes:

```python
@router.post("/login")
@limiter.limit("5/minute")
def login(request: Request, req: LoginRequest, db=Depends(get_db)):
```

`resend_verification` becomes:

```python
@router.post("/resend-verification")
@limiter.limit("5/minute")
def resend_verification(
    request: Request,
    req: ResendVerificationRequest,
    background_tasks: BackgroundTasks,
    db=Depends(get_db),
):
```

(Function bodies are unchanged — only the signature gains `request: Request`
and the decorator stack gains `@limiter.limit("5/minute")` directly above
the `def`.)

- [ ] **Step 6: Reset the limiter between tests**

Add to `tests/conftest.py`, alongside the other autouse fixtures:

```python
from backend.app.modules.shared.rate_limit import limiter


@pytest.fixture(autouse=True)
def reset_rate_limiter():
    limiter.reset()
    yield
```

- [ ] **Step 7: Write the failing test**

Create `tests/test_auth_rate_limit.py`:

```python
from fastapi.testclient import TestClient

from backend.app.app import app

client = TestClient(app)


def test_login_rate_limited_after_too_many_attempts(test_user):
    for _ in range(5):
        response = client.post(
            "/auth/login",
            json={"username": test_user.username, "password": "wrong"},
        )
        assert response.status_code == 401

    response = client.post(
        "/auth/login",
        json={"username": test_user.username, "password": "wrong"},
    )
    assert response.status_code == 429
```

- [ ] **Step 8: Run test to verify it fails**

Run: `docker compose exec api pytest tests/test_auth_rate_limit.py -v`
Expected: FAIL — the 6th request returns `401`, not `429` (no limiter
applied yet if Steps 3-6 weren't done first; if they were, re-check Step 5's
decorator placement).

- [ ] **Step 9: Run test to verify it passes**

Run: `docker compose exec api pytest tests/test_auth_rate_limit.py -v`
Expected: PASS

- [ ] **Step 10: Run the full suite**

Run: `docker compose exec api pytest`
Expected: all tests pass — the `reset_rate_limiter` autouse fixture from
Step 6 must prevent this new test's rate-limit hits from leaking into other
auth tests (e.g. `tests/test_auth_login_verification.py`,
`tests/test_auth_register.py`). If any unrelated test now fails with `429`,
the fixture isn't resetting correctly — check it's registered as `autouse`
and imports the same `limiter` instance used by the app.

- [ ] **Step 11: Commit**

```bash
git add requirements.txt backend/app/app.py backend/app/routers/auth.py \
  backend/app/modules/shared/rate_limit.py tests/conftest.py \
  tests/test_auth_rate_limit.py
git commit -m "feat(auth): rate-limit login/register/resend-verification"
```

---

## Task 3: `verify_password` fails closed on malformed input

**Files:**
- Modify: `backend/app/routers/auth.py:33-37`
- Test: `tests/test_auth_login_verification.py` (extends existing file)

**Interfaces:**
- Consumes: nothing new.
- Produces: `verify_password` now returns `False` instead of raising for a
  malformed `password_hash`.

- [ ] **Step 1: Write the failing test**

Add to `tests/test_auth_login_verification.py`:

```python
from backend.app.routers.auth import verify_password


def test_verify_password_returns_false_for_malformed_hash():
    assert verify_password("anything", "not-valid-base64!!") is False
```

- [ ] **Step 2: Run test to verify it fails**

Run: `docker compose exec api pytest tests/test_auth_login_verification.py::test_verify_password_returns_false_for_malformed_hash -v`
Expected: FAIL with a `binascii.Error` (or similar decode exception)
propagating out of `verify_password`, not an assertion failure.

- [ ] **Step 3: Make `verify_password` fail closed**

Replace `backend/app/routers/auth.py:33-37`:

```python
def verify_password(password: str, password_hash: str) -> bool:
    try:
        raw = base64.b64decode(password_hash.encode("ascii"))
        salt, dk_stored = raw[:16], raw[16:]
        dk = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, 200_000)
        return hmac.compare_digest(dk, dk_stored)
    except (ValueError, TypeError):
        return False
```

- [ ] **Step 4: Run test to verify it passes**

Run: `docker compose exec api pytest tests/test_auth_login_verification.py -v`
Expected: PASS (all tests in the file, including the two from Task 1)

- [ ] **Step 5: Run the full suite**

Run: `docker compose exec api pytest`
Expected: all tests pass

- [ ] **Step 6: Commit**

```bash
git add backend/app/routers/auth.py tests/test_auth_login_verification.py
git commit -m "fix(auth): verify_password fails closed on malformed hash"
```

---

## Task 4: Batch the per-item "has correct response" query

**Files:**
- Modify: `backend/app/modules/training/service.py` (`get_current_training_item`
  at lines 193-210, `submit_training_response`'s `all_responded` block at
  lines 314-324)
- Test: `tests/test_training_service.py` (extends existing file — updates the
  `FakeDB` test double and several existing tests' setup, per Step 3)

**Interfaces:**
- Produces: `_correct_response_item_ids(db: Session, item_ids: list[int]) ->
  set[int]`, a private helper in `backend/app/modules/training/service.py`,
  used by both call sites below.

- [ ] **Step 1: Update `FakeDB` to dispatch `scalars()` by query entity**

In `tests/test_training_service.py`, `FakeDB.__init__` currently takes
`get_return`, `scalars_all`, `training_item_count_side_effects`,
`training_response_first_side_effects`. Add one more parameter and rewrite
`scalars()` to distinguish a `TrainingItem` select (existing behavior) from
a `TrainingResponse.item_id` select (new behavior), since after this task
both kinds of `db.scalars(select(...))` calls can happen in the same test:

```python
    def __init__(
        self,
        *,
        get_return=None,
        scalars_all=None,
        training_item_count_side_effects=None,
        training_response_first_side_effects=None,
        correct_response_item_ids_side_effects=None,
    ):
        self._get_return = get_return
        self._scalars_all = scalars_all or []

        self._training_item_count_side_effects = (
            list(training_item_count_side_effects)
            if training_item_count_side_effects is not None
            else []
        )
        self._training_response_first_side_effects = (
            list(training_response_first_side_effects)
            if training_response_first_side_effects is not None
            else []
        )
        self._correct_response_item_ids_side_effects = (
            list(correct_response_item_ids_side_effects)
            if correct_response_item_ids_side_effects is not None
            else []
        )

        self._training_item_count_iter = iter(self._training_item_count_side_effects)
        self._training_response_first_iter = iter(self._training_response_first_side_effects)
        self._correct_response_item_ids_iter = iter(self._correct_response_item_ids_side_effects)

        self.add_calls = 0
        self.added = []
        self.flush_calls = 0
        self.commit_calls = 0

    def get(self, *args, **kwargs):
        return self._get_return

    def scalars(self, stmt, *args, **kwargs):
        entity = stmt.column_descriptions[0]["entity"]
        if entity is TrainingItem:
            return FakeScalars(self._scalars_all)
        if entity is TrainingResponse:
            try:
                return FakeScalars(sorted(next(self._correct_response_item_ids_iter)))
            except StopIteration:
                raise AssertionError(
                    "scalars() called for TrainingResponse more times than "
                    "correct_response_item_ids_side_effects configured"
                )
        raise AssertionError(f"Unexpected scalars() query for entity {entity}")
```

(Only `__init__` and `scalars` change; `query`, `add`, `flush`, `commit`
stay exactly as they are.)

- [ ] **Step 2: Run the existing suite to confirm the double still works for untouched tests**

Run: `docker compose exec api pytest tests/test_training_service.py -v`
Expected: several FAILs — the tests that exercise the real (non-monkeypatched)
`get_current_training_item` or the real `all_responded` loop now break,
because `scalars()`'s new signature/dispatch doesn't match their old
`training_response_first_side_effects`-only setup. This is expected; Step 3
fixes each one. Tests that monkeypatch `get_current_training_item` away
entirely and never reach the `all_responded` code path (e.g.
`test_submit_training_response_item_id_mismatch_returns_404`,
`test_submit_training_response_current_none_all_items_responded_returns_completed`,
`test_submit_training_response_current_none_not_all_items_responded_returns_item_not_found`,
`test_submit_training_response_session_not_found`,
`test_create_training_items_*`) should still pass unchanged.

- [ ] **Step 3: Update the affected tests' `FakeDB` setup**

In `test_submit_training_response_correct_creates_training_response_and_commits`
(around line 217), change:

```python
    db = FakeDB(
        get_return=session,
        scalars_all=all_items,
        training_item_count_side_effects=[len(all_items), len(all_items)],
        training_response_first_side_effects=[None, object(), object()],
    )
```

to:

```python
    db = FakeDB(
        get_return=session,
        scalars_all=all_items,
        training_item_count_side_effects=[len(all_items), len(all_items)],
        training_response_first_side_effects=[None],
        correct_response_item_ids_side_effects=[{10, 11}],
    )
```

In `test_submit_training_response_marks_session_completed_when_all_correct`
(around line 265), change:

```python
    db = FakeDB(
        get_return=session,
        scalars_all=all_items,
        training_item_count_side_effects=[len(all_items), len(all_items)],
        training_response_first_side_effects=[
            None,  # existing response for current item (item1) -> add new
            object(),  # all_responded check for item1 -> is not None
            object(),  # all_responded check for item2 -> is not None
        ],
    )
```

to:

```python
    db = FakeDB(
        get_return=session,
        scalars_all=all_items,
        training_item_count_side_effects=[len(all_items), len(all_items)],
        training_response_first_side_effects=[None],
        correct_response_item_ids_side_effects=[{1, 2}],
    )
```

In `test_submit_training_response_updates_existing_response_instead_of_creating`
(around line 324), change:

```python
    db = FakeDB(
        # keep, but we'll override db.get below to return correct objects
        get_return=session,
        scalars_all=all_items,
        training_item_count_side_effects=[len(all_items), len(all_items)],
        training_response_first_side_effects=[existing_response, None],
    )
```

to:

```python
    db = FakeDB(
        # keep, but we'll override db.get below to return correct objects
        get_return=session,
        scalars_all=all_items,
        training_item_count_side_effects=[len(all_items), len(all_items)],
        training_response_first_side_effects=[existing_response],
        correct_response_item_ids_side_effects=[set()],
    )
```

In `test_submit_training_response_uses_item_opening_over_session_for_record_attempt`
(around line 711), change:

```python
    db = FakeDB(
        get_return=session,
        scalars_all=all_items,
        training_item_count_side_effects=[len(all_items), len(all_items)],
        training_response_first_side_effects=[None, object()],
    )
```

to:

```python
    db = FakeDB(
        get_return=session,
        scalars_all=all_items,
        training_item_count_side_effects=[len(all_items), len(all_items)],
        training_response_first_side_effects=[None],
        correct_response_item_ids_side_effects=[{10}],
    )
```

In `test_submit_training_response_falls_back_to_session_opening_when_item_has_none`
(around line 769), make the identical change (same fixture shape, `current`
is also `id=10`):

```python
    db = FakeDB(
        get_return=session,
        scalars_all=all_items,
        training_item_count_side_effects=[len(all_items), len(all_items)],
        training_response_first_side_effects=[None],
        correct_response_item_ids_side_effects=[{10}],
    )
```

In `test_get_current_training_item_returns_first_incorrect_item` (around
line 461), change:

```python
def test_get_current_training_item_returns_first_incorrect_item():
    item1 = SimpleNamespace(id=1)
    item2 = SimpleNamespace(id=2)
    all_items = [item1, item2]

    db = FakeDB(training_response_first_side_effects=[None])

    out = service.get_current_training_item(db=db, training_session=None, all_items=all_items)
    assert out is item1
```

to:

```python
def test_get_current_training_item_returns_first_incorrect_item():
    item1 = SimpleNamespace(id=1)
    item2 = SimpleNamespace(id=2)
    all_items = [item1, item2]

    db = FakeDB(correct_response_item_ids_side_effects=[set()])

    out = service.get_current_training_item(db=db, training_session=None, all_items=all_items)
    assert out is item1
```

In `test_get_current_training_item_returns_none_when_all_items_correct`
(around line 472), change:

```python
def test_get_current_training_item_returns_none_when_all_items_correct():
    item1 = SimpleNamespace(id=1)
    item2 = SimpleNamespace(id=2)
    all_items = [item1, item2]

    db = FakeDB(training_response_first_side_effects=[object(), object()])

    out = service.get_current_training_item(db=db, training_session=None, all_items=all_items)
    assert out is None
```

to:

```python
def test_get_current_training_item_returns_none_when_all_items_correct():
    item1 = SimpleNamespace(id=1)
    item2 = SimpleNamespace(id=2)
    all_items = [item1, item2]

    db = FakeDB(correct_response_item_ids_side_effects=[{1, 2}])

    out = service.get_current_training_item(db=db, training_session=None, all_items=all_items)
    assert out is None
```

`test_get_current_training_item_empty_all_items_returns_none` needs no
change — `all_items=[]` returns early before any query.

- [ ] **Step 4: Run test to verify it still fails (implementation not yet changed)**

Run: `docker compose exec api pytest tests/test_training_service.py -v`
Expected: the tests updated in Step 3 now FAIL differently — with
`AssertionError: Unexpected scalars() query for entity <class
'backend.app.modules.training.models.TrainingItem'>` or similar, because
`get_current_training_item` and `submit_training_response` still run the old
per-item `.query(TrainingResponse)...first()` loop, which doesn't call
`scalars()` at all for that part, so the configured
`correct_response_item_ids_side_effects` are never consumed and the old
`training_response_first_side_effects` list is now too short for the loop
that still expects one entry per item. (Exact error varies by test; the
point is they fail until Step 5 lands.)

- [ ] **Step 5: Implement the batched helper**

In `backend/app/modules/training/service.py`, add the helper right before
`get_current_training_item` (currently at line 193):

```python
def _correct_response_item_ids(db: Session, item_ids: list[int]) -> set[int]:
    if not item_ids:
        return set()
    rows = db.scalars(
        select(TrainingResponse.item_id).where(
            TrainingResponse.item_id.in_(item_ids),
            TrainingResponse.is_correct.is_(True),
        )
    ).all()
    return set(rows)
```

Replace `get_current_training_item` (currently lines 193-210):

```python
def get_current_training_item(db, training_session, all_items):
    if not all_items:
        return None

    correct_ids = _correct_response_item_ids(db, [item.id for item in all_items])
    for item in all_items:
        if item.id not in correct_ids:
            return item

    return None
```

Replace the `all_responded` block inside `submit_training_response`
(currently lines 314-324):

```python
    correct_ids = _correct_response_item_ids(db, [it.id for it in all_items])
    session_completed = all(it.id in correct_ids for it in all_items)
```

- [ ] **Step 6: Run test to verify it passes**

Run: `docker compose exec api pytest tests/test_training_service.py -v`
Expected: PASS (all tests in the file)

- [ ] **Step 7: Run the full suite**

Run: `docker compose exec api pytest`
Expected: all tests pass, including the real-DB integration tests in
`tests/test_routers_training.py`, `tests/test_training_404.py`,
`tests/test_training_next_completed.py` (unaffected by this refactor since
they exercise the real Postgres session, and the observable behavior of
`get_current_training_item`/`submit_training_response` is unchanged).

- [ ] **Step 8: Commit**

```bash
git add backend/app/modules/training/service.py tests/test_training_service.py
git commit -m "perf(training): batch per-item correct-response lookups into one query"
```

---

## Task 5: Surface `record_attempt` failures to Sentry

**Files:**
- Modify: `backend/app/modules/training/service.py:294-312`
- Test: `tests/test_training_service.py` (extends existing file)

**Interfaces:**
- Consumes: `sentry_sdk.capture_exception()` (already a project dependency,
  see `backend/app/app.py:4`).

- [ ] **Step 1: Write the failing test**

Add to `tests/test_training_service.py`, near
`test_submit_training_response_uses_item_opening_over_session_for_record_attempt`:

```python
def test_submit_training_response_reports_record_attempt_failure_to_sentry(monkeypatch):
    session = SimpleNamespace(id=123, status="active", user_id=1)
    current = SimpleNamespace(
        id=10, fen="fen_before", correct_move_uci="e2e4", session_id=123,
        opening_eco=None, opening_name=None,
    )
    all_items = [current]

    db = FakeDB(
        get_return=session,
        scalars_all=all_items,
        training_item_count_side_effects=[len(all_items), len(all_items)],
        training_response_first_side_effects=[None],
        correct_response_item_ids_side_effects=[{10}],
    )
    monkeypatch.setattr(db, "begin_nested", lambda: contextlib.nullcontext(), raising=False)

    def get_side_effect(model_cls, pk):
        if model_cls is TrainingSession:
            return session
        if model_cls is TrainingItem and pk == 10:
            return current
        return None

    monkeypatch.setattr(db, "get", get_side_effect)
    monkeypatch.setattr(service, "get_current_training_item", lambda *a, **k: current)

    result = SimpleNamespace(
        correct=True, reason="Correct", fen_after="fen_after", http_status=200, error_message=None
    )
    monkeypatch.setattr(service, "validate_and_apply", lambda *a, **k: result)

    def failing_record_attempt(db, **kwargs):
        raise RuntimeError("boom")

    monkeypatch.setattr(service, "record_attempt", failing_record_attempt)

    capture_calls = []
    monkeypatch.setattr(
        service.sentry_sdk, "capture_exception", lambda: capture_calls.append(True)
    )

    res = service.submit_training_response(
        db=db, session_id=123, item_id=10, move_uci="e2e4", current_user_id=1
    )

    assert res.http_status == 200
    assert len(capture_calls) == 1
```

- [ ] **Step 2: Run test to verify it fails**

Run: `docker compose exec api pytest tests/test_training_service.py::test_submit_training_response_reports_record_attempt_failure_to_sentry -v`
Expected: FAIL with `AttributeError: module 'backend.app.modules.training.service' has no attribute 'sentry_sdk'`

- [ ] **Step 3: Capture the exception in the failure handler**

In `backend/app/modules/training/service.py`, add to the imports (near the
other third-party imports at the top):

```python
import sentry_sdk
```

Then change the `except Exception:` block inside `submit_training_response`
(currently):

```python
    except Exception:
        logger.exception(
            "record_attempt failed for user_id=%s item_id=%s", current_user_id, item_id
        )
```

to:

```python
    except Exception:
        logger.exception(
            "record_attempt failed for user_id=%s item_id=%s", current_user_id, item_id
        )
        sentry_sdk.capture_exception()
```

- [ ] **Step 4: Run test to verify it passes**

Run: `docker compose exec api pytest tests/test_training_service.py::test_submit_training_response_reports_record_attempt_failure_to_sentry -v`
Expected: PASS

- [ ] **Step 5: Run the full suite**

Run: `docker compose exec api pytest`
Expected: all tests pass

- [ ] **Step 6: Commit**

```bash
git add backend/app/modules/training/service.py tests/test_training_service.py
git commit -m "fix(training): report record_attempt failures to Sentry"
```

---

## Task 6: Remove unused `pydantic-settings` dependency

**Files:**
- Modify: `requirements.txt`

**Interfaces:**
- Consumes: none.
- Produces: none — pure deletion.

- [ ] **Step 1: Confirm it's genuinely unused**

Run: `docker compose exec api grep -rn "pydantic_settings\|BaseSettings" backend/`
Expected: no output (zero matches) — confirms nothing imports it.

- [ ] **Step 2: Remove the line**

In `requirements.txt`, delete the `pydantic-settings` line.

- [ ] **Step 3: Rebuild and run the full suite**

Run: `docker compose build api && docker compose up -d db api && docker compose exec api pytest`
Expected: all tests pass — nothing imported the package, so removing it
changes nothing observable.

- [ ] **Step 4: Commit**

```bash
git add requirements.txt
git commit -m "chore: remove unused pydantic-settings dependency"
```

---

## Task 7: Pin dependency versions in `requirements.txt`

**Files:**
- Modify: `requirements.txt`

**Interfaces:**
- Consumes: none.
- Produces: none — pins existing resolved versions, doesn't change what's
  installed.

- [ ] **Step 1: Capture currently-resolved versions**

Run: `docker compose exec api pip freeze`

Cross-reference against the packages remaining in `requirements.txt` after
Task 6. As of this plan, the versions are:

| Package | Version |
|---|---|
| fastapi | 0.141.1 |
| uvicorn[standard] | 0.52.4 |
| sqlalchemy | 2.0.52 |
| psycopg[binary] | 3.3.4 |
| python-chess | 1.999 |
| alembic | 1.19.1 |
| pytest | 9.1.1 |
| httpx2 | 2.12.0 |
| ruff | 0.16.4 |
| black | 26.5.1 |
| coverage | 7.15.4 |
| pytest-cov | 7.1.0 |
| email-validator | 2.3.0 |
| pyjwt | 2.13.0 |
| zstandard | 0.25.0 |
| sentry-sdk[fastapi] | 2.68.1 |
| slowapi | 0.1.10 |

If the versions your `pip freeze` output shows differ from this table (e.g.
a newer patch release published since this plan was written), use the
versions your container actually reports — the goal is pinning to what's
already running, not to these exact numbers.

- [ ] **Step 2: Write the pinned file**

Replace the full contents of `requirements.txt` with (adjusting any version
that differed in Step 1):

```
fastapi==0.141.1
uvicorn[standard]==0.52.4
sqlalchemy==2.0.52
psycopg[binary]==3.3.4
python-chess==1.999
alembic==1.19.1
pytest==9.1.1
httpx2==2.12.0
ruff==0.16.4
black==26.5.1
coverage==7.15.4
pytest-cov==7.1.0
email-validator==2.3.0
pyjwt==2.13.0
zstandard==0.25.0
sentry-sdk[fastapi]==2.68.1
slowapi==0.1.10
```

- [ ] **Step 3: Rebuild from a clean image and verify**

Run: `docker compose build --no-cache api && docker compose up -d db api`
Expected: build succeeds (pins are satisfiable — they're exactly what was
already resolved, so this should never conflict)

Run: `docker compose exec api pip freeze`
Expected: output matches the pinned versions exactly

Run: `docker compose exec api pytest`
Expected: all tests pass

Run: `docker compose exec api ruff check . && docker compose exec api black --check .`
Expected: both pass (unaffected by this change, confirms nothing else broke)

- [ ] **Step 4: Commit**

```bash
git add requirements.txt
git commit -m "chore: pin backend dependency versions"
```

---

## Task 8: Remove leftover task-note comments in `auth.py`

**Files:**
- Modify: `backend/app/routers/auth.py`

**Interfaces:** none — comment-only change.

- [ ] **Step 1: Remove the four comments**

In `backend/app/routers/auth.py`:

Line 6, change:
```python
from datetime import datetime, timedelta, timezone  # Update your imports
```
to:
```python
from datetime import datetime, timedelta, timezone
```

Line 117 (inside `login`'s return dict), change:
```python
        "refresh_token": refresh_token,  # Return both
```
to:
```python
        "refresh_token": refresh_token,
```

Line 140 (inside `create_access_token`'s payload), change:
```python
        "type": "access",  # Add type to distinguish from refresh token
```
to:
```python
        "type": "access",
```

Line 225, remove the standalone comment line entirely:
```python
# New /refresh endpoint
```
(delete the line; the `class RefreshRequest(BaseModel):` that follows it
moves up to take its place, with the existing blank line above it
preserved)

- [ ] **Step 2: Run lint and the full suite to confirm no behavior changed**

Run: `docker compose exec api ruff check . && docker compose exec api black --check .`
Expected: both pass

Run: `docker compose exec api pytest`
Expected: all tests pass (comment-only change)

- [ ] **Step 3: Commit**

```bash
git add backend/app/routers/auth.py
git commit -m "chore(auth): remove leftover task-note comments"
```

---

## Task 9: Group `training.py` imports at the top of the file

**Files:**
- Modify: `backend/app/routers/training.py`

**Interfaces:** none — import reordering only, no symbol changes.

- [ ] **Step 1: Consolidate the imports**

`backend/app/routers/training.py` currently opens with imports scattered
around the `CamelModel` class definition (lines 1-28):

```python
# /backend/app/routers/training.py
from pydantic import BaseModel, ConfigDict

from backend.app.utils import to_camel


class CamelModel(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)


from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from backend.app.modules.training.models import TrainingItem, TrainingSession

router = APIRouter()

from backend.app.modules.shared.db import get_db
from backend.app.modules.training.service import (
    create_session_from_due,
    create_training_items,
    create_training_session,
    get_current_training_item,
    side_to_move,
    submit_training_response,
)
from backend.app.routers.auth import get_current_user
```

Replace lines 1-28 with:

```python
# /backend/app/routers/training.py
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, ConfigDict
from sqlalchemy import select
from sqlalchemy.orm import Session

from backend.app.modules.shared.db import get_db
from backend.app.modules.training.models import TrainingItem, TrainingSession
from backend.app.modules.training.service import (
    create_session_from_due,
    create_training_items,
    create_training_session,
    get_current_training_item,
    side_to_move,
    submit_training_response,
)
from backend.app.routers.auth import get_current_user
from backend.app.utils import to_camel


class CamelModel(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)


router = APIRouter()
```

(Everything from `class TrainingSessionCreateRequest(CamelModel):` onward —
currently starting at line 31 — is unchanged.)

- [ ] **Step 2: Run lint and the full suite**

Run: `docker compose exec api ruff check . && docker compose exec api black --check .`
Expected: both pass

Run: `docker compose exec api pytest`
Expected: all tests pass (pure reordering, no behavior change)

- [ ] **Step 3: Commit**

```bash
git add backend/app/routers/training.py
git commit -m "chore(training): group scattered imports at top of file"
```
