## 2026-08-20

### Features
- feat(i18n): add Khuzdul (khz) locale using attested vocabulary from Magnus Åberg's linguistic analysis; greetings (Baruk!), colors (Zirak/Narag), and title (Khazad-dûm) are Tolkien-sourced, with reconstructed "Baruk-dûm" for welcome-back and fallback to English for untranslated UI terms; pickaxe emoji flag in the language selector
- feat(i18n): add Sindarin (sd) locale with complete translations and elf emoji flag in the language selector
- feat(react): move the "Good morning/afternoon/evening, {username}" greeting out of the site header and onto the Dashboard page, above the progress-overview card — the header had grown too crowded (nav links, settings/logout, source link, language/theme toggles) to keep it readable at the widths where it was already showing; wrapped the greeting + card in a new `.dashboard-stack` column-flex container

### Fixes
- fix(i18n): remove 19 unused translation keys (dashboard.header duplicate of header section, nav sidebar labels, language option labels) and update all 35 locale files for consistency; all keys are now actively used in the UI
- feat(training): auto-escalate hints based on repeated wrong attempts on the current move — 2 misses reveals the source-square hint (same as one manual hint click), 4 misses reveals the target square too and draws an arrow to it via `Board.tsx`'s existing `arrows` prop; miss-counting is keyed off the submit lifecycle (`isSubmitting` true→false) rather than diffing feedback text, since the backend reports the identical `"wrong move"` reason for every incorrect-but-legal move and a text-diff would silently miss consecutive wrong tries; resets to zero on a correct answer or when advancing to the next training item
- feat(react): add the cm-chessboard `Accessibility` extension to `Board.tsx` — screen readers get a hidden move-form/table/piece-list description of the position plus braille notation in the SVG `alt`; keyboard move input (arrow keys, Enter/Space, Escape) is enabled only when the board is `interactive`, so read-only preview boards (Settings, dashboard cards) stay descriptive without claiming a keyboard-operable focus stop they can't act on; `language` is derived from the active i18n locale, narrowed to the extension's supported `de`/`en` (falling back to `en`)
- feat(react): add a small disclaimer under Register's email field reassuring users it's only collected to keep bots out, not for anything else

### Fixes
- fix(react): fix `.card` (ui.css) overflowing its container's right edge when nested inside the new `.dashboard-stack` — `.card` is `width:100%` + `padding:28px` with content-box sizing, which is normally forgiven because it's the sole child of `.page`'s *row* flexbox (main-axis flex-shrink absorbs the padding); as a *column*-flex child instead, that width lands on the cross axis where no such protection applies, so the border-box ballooned past the container by the padding+border width and threw the whole page's right edge out of alignment with the header; scoped fix via `.dashboard-stack .card { box-sizing: border-box; }`
- fix(react): the Settings preview board stopped accepting moves after toggling any board style preference (animations, coordinates, theme, piece set) — `Board.tsx` destroys and recreates the underlying `cm-chessboard` instance on those changes, but the move-input effect only re-ran on `interactive`/`moveColor` changes, so the new instance never got its click/drag handler registered; added a `boardVersion` counter bumped on recreation, included in the dependent effects' deps so they reattach to the new instance, and fixed a resulting cleanup-ordering crash where the move-input cleanup called `disableMoveInput()` on an already-destroyed board
- fix(react): the newly-added Accessibility extension had two bugs found in code review — its hidden move-piece form stayed enabled on read-only preview boards even though nothing had called `enableMoveInput()` there, so an assistive-tech user submitting it would hit a `TypeError` from cm-chessboard's null move-input callback; and gating `keyboardMoveInput` on the raw `interactive` prop meant Puzzles' `interactive={!!puzzleId && !isSubmitting}` destroyed and rebuilt the whole board (re-fetching piece sprites, since `assetsCache` is off) on every move submission — both are now gated on a `keyboardCapable` ref that latches true the first time a board goes interactive and never flips back, so a board that's only briefly disabled mid-submission no longer gets rebuilt

## 2026-08-19

