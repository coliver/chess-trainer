# Email Confirmation — Problem-Space Ontology

Conceptual map of the entities, states, and relationships introduced by the
email-verification feature (`feature/email-confirmation`). Companion to
`ARCHITECTURE.md`, scoped to this one feature.

## Entities

- **User** (`modules/users/models.py`) — the aggregate. Two *independent*
  boolean state axes live on it: `is_active` (account enabled) and
  `email_verified` (contact confirmed). It also owns unrelated relationships
  (training_sessions, streak, etc.) that aren't part of this ontology.
- **Token** — not a persisted entity at all, just a JWT claim shape.
  `access`, `refresh`, and `email_verify` are three "types" sharing one
  factory (`routers/auth.py:114-154`), distinguished by a `type` claim +
  expiry. Still no DB row (no listing, no single-use enforcement for
  `access`/`refresh`), but `email_verify` now carries a `ver` claim checked
  against `User.email_verify_token_version` — issuing a new one invalidates
  every older one without needing a token table.
- **VerificationEmail** — an ephemeral side effect (SMTP send via
  `BackgroundTasks`, `modules/email/sender.py`), not modeled as data — no
  send log, no delivery status.

## States & transitions (`User.email_verified`)

```text
unverified --register--------> unverified  [token(ver=0) + email fired, unless EMAIL_VERIFICATION_REQUIRED is off]
unverified --verify-email(tok)-> verified   [idempotent; ver must match current email_verify_token_version]
unverified --resend-----------> unverified  [version bumped, NEW token+email; OLD token now rejected]
verified   --(nothing)--------> verified    [monotonic, one-way]

login gate: is_active AND (email_verified OR EMAIL_VERIFICATION_REQUIRED is off)
```

## Gaps / tensions surfaced by mapping it out

1. ~~**No `verified_at`.**~~ **Resolved** (migration `0006`). `email_verified_at`
   is now set the moment `email_verified` flips `true` (register's
   auto-verify path when `EMAIL_VERIFICATION_REQUIRED` is off, or a real
   `/auth/verify-email`). Still `NULL` for the `0005`-grandfathered rows —
   intentionally left unbackfilled, since `NULL` correctly says
   "unknown/legacy" rather than faking a date.
2. ~~**No token invalidation.**~~ **Resolved** (migration `0006`). Every
   `email_verify` token now embeds the `email_verify_token_version` it was
   issued with; `/auth/resend-verification` bumps that counter, so the
   previous token (from registration or an earlier resend) is rejected on
   its next use. The *same* token can still be replayed — verify stays
   idempotent — since replay doesn't touch the version.
3. **`is_active` is a placeholder axis.** It has a consumer
   (`get_current_user`, `/refresh`) but no producer — nothing in the
   codebase ever sets it `False`. It's modeled as if account suspension
   exists; it doesn't yet. *(Explicitly out of scope — not a defect in this
   feature, an absent one.)*
4. **Password reset is absent from the ontology.** Register/verify/login/
   refresh are covered; recovery isn't, though it'd naturally reuse the same
   stateless-JWT pattern as `email_verify`. *(Also explicitly out of scope.)*
