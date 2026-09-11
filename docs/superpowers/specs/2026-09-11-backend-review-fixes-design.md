# Backend review fixes: security, correctness, dependencies, style

Status: approved, ready for planning
Date: 2026-09-11

## Problem

A manual audit of `backend/app/` (no automated diff to review — `main` was
clean — so this was a full read-through of `routers/` and `modules/`, plus
`ruff check .` / `black --check .`, both of which already pass) surfaced nine
issues, none of them caught by the repo's current lint config:

**Security**
1. `POST /auth/login` (`backend/app/routers/auth.py:88-119`) returns
   immediately when no user matches the given email/username, but runs a
   200k-iteration PBKDF2 hash when one does. The response-time gap lets an
   attacker enumerate valid emails/usernames even though the JSON error body
   is generic ("Invalid credentials").
2. Nothing rate-limits `/auth/login`, `/auth/register`, or
   `/auth/resend-verification`. Login is brute-forceable; resend-verification
   can be used to spam a real user's inbox with unlimited verification
   emails.
3. `verify_password` (`backend/app/routers/auth.py:33-37`) does a raw
   `base64.b64decode` on the stored hash with no error handling. A malformed
   `password_hash` value throws an unhandled exception (500) instead of
   failing closed as invalid credentials.

**Correctness / efficiency**
4. `get_current_training_item` (`backend/app/modules/training/service.py:193-210`)
   and the `all_responded` check inside `submit_training_response`
   (`service.py:314-323`) each run one `TrainingResponse` query *per training
   item* to find out which items already have a correct response. A session
   with N items costs O(N) queries on every `/next` and every `/responses`
   call instead of one.
5. `submit_training_response` (`service.py:294-312`) swallows any
   `record_attempt` failure with a bare `except Exception: logger.exception(...)`.
   If SRS bookkeeping breaks, users silently stop getting spaced-repetition
   scheduling with no visible alert, even though Sentry is already wired into
   this app (`backend/app/app.py:29-34`).

**Dependencies**
6. `pydantic-settings` is declared in `requirements.txt` but never imported
   anywhere under `backend/` — config is read ad hoc via `os.getenv` /
   `os.environ` in six different files instead. Dead dependency.
7. `requirements.txt` has no version pins at all. A `docker compose build`
   resolves every package to whatever is latest at build time, with no
   reproducibility across environments and no warning when a new major
   version breaks something.

**Style / leftover artifacts**
8. `backend/app/routers/auth.py` carries several comments that read like
   inline task notes rather than documentation: `# Update your imports`
   (line 6), `# Return both` (line 117), `# Add type to distinguish from
   refresh token` (line 140), `# New /refresh endpoint` (line 225). They
   narrate a past diff instead of explaining anything non-obvious.
9. `backend/app/routers/training.py` has `import` statements scattered after
   the file's first class definition (lines 11-28) instead of grouped at the
   top. Works, but breaks normal Python convention; ruff doesn't catch it
   because this repo's `pyproject.toml` has no `[tool.ruff]` section, so ruff
   falls back to its default rule set, which doesn't include `E402`.

## Scope for this pass

Fix all nine, in the order above (security first, per explicit request).
Each fix should be its own task with its own tests, so the punch list stays
independently reviewable and revertable. Fully out of scope: any other
findings not on this list, adding brand-new features (e.g. password reset,
which is tracked separately), or restructuring files beyond what a given fix
requires.

## Design

### 1. Login timing side-channel

Compute a module-level dummy PBKDF2 hash once (`hash_password` of an
arbitrary fixed string) and run `verify_password` against it whenever no
user is found, before returning 401. This keeps the login handler's runtime
close to constant regardless of whether the account exists, without
touching the real hashing parameters or the response body.

### 2. Rate limiting on auth endpoints

Add `slowapi` (a Starlette/FastAPI rate-limiting library keyed by client
IP, in-memory storage — no Redis in this stack, and the prod deploy is a
single EC2 instance per `project_prod_deployment` memory, so in-memory
storage is sufficient). One shared `Limiter` instance lives in
`backend/app/modules/shared/rate_limit.py` (avoids a circular import between
`app.py` and `routers/auth.py`), registered on the app in `app.py` and
applied via `@limiter.limit(...)` decorators on `/auth/login`,
`/auth/register`, and `/auth/resend-verification`. Limit: `5/minute` per IP
on each of those three routes — generous enough for normal retry-after-typo
use, tight enough to blunt brute-forcing. A `RateLimitExceeded` handler
returns `429`.

Because `slowapi`'s in-memory store is process-global, the test suite needs
an autouse fixture that resets it between tests so unrelated tests don't
trip each other's rate limits.

### 3. `verify_password` fails closed on malformed input

Wrap the decode/compare in `try/except (ValueError, TypeError)`, returning
`False` (not raising) on any decode failure. `binascii.Error` — the concrete
exception `base64.b64decode` raises on bad padding — is a `ValueError`
subclass, so a bare `except ValueError` already covers it; `TypeError`
covers a non-`str` input.

### 4. Batch the "which items have a correct response" query

Extract a private helper:

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

`get_current_training_item` calls it once (instead of once per item) and
walks `all_items` in Python to find the first id not in the set.
`submit_training_response`'s `all_responded` check calls it once (instead of
once per item) and reduces with `all(it.id in correct_ids for it in all_items)`.
Both call sites already had `all_items` in hand, so this is a drop-in
replacement — no behavior change, just fewer round trips.

### 5. Surface `record_attempt` failures to Sentry

Add `sentry_sdk.capture_exception()` alongside the existing
`logger.exception(...)` call in the `except Exception:` block. `sentry_sdk`
is already a dependency and its calls are documented no-ops when
`SENTRY_DSN` isn't configured (see `backend/README.md`'s Sentry section), so
this is safe in dev and effective in prod without a config check.

### 6. Drop `pydantic-settings`

Delete the line from `requirements.txt`. No code references it, confirmed
via `grep -r pydantic_settings backend/` (zero matches) and
`grep -r BaseSettings backend/` (zero matches).

### 7. Pin every dependency in `requirements.txt`

Pin to the exact versions currently resolved inside the `api` container
(captured via `docker compose exec api pip freeze`), so the file becomes
reproducible without changing what's actually installed today. Extras
(`uvicorn[standard]`, `psycopg[binary]`, `sentry-sdk[fastapi]`) keep their
bracket syntax with `==` appended to the base package version.

### 8. Remove leftover task-note comments

Delete the four comments listed in Problem item 8 from
`backend/app/routers/auth.py`. No code changes, comment-only.

### 9. Group `training.py` imports at the top of the file

Move the imports currently scattered after the `CamelModel` class
definition (`backend/app/routers/training.py:11-28`) up to join the file's
existing top-of-file imports, in one block. No behavior change.

## Testing strategy

Every fix that changes behavior gets a new or updated test, run via
`docker compose exec api pytest` (Docker-only per `AGENTS.md` — never a host
venv). Comment/import-order/dependency-file changes (8, 9, 6) are verified
by `ruff check .`, `black --check .`, and a full `pytest` run passing, since
they have no independent behavior to unit-test.