### Features
- feat(react): add merida, pirouetti, and chessnut piece sets (free/open, sourced from the lichess client) to the Settings piece-set switcher, alongside the existing standard (cburnett) and staunty sets
- feat(react): celebrate a completed training session and a correct puzzle answer with a `canvas-confetti` burst (`utils/winCelebration.ts`); training's enemy-last-move highlight now stays put through an in-flight player attempt and only advances once the move is confirmed correct, instead of clearing on every attempt; remove the unused `emoji-picker-react` dependency (only ever referenced by an untracked prototype that never shipped), keeping `snow.tsx` in place for a future easter egg
- feat(settings): add a snow-effect toggle to Settings' appearance section — deliberately local-only (`localStorage`, `useSnowPreference`), not synced through `PreferencesContext`/the backend; backfill the `snowLabel` translation key across all 34 non-English locales
- feat(settings): add sound effects toggle to Settings' appearance section, and backfill the missing `soundLabel` translation key across all 34 non-English locales
- feat(react): add a user preferences system — `PreferencesContext` syncs theme, language, and board look (color skin, piece set, coordinates, animations, orientation lock) to the backend for logged-in users (`GET`/`PATCH /users/me/preferences`, migration `0011`), falling back to `localStorage` for guests; new `/settings` page with instant-apply controls, linked from the header; `Board.tsx` now reads board skin/piece-set/coordinates/animation from preferences instead of hardcoding them, and `Training.tsx`/`Puzzles.tsx` respect a fixed board-orientation preference instead of always auto-flipping
- feat(training): replace the dead-end "Session complete" banner with Train again / Choose another opening actions, translated across all locales; fix a stuck "Starting..." button caused by `isSessionCompleted`/`isRestarting` never resetting when a new session loaded into the same page instance
- feat(sounds): wire up puzzle/training feedback sounds and fix broken asset paths, then close the remaining gaps — play `gameStart` on session load and `moveOpponent` on the autoplayed opponent reply, persist the mute preference, and surface playback failures instead of failing silently; untrack and gitignore the 22 sound files with no `playSound()` call site

### Fixes
- fix(react): the snow easter egg kept falling for up to 15s after unchecking it in Settings — `snow()`'s `requestAnimationFrame` loop ran its full duration regardless of the toggle; `snow()` now returns a stop function that the effect cleanup calls immediately
- fix(react): changing the piece set in Settings had no visible effect on the board — cm-chessboard's `assetsCache` option caches the fetched piece sprite in a single global DOM element keyed by a fixed id rather than by URL, so switching sets never re-fetched the new sprite; disable `assetsCache` so each piece references its own sprite file directly
- fix(i18n): `da.json` and `uk.json` were mislabeled — `da` (Danish) actually contained Norwegian text and `uk` (Ukrainian) actually contained Slovak text; both retranslated into the correct language
- fix(i18n): `theme.dark`/`theme.light`/`theme.system` were left as literal English in 13 locales (de, es, fr, it, kl, nl, pl, pt, ru, tr, da, no, sv) — never rendered anywhere until the new Settings page shipped, so the gap had gone unnoticed; found via a systematic per-locale value comparison against `en-US.json` after a closer verification pass
- fix(i18n): change the default language code from `en` to `en-US` everywhere it was hardcoded — i18n config, the verification email, and the `users.language` column default (migration `0010`)

### Styling
- style(settings): convert the appearance checkboxes (coordinates, board animations, sound, snow) into toggle switches

