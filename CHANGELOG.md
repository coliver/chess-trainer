## 2026-08-16
- feat(training): support playing the Black side — training sessions now carry a `player_color` (migration `0008`), and both frontends generalize the White-only `isWhiteToMove`/`canPickUp`/autoplay/orientation logic in `Training.tsx`/`training.component.ts` (and `chess-core`'s `deriveStatus`) into a color-aware version driven by the session; add a White/Black picker to both dashboards
- fix(angular): auto-orient the puzzles board to the solver's color on load, matching React's existing behavior

## 2026-08-15
- fix(auth): harden email verification token model — add `email_verified_at` timestamp and an `email_verify_token_version` counter so resending a verification email invalidates the prior link instead of leaving it valid until its own 24h expiry
- feat(auth): gate email verification behind `EMAIL_VERIFICATION_REQUIRED` (off by default in prod while SES is sandboxed) — register auto-verifies and login skips the check when disabled
- test(puzzles): isolate puzzle service tests from real seeded data
- fix(test): update prod smoke test's stale Puzzles heading assertion
- feat(angular): port the React dashboard's progress strip (positions trained, accuracy, day streak, mastery bar, review-due button, weak spots) to Angular via a new `ProgressService` and `TrainingService.startFromDue()`, closing the feature gap between the two frontends
- refactor(css): centralize the CSS that's shared verbatim between React and Angular (`tokens`, `base`, `header`, `ui`, `training`, `dashboard`, `puzzles`, `login`, `board`) into `packages/shared-styles/`; mount `./packages:/packages` into both dev containers so the shared files are visible without a rebuild
- test(e2e): add a prod smoke test (`playwright-prod-smoke.spec.ts`, `npm run test:smoke`) that logs into a persistent test account and checks the dashboard + puzzles pages load for real after a deploy; registration is split into a separate one-off spec (`playwright-prod-register.spec.ts`) so smoke runs don't keep creating throwaway accounts on prod

## 2026-08-14
- refactor(training): extract timeline history and session-state derivation (status banner, eco/opening-name split, hint markers, next-item parsing) out of React-specific files into pure `@knight-school/chess-core` modules (`timeline.ts`, `next-item.ts`, `status.ts`); rewire both React's `Training.tsx`/`useTrainingSession.ts` and Angular's `training.component.ts`/`training.service.ts` to share the same logic — fixes a latent Angular bug where hint markers didn't hide on session completion

## 2026-08-13
- feat(training): dataset-driven training-item selection — `create_training_session()` builds items from real `Opening` rows (gated UI always supplies eco+name, so selection is deterministic; `func.random()` is a no-opening fallback), replacing the MVP static items
- feat(angular): build the Angular training page against the shared `@knight-school/chess-core` package — board, move input, hint/timeline, and session flow at parity with React
- feat(angular): mirror the React `Board` over `cm-chessboard` as an Angular component with the same prop/marker surface; add the `chess-core` build step to `angular/Dockerfile`
- feat(angular): bring header/dashboard/training/login to parity with React
- feat(header): replace the `/profile` link with a logout button icon (drops the dead `/profile` route)
- feat(auth): add cross-links between login and register
- feat(react): replace `react-chessboard` with `cm-chessboard` behind a reusable `Board` wrapper — a framework-neutral board that eases the planned Angular port
- refactor(training): route drag + click through cm-chessboard's move-input into the existing `chess.js` validation; migrate `squareStyles` highlights to markers; drop right-click arrow drawing
- refactor(training): trim `NextItem` to the fields actually used (remove unused `nextPgn`/`nextEpd`/`nextNextPgn`/`data`) and fix a duplicate `epd` key in the next-item response type
- test(react): mock `Board` in the Training tests and assert `onMove`/markers; Playwright now screenshots dashboard + training across the CSS breakpoints (desktop/tablet/mobile) × light/dark
- docs: add a theme-aware (`<picture>`) collapsible dashboard screenshot to the React README; refresh READMEs for cm-chessboard

## 2026-07-28
- feat(dashboard): add prominent opening board preview and selection gating
- refactor(dashboard): initialize selection state to empty
- ui(dashboard): reorganize dashboard CSS and improve board preview sizing
- test(dashboard): add/expand Dashboard test coverage
- fix: resolve eslint/type issues in `useTrainingSession`, `Dashboard.test.tsx`, and `Training.test.tsx`
- ui(dashboard): add dark/light mode screenshots and dashboard random quotes; update icons to SVG components

## 2026-07-26
- Add lots of missing typing

## 2026-07-24
- refactor: Remove Retry button and backing logic
- feat(training): track session completion with `isSessionCompleted`
- refactor(training): change `hintLevel` to -1/0 (Hint/More Hint) and highlight from/to squares only
- fix(training): remove custom arrows/hint arrow logic and update chessboard options + expectations in tests
- feat(training): add optional `nextNextPgn` to `NextItem`

## 2026-07-21
- test: refactor auth tests and improve pytest configuration
  - Add `pythonpath = .` to pytest.ini to fix module resolution
  - Introduce `test_user` fixture in conftest.py
  - Refactor `test_auth_refresh.py` to use the new user fixture
  - Clean up unused imports in auth router and test files
- Add refresh tokens
- Add env.example
- Run black / ruff

## 2026-07-20
- Fix `/api/` slash issue
- Add Tests for `useTrainingSession`
- Code cleanup in `useTrainingSession.ts`
- Config changes for vitest

## 2026-07-18
- docs: Unleash the full potential of LICENCE
- docs: Add backend/README.md; Rework all READMEs
- docs: overhaul README into professional documentation
  - add LICENCE
  - refactor ThemeToggle
  - add test coverage for frontend
- refactor: extract training session logic into `useTrainingSession` hook
  - Centralize move submission, state management, and feedback handling to improve maintainability and reduce duplication
  - Move ~80% of session logic into a reusable hook
  - Improve testability through modular components
  - Preserve autoplay and real-time feedback functionality
  - Clean up coverage ignore patterns
- Fix training item selection & typings
  - Backend now excludes openings where eco or name are null when selecting the next session item
  - Frontend removes the `fetchNextItemShim` typing hack and defines an explicit `NextItem` interface for `/training-sessions/:id/next`
- Add vitest and initial tests
- Fix black not moving
- Add vi test

## 2026-07-17
- feat/training: add move feedback animations and dataset-driven sessions
  - Sessions now use openings dataset instead of static examples
  - Added visual blink animation on correct moves
  - Improved training interface layout
  - Better error messages and session state tracking
- Various Frontend enhancements
  - Added logo
  - Added CHANGELOG
- linting and formatting: add ruff, black. run both
- feat(training): associate training sessions with authenticated user
  - Add `user_id` + relationship to `TrainingSession`
  - Update `create_training_session(db, user_id, ...)` and pass `current_user.id` from training router
  - Adjust training-related tests to include `user_id` and new service signature
  - Update frontend header to show profile icon/link when logged in
  - Minor frontend cleanup in Training page
- (tidying) Move page files to `src/pages`; components to `src/components`
  - Update frontend README
  - Added Header component and implemented it across pages
  - Update nginx conf

## 2026-07-16
- training: add next-item selection and persist response correctness/feedback
- (merge) Merge branch 'main' of https://github.com/coliver/chess-trainer
- Update ARCHITECTURE.md
- Fix formatting in README for nginx configuration
- Update README
- dev: update nginx frontend proxy and `/ws` websocket endpoint
  - chore: clean up `import_openings.py` formatting and remove commented code
- update agent instructions, `.gitignore`
  - tighten `import_openings.py` formatting and remove old commented code
  - db: remove `create_openings.sql` (replaced by migrations/schema generation)

## 2026-07-14
- Docker/service resilience improvements (health checks, restart policies).
- Openings table/model and enriched opening import (including ECO + move index metadata).
- Alembic setup improvements (env bootstrapping, model auto-import, safer migrations).
- Improved migration/table creation safety (guards, explicit types, safer downgrades).

## 2026-07-08
- Auth + training MVP wiring: login/register + redirect to dashboard.
- Training UI and session flow routed to /training/:id.
- JWT auth integration for training routes.
- Training progression logic updates (next item selection + response upsert behavior).
- Register validation and auth/router wiring.