### Chores
- chore: stop deploying the Angular frontend — dropped from docker-compose, nginx, and CI workflows; the `angular/` source tree is left in place but no longer built or deployed
- chore: adopt semantic versioning, starting at `v1.0.0` (git tags only, no `package.json` bumps); the deploy workflow now derives the running version via `git describe --tags` and bakes it into the React build as `VITE_APP_VERSION`, shown small under the header logo (`Header.tsx`'s `.site-header-version`)

### CI/CD
- ci: gate prod deploy on lint/test workflows passing — deploy.yml now requires the core/react/tests reusable workflows to succeed before deploying to prod, whereas previously deploy ran independently of CI results

### Documentation
- docs: sync AGENTS.md and READMEs with current codebase

### Accessibility
- accessibility: add Hindi, Japanese, Chinese, and Korean locales; rename locale files to match language rather than country; broad pass over existing locale content

## 2026-08-17

### Features
- feat(i18n): add per-user language support for verification emails
- feat(i18n): add `scripts/sync-locales.mjs` (`npm run i18n:sync` / `i18n:check`) so `en.json` is the single source of truth for translation keys — it stubs missing keys and drops stale ones across every other locale file instead of hand-copying JSON structure; `i18n.ts` and `LanguageToggle.tsx` now auto-discover `locales/*.json` via `import.meta.glob`, so adding a language no longer touches either file
- feat(i18n): add French and German locales, and localize the remaining hardcoded strings (opening-card variation count, board-preview "Start" button and ply tooltip)
- feat(i18n): add Italian, Dutch, Polish, Portuguese, Russian, and Turkish locales
- feat(i18n): add a Klingon (`en-x-klingon`) locale — English flavored with canonical Klingon interjections, alongside `en-x-pirate`
- feat(i18n): add a Groot (`en-x-groot`) locale — greetings/headings/labels replaced with "I am Groot" variants, technical/error copy left plain
- feat(dashboard): add a White/Black filter above the opening cards grid — openings named "X Defense/Defence" classify as Black's repertoire (`colorOf` in `groupOpenings.ts`), everything else as White's, cutting the ~149-card grid down per color
- feat(dashboard): auto-orient opening card thumbnails and the board preview to the selected opening's color (Black defenses render Black-at-bottom), and flip the preview live when the Play as White/Black toggle is changed — the toggle still defaults from the opening's color but stays user-overridable per selection

### Fixes
- fix(i18n): drop dead `language.english`/`language.spanish` keys — never rendered by any component (the language switcher shows flag emoji only)
- fix(react): guard `useTrainingSession.submitMove` and `Puzzles`'s `loadNext`/`submit` against post-unmount state updates, and clear `Puzzles`'s pending "next puzzle" timeout on unmount — the timeout leak was firing during later tests and intermittently stealing a queued mock response, which was the actual cause of an occasional Puzzles test failure

### Testing
- test(react): add `eslint-plugin-testing-library` (scoped to `**/*.test.{ts,tsx}`), fixing what it surfaced (missing `findBy` waits, redundant manual `cleanup()`, direct DOM node access in queries)

### Other
- Shouts to Patricia, Maritza, and Maritza's husband for helping out with the Spanish translation!

## 2026-08-16

### Features
- feat(training): support playing the Black side — training sessions now carry a `player_color` (migration `0008`), and both frontends generalize the White-only `isWhiteToMove`/`canPickUp`/autoplay/orientation logic in `Training.tsx`/`training.component.ts` (and `chess-core`'s `deriveStatus`) into a color-aware version driven by the session; add a White/Black picker to both dashboards

### Fixes
- fix(angular): auto-orient the puzzles board to the solver's color on load, matching React's existing behavior

## 2026-08-15

### Features
- feat(auth): gate email verification behind `EMAIL_VERIFICATION_REQUIRED` (off by default in prod while SES is sandboxed) — register auto-verifies and login skips the check when disabled
- feat(angular): port the React dashboard's progress strip (positions trained, accuracy, day streak, mastery bar, review-due button, weak spots) to Angular via a new `ProgressService` and `TrainingService.startFromDue()`, closing the feature gap between the two frontends

### Fixes
- fix(auth): harden email verification token model — add `email_verified_at` timestamp and an `email_verify_token_version` counter so resending a verification email invalidates the prior link instead of leaving it valid until its own 24h expiry
- fix(test): update prod smoke test's stale Puzzles heading assertion

### Refactoring
- refactor(css): centralize the CSS that's shared verbatim between React and Angular (`tokens`, `base`, `header`, `ui`, `training`, `dashboard`, `puzzles`, `login`, `board`) into `packages/shared-styles/`; mount `./packages:/packages` into both dev containers so the shared files are visible without a rebuild

### Testing
- test(puzzles): isolate puzzle service tests from real seeded data
- test(e2e): add a prod smoke test (`playwright-prod-smoke.spec.ts`, `npm run test:smoke`) that logs into a persistent test account and checks the dashboard + puzzles pages load for real after a deploy; registration is split into a separate one-off spec (`playwright-prod-register.spec.ts`) so smoke runs don't keep creating throwaway accounts on prod

## 2026-08-14

### Refactoring
- refactor(training): extract timeline history and session-state derivation (status banner, eco/opening-name split, hint markers, next-item parsing) out of React-specific files into pure `@knight-school/chess-core` modules (`timeline.ts`, `next-item.ts`, `status.ts`); rewire both React's `Training.tsx`/`useTrainingSession.ts` and Angular's `training.component.ts`/`training.service.ts` to share the same logic — fixes a latent Angular bug where hint markers didn't hide on session completion

## 2026-08-13

### Features
- feat(training): dataset-driven training-item selection — `create_training_session()` builds items from real `Opening` rows (gated UI always supplies eco+name, so selection is deterministic; `func.random()` is a no-opening fallback), replacing the MVP static items
- feat(angular): build the Angular training page against the shared `@knight-school/chess-core` package — board, move input, hint/timeline, and session flow at parity with React
- feat(angular): mirror the React `Board` over `cm-chessboard` as an Angular component with the same prop/marker surface; add the `chess-core` build step to `angular/Dockerfile`
- feat(angular): bring header/dashboard/training/login to parity with React
- feat(header): replace the `/profile` link with a logout button icon (drops the dead `/profile` route)
- feat(auth): add cross-links between login and register
- feat(react): replace `react-chessboard` with `cm-chessboard` behind a reusable `Board` wrapper — a framework-neutral board that eases the planned Angular port

### Refactoring
- refactor(training): route drag + click through cm-chessboard's move-input into the existing `chess.js` validation; migrate `squareStyles` highlights to markers; drop right-click arrow drawing
- refactor(training): trim `NextItem` to the fields actually used (remove unused `nextPgn`/`nextEpd`/`nextNextPgn`/`data`) and fix a duplicate `epd` key in the next-item response type

### Testing
- test(react): mock `Board` in the Training tests and assert `onMove`/markers; Playwright now screenshots dashboard + training across the CSS breakpoints (desktop/tablet/mobile) × light/dark

### Documentation
- docs: add a theme-aware (`<picture>`) collapsible dashboard screenshot to the React README; refresh READMEs for cm-chessboard

## 2026-07-28

### Features
- feat(dashboard): add prominent opening board preview and selection gating

### Refactoring
- refactor(dashboard): initialize selection state to empty

### Fixes
- fix: resolve eslint/type issues in `useTrainingSession`, `Dashboard.test.tsx`, and `Training.test.tsx`

### Testing
- test(dashboard): add/expand Dashboard test coverage

### UI
- ui(dashboard): reorganize dashboard CSS and improve board preview sizing
- ui(dashboard): add dark/light mode screenshots and dashboard random quotes; update icons to SVG components

## 2026-07-26

### Refactoring
- Add lots of missing typing

## 2026-07-24

### Features
- feat(training): track session completion with `isSessionCompleted`
- feat(training): add optional `nextNextPgn` to `NextItem`

### Fixes
- fix(training): remove custom arrows/hint arrow logic and update chessboard options + expectations in tests

### Refactoring
- refactor: Remove Retry button and backing logic
- refactor(training): change `hintLevel` to -1/0 (Hint/More Hint) and highlight from/to squares only

## 2026-07-21

### Testing
- test: refactor auth tests and improve pytest configuration
  - Add `pythonpath = .` to pytest.ini to fix module resolution
  - Introduce `test_user` fixture in conftest.py
  - Refactor `test_auth_refresh.py` to use the new user fixture
  - Clean up unused imports in auth router and test files

### Chores
- Add refresh tokens
- Add env.example
- Run black / ruff

## 2026-07-20

### Fixes
- Fix `/api/` slash issue

### Testing
- Add Tests for `useTrainingSession`
- Add vitest and initial tests
- Add vi test

### Chores
- Code cleanup in `useTrainingSession.ts`
- Config changes for vitest

## 2026-07-18

### Refactoring
- refactor: extract training session logic into `useTrainingSession` hook
  - Centralize move submission, state management, and feedback handling to improve maintainability and reduce duplication
  - Move ~80% of session logic into a reusable hook
  - Improve testability through modular components
  - Preserve autoplay and real-time feedback functionality
  - Clean up coverage ignore patterns

### Fixes
- Fix training item selection & typings
  - Backend now excludes openings where eco or name are null when selecting the next session item
  - Frontend removes the `fetchNextItemShim` typing hack and defines an explicit `NextItem` interface for `/training-sessions/:id/next`
- Fix black not moving

### Documentation
- docs: Unleash the full potential of LICENCE
- docs: Add backend/README.md; Rework all READMEs
- docs: overhaul README into professional documentation
  - add LICENCE
  - refactor ThemeToggle
  - add test coverage for frontend

### Chores
- linting and formatting: add ruff, black. run both

## 2026-07-17

### Features
- feat/training: add move feedback animations and dataset-driven sessions
  - Sessions now use openings dataset instead of static examples
  - Added visual blink animation on correct moves
  - Improved training interface layout
  - Better error messages and session state tracking
- feat(training): associate training sessions with authenticated user
  - Add `user_id` + relationship to `TrainingSession`
  - Update `create_training_session(db, user_id, ...)` and pass `current_user.id` from training router
  - Adjust training-related tests to include `user_id` and new service signature
  - Update frontend header to show profile icon/link when logged in
  - Minor frontend cleanup in Training page

### Other
- Various Frontend enhancements
  - Added logo
  - Added CHANGELOG
- (tidying) Move page files to `src/pages`; components to `src/components`
  - Update frontend README
  - Added Header component and implemented it across pages
  - Update nginx conf

## 2026-07-16

### Chores
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

### Other
- Docker/service resilience improvements (health checks, restart policies).
- Openings table/model and enriched opening import (including ECO + move index metadata).
- Alembic setup improvements (env bootstrapping, model auto-import, safer migrations).
- Improved migration/table creation safety (guards, explicit types, safer downgrades).

## 2026-07-08

### Other
- Auth + training MVP wiring: login/register + redirect to dashboard.
- Training UI and session flow routed to /training/:id.
- JWT auth integration for training routes.
- Training progression logic updates (next item selection + response upsert behavior).
- Register validation and auth/router wiring.
