This layout prioritizes "air" and visual anchors. The `####` headers provide a large, clear target for your eyes, and the blockquote (`>`) creates a vertical line on the left, which acts as a rail to help you track the text and prevent lines from blending together.

---

## August 27, 2026

### ✨ Added

#### 🔊❄️🎉 Angular Sound, Snow, and Win-Celebration Effects

> Continuing the Angular/React parity backport (`frontend/angular/PARITY_GAPS.md`, item 7): ported `utils/sound.ts`/`hooks/useSound.ts` to `core/sound.service.ts`, `hooks/useSnowPreference.ts` to `core/snow-preference.service.ts` (a signal-based service does the same job `useSyncExternalStore` + a module-level listener set did in React — no extra machinery needed), and `utils/snow.tsx`/`utils/winCelebration.ts` to `lib/snow.ts`/`lib/win-celebration.ts`. Added `canvas-confetti` as a dependency and a `scripts/sync-shared-assets.mjs` step (mirroring the existing i18n locale sync) to pull `packages/shared-assets/sounds/*.mp3` into `public/sounds/` before serve/build/test, since the Angular CLI's asset glob can't reach outside the workspace root. Wired into `app.component.ts` (the periodic snow animation), `training.component.ts` and `puzzles.component.ts` (move/correct/incorrect/illegal sounds plus win/puzzle-correct confetti), and `settings.component.ts` (preview-move sound, and a snow toggle row that turned out to be entirely missing from the page — an earlier `PARITY_GAPS.md` note had it as merely inert, but it wasn't rendered at all).
>
> Also newly discovered while touching `puzzles.component.ts`: Angular's puzzle-attempt flow doesn't handle multi-move puzzles at all (`PuzzleAttemptResult` has no `puzzleComplete`/`opponentReplyUci`/`nextCorrectMoveUci`, and `submit()` doesn't send `moveIndex`) — any correct answer is treated as puzzle-complete, so a mateIn2+ puzzle likely breaks after its first move. This mirrors a bug already fixed on React/backend (per project history, 2026-08-24) that evidently never made it into Angular. Logged as `PARITY_GAPS.md` §9; not fixed in this pass, it's a real correctness bug needing its own pass.

#### 🧱 Angular AuthCard + ProgressStat Shared Components

> Continuing the Angular/React parity backport (`frontend/angular/PARITY_GAPS.md`, item 5): added `shared/auth-card.component.ts` (the login/register/verify-email card shell, with content projection for the title/subtitle-optional layout React's `AuthCard.tsx` uses) and `shared/progress-stat.component.ts` (the icon/value/label/mastery-bar stat display, using content projection for the value and an optional `[stat-extra]`-selected slot for the mastery bar, since the value markup varies per stat). Refactored `login`, `register`, `verify-email`, and `dashboard` (both progress rows) to use them instead of duplicating the card/stat markup inline. Also added Dashboard's stat icons (♟️ 🎯 📅 🏆 🧩), which Angular was missing entirely. Checked `RandomQuote.tsx`/`FenTurnBadge.tsx` from the same parity-gap list — both are dead code in React itself (unit-tested but never imported by a page), so nothing to port.
>
> Discovered while doing this: `dashboard.component.ts`, `training.component.ts`, and `puzzles.component.ts` were never i18n'd — hardcoded English throughout, versus 35/9/12 `t()` calls in their React counterparts. Logged as a new item in `PARITY_GAPS.md` (§8); not fixed in this pass, it's a large separate effort.

#### 📝 Angular Register: Password Confirmation, Language, Persistent Success Message + i18n

> Closes the gap flagged when the Login resend-verification work landed (`frontend/angular/PARITY_GAPS.md`): `register.component.ts` now matches `react/src/pages/Register.tsx` — a password-confirmation field (checked client-side before submit), `language` sent on register (from `TranslateService`), and a persistent "check your inbox" success message with a manual "return to login" link instead of auto-navigating past it. Fully i18n'd via `TranslatePipe`. The success message interpolates the registered email into a `<strong>` tag (matching React's `Trans` usage) via a sanitized `[innerHTML]` binding, since Angular's `{{ }}` interpolation would otherwise render the tag as literal text. `AuthService.register()` gained a `language` parameter.

#### 🔑 Angular Login: Resend-Verification + i18n

> Closes the gap flagged when the VerifyEmail page landed (`frontend/angular/PARITY_GAPS.md`): `login.component.ts` now handles a 403 "Email not verified" response with a resend-verification button (`AuthService.resendVerification()`) and is fully i18n'd, matching `react/src/pages/Login.tsx`. Checking `register.component.ts` for the same treatment turned up a bigger gap — no password-confirmation field, doesn't send `language` on register, hardcoded English, and auto-navigates to `/login` immediately on success instead of showing a persistent "check your email" message. Logged as its own item, not fixed in this pass.

#### 📧 Angular VerifyEmail Page

> Continuing the Angular/React parity backport (`frontend/angular/PARITY_GAPS.md`, item 3): ported `react/src/pages/VerifyEmail.tsx` to `pages/verify-email/verify-email.component.ts`, routed at `/verify-email` (unguarded, matching React). Reads the `?token=` query param, calls `AuthService.verifyEmail()`, and shows loading/success/error states. Surfaced a related, previously-untracked gap while doing this: React's `Login.tsx` has an "email not verified" 403 branch with a resend-verification button and is fully i18n'd, neither of which Angular's `login.component.ts` has yet — logged in `PARITY_GAPS.md`, not fixed in this pass.

#### 🧩 Angular PuzzleThemes Page

> Continuing the Angular/React parity backport (`frontend/angular/PARITY_GAPS.md`, item 3): ported `react/src/pages/PuzzleThemes.tsx` to `pages/puzzle-themes/puzzle-themes.component.ts`, with `react/src/utils/puzzleThemes.ts`'s theme grouping, mate-position FENs, label formatting, and icon lookup ported data-identical to `lib/puzzle-themes.ts`. Routed at `/puzzles/themes` (guarded), fetches theme counts via `PuzzlesService.themes()`, and links each theme card to `/puzzles?theme=<tag>` — that query param isn't consumed by `PuzzlesComponent` yet, which remains a separate open item.

#### ⚙️ Angular Settings Page

> Continuing the Angular/React parity backport (`frontend/angular/PARITY_GAPS.md`, item 3): ported `react/src/pages/Settings.tsx` to `pages/settings/settings.component.ts` — theme/board-theme/piece-set pickers, show-coordinates/animations/sound toggles, board-orientation-mode, reset-to-defaults, and a live interactive preview board (reusing the existing `BoardComponent`). Backed by a new signal-based `PreferencesStoreService` (Angular's counterpart to React's `PreferencesContext`), which hydrates from `/api/users/me/preferences` on login and keeps `document.documentElement`'s theme and `TranslateService`'s language in sync with whatever preferences are active. `AuthService` gained a `loggedIn` signal so the store can react to login/logout without polling. `LanguageToggleComponent` now routes language changes through the store instead of calling `TranslateService` directly — matching React's actual data flow and avoiding two independent writers fighting over the active language. The snow toggle and sound-on-preview-move aren't wired to anything yet (their underlying utilities are a separate, still-open parity item), but persist correctly.

#### 🧭 Angular Header Split: HomeHeader / GameHeader / OverflowMenu

> Continuing the Angular/React parity backport (`frontend/angular/PARITY_GAPS.md`, item 4): replaced the single legacy `header.component.ts` with `HomeHeaderComponent` (hamburger menu + brand + Openings/Puzzles tabs) and a minimal `GameHeaderComponent` (back button, live status, settings gear), switched between by route in `app.component.ts` — training/puzzle routes get `GameHeader`, everything else gets `HomeHeader`, matching React's `AppHeader()`. Added `OverflowMenuComponent` (focus trap, Escape-to-close, outside-click, matching React's `OverflowMenu.tsx` accessibility behavior) and a `GameStatusService` standing in for React's `GameHeaderContext`. The settings gear links to `/settings`, which doesn't exist yet (falls back to the dashboard redirect) until the Settings page itself lands.

#### 🔐 Angular API Client Parity: Single-Flight Refresh + Missing Endpoints

> Continuing the Angular/React parity backport (`frontend/angular/PARITY_GAPS.md`): `auth.interceptor.ts` now shares one in-flight `/auth/refresh` call across concurrent 401s instead of firing one per request, mirroring `react/src/api.ts`'s `refreshPromise` pattern — without it, a single-use/rotating refresh token would invalidate all but the first concurrent refresh, wrongly logging the user out. Also added `AuthService.verifyEmail`/`resendVerification`, `PuzzlesService.themes()`, and a new `PreferencesService`, matching endpoints React already calls that Angular's services didn't.

#### 🌐 Angular i18n Infrastructure + Re-wired Into Docker Compose

> Started bringing `frontend/angular` back up to feature parity with React (see `frontend/angular/PARITY_GAPS.md` for the full gap list and order). Landed the foundational piece first: a `TranslateService`/`TranslatePipe`/`LanguageToggleComponent` that reads the same shared `packages/i18n-locales/locales/*.json` React and Rails use, with dot-path lookup, `{{var}}` interpolation, and i18next-style `_one`/`_other` plural resolution. Since the Angular CLI's asset pipeline can't glob outside the workspace root, a `scripts/sync-i18n-locales.mjs` script copies the locale files into `public/i18n/` before every serve/build/test. Header, theme toggle, and flip-board-button now read their strings through it. Re-added the `angular` service to `docker-compose.yml` (mirroring `react`/`rails`: code + shared `packages/` volume mounts) and an nginx `/angular/` proxy location, so it's no longer a frozen, unwired standalone `Dockerfile`.

### 🐛 Fixed

#### ⬆️ Angular Dependency Versions Were Inconsistent, Blocking Every Build

> `frontend/angular/package.json` had `@angular/core`/`common`/`compiler` pinned to `^22.1.4` while `forms`/`platform-browser`/`router`/the CLI/`build-angular`/`compiler-cli` were still on `^21.2.x` — a partial upgrade that made `ng build`/`ng test` fail outright (`npm ci` ERESOLVE conflict, then a hard Angular-version check once resolved). Finished the upgrade: all `@angular/*` packages to `22.1.x`, TypeScript `~5.9.3` → `~6.0.3` (required by `compiler-cli@22.1.4`), `typescript-eslint` to `8.68.0` and `angular-eslint` to `22.1.0` (both needed for TS 6 support), and the Dockerfile's base image from `node:20` to `node:22` (the 22.1.x CLI requires Node `^22.22.3`).
>
> The upgrade surfaced a second, more serious issue: Angular 22 defaults components with no explicit `changeDetection` to `OnPush` instead of the old "check always" behavior, which silently broke every page — state mutations stopped updating the DOM entirely after the first render (confirmed via a failing unit test; matches [angular/angular#69530](https://github.com/angular/angular/issues/69530)). Fixed by adding `changeDetection: ChangeDetectionStrategy.Eager` to all 15 components (the same fix Angular's own `ng update` migration schematic applies), preserving pre-v22 behavior without a full OnPush rewrite. `@angular-eslint/prefer-on-push-component-change-detection` (new default in `angular-eslint@22`) is disabled repo-wide until that rewrite happens.

### ♻️ Refactor

#### 📁 Frontend Directories Consolidated Under `frontend/`

> `react/`, `angular/`, `rails/`, and the shared `packages/` now live under a single `frontend/` directory (`frontend/react`, `frontend/angular`, `frontend/rails`, `frontend/packages`), moved with `git mv` to preserve history. Docker Compose's `react`/`rails` services build with `context: ./frontend` instead of the repo root, so their Dockerfiles needed no changes; a new `frontend/.dockerignore` was required since Docker resolves `.dockerignore` relative to the build context, and the root one no longer applied to those two services. All four CI workflows, `.dockerignore`, root `.gitignore`, and docs were updated for the new paths.

### 🐛 Fixed

#### 🌐 Backend Couldn't Find Locale Files After the Move

> `backend/app/modules/email/sender.py` resolved `packages/i18n-locales/locales` relative to the repo root for `supported_languages()`/verification-email translations — broke once `packages/` moved under `frontend/`, rejecting valid languages (e.g. `de`) as unsupported. Fixed to `frontend/packages/i18n-locales/locales`.

#### 🎭 Rails System Specs Silently Used an Unconfigured Cuprite Driver

> `spec/system/settings_spec.rb` failed with `Ferrum::ProcessTimeoutError` (or, in some environments, killed the whole `rspec` process outright). Root cause: Rails 8's `ActionDispatch::SystemTesting::Driver` treats `:cuprite` as one of its own known driver names, so calling `driven_by :cuprite` silently re-registered the Capybara driver with bare defaults — discarding the app's `no-sandbox`/`disable-dev-shm-usage` browser options and Ferrum's default 10s `process_timeout`, which is too short for Chrome to start reliably under Docker's small `/dev/shm`. Fixed by passing those options through Rails' own `driven_by :cuprite, options: { ... }` instead of a separate, silently-overridden `Capybara.register_driver` call. See `frontend/rails/spec/rails_helper.rb`.

---

## August 26, 2026

### 🔒 Security

#### 🛡️ Dependency Vulnerability Patches

> Patched esbuild dev-server file-read/CORS vulnerabilities in `packages/chess-core` and `rails/`, and upgraded `angular/` from Angular 19 to 21 (via official `ng update`) to resolve high-severity Dependabot alerts across postcss, tar, sigstore, http-proxy-middleware, piscina, and the Angular framework itself. One low-risk alert (`webpack-dev-server`, dev-server-only) remains open pending an upstream Angular devkit release.
### 🐛 Fixed

#### 🔐 Token Refresh Race Condition

> Concurrent `401` responses previously each triggered their own `/auth/refresh` call. With single-use/rotating refresh tokens, only the first succeeded and the rest wrongly logged the user out. `react/src/api.ts` now shares one in-flight refresh promise across concurrent requests.

### ✨ Added

#### 🩹 Sentry Error Reporting

> Optional error reporting for both backend and frontend, gated entirely by env vars (`SENTRY_DSN`/`VITE_SENTRY_DSN`) — a no-op when unset. Backend calls `sentry_sdk.init()` in `app.py` (auto-instruments FastAPI); frontend calls `Sentry.init()` in `main.tsx` and wraps the app in `Sentry.ErrorBoundary`. `deploy.yml` sources `.env` on the host and passes `VITE_SENTRY_DSN`/`VITE_SENTRY_ENVIRONMENT=production` into the frontend build container. See [backend/README.md](./backend/README.md#error-reporting-sentry-optional) and [react/README.md](./react/README.md#error-reporting-sentry-optional).

---

## August 25, 2026

### ✨ Added

#### 🚀 Text-Mode API

> A full "BBS-style" terminal interface for the entire app. Includes `GET /dashboard.text`, `summary.text`, and `puzzles/next.text` with ASCII boards, ANSI colors, and a "What next?" navigation menu.

#### 🧩 Puzzle Themes Browser

> Added a dedicated themes browser (`/rails/puzzles/themes`) allowing users to filter practice by specific tactical themes.

#### 💬 Explicit Puzzle Prompts

> Puzzles now explicitly state "Find the best move for White/Black" instead of a generic prompt.

#### 🖱️ Manual Puzzle Advance

> Implemented a "Next puzzle" button in React, preventing the app from auto-advancing and allowing users to study the solved position.

#### 🌐 Terminal Discovery

> Configured Nginx to automatically redirect terminal clients (curl/wget) to the text-mode dashboard.

### ⚡ Improved

#### ♿ Accessibility Pass

> Significant WCAG AA improvements, including a proper modal dialog for the Overflow Menu, `role="alert"` for error messages, and dynamic `lang` attribute tracking.

#### 🎨 Visual Contrast

> Fixed several color contrast violations on the Settings page, ECO-code pills, and site header versioning to meet 4.5:1 AA minimums.

#### 📟 Terminal Rendering

> Enhanced `.text` boards to use Unicode glyphs (filled vs. outline) to clearly distinguish White and Black pieces in terminal fonts.

### 🐛 Fixed

#### 🖼️ Dashboard UI

> Fixed the "Needs work" section in Rails to match the new React grid layout and added the missing "trickiest move" tile.

#### 🧩 Puzzle Logic

> Fixed a bug where "Skip puzzle" could return the same puzzle repeatedly by introducing an `excludeId` parameter.

#### ⚙️ CI/CD Optimization

> Added caching for Playwright binaries and fixed a `pip` cache conflict in the backend test workflow to speed up CI runs.

#### 🛠️ Backend Stability

> Resolved translation errors in the Rails puzzle controller and fixed missing trailing newlines in text-mode responses.

---

## August 24, 2026

### ✨ Added

#### 📈 Full Puzzle Sequences

> Puzzles now require the complete move sequence to be solved rather than just the first move.

#### 📊 Step-Level Analytics

> Introduced "Trouble spots" analytics that identify the specific ply (move number) in an opening where trainees most frequently fail.

#### 🏷️ Puzzle Theme Chips

> Added visual theme tags (e.g., "fork", "mate in 2") directly on the Puzzles page.

### ⚡ Improved

#### 📐 Dashboard Layout

> Merged "Weak spots" and "Trouble spots" into a compact "Needs work" section featuring highlighted tiles for the weakest opening and trickiest move.

### 🐛 Fixed

#### 📉 Accuracy Data

> Filtered out opponent auto-played moves from accuracy analytics to prevent artificial 100% accuracy spikes.

#### 🔄 Review Sessions

> Fixed a bug where review sessions always reported the player as White, causing the board to auto-move for the user when playing as Black.

### 🧪 Testing

#### 🧪 Integration Tests

> Added integration tests for training autoplay and backend coverage for `side_to_move` derivation.

---

## August 23, 2026

### ✨ Added

#### 📚 Opening Content

> Authored detailed descriptions for 46 new openings (Modern, Pterodactyl, and Pirc defenses).

### ⚡ Improved

#### 📱 Mobile UX

> Redesigned the mobile header with a specific "Game" mode that minimizes branding and UI to maximize board screen space.

---

## August 22, 2026

### ✨ Added

#### 🌍 Internationalization

> Full support for 37 locales with live language preference switching.

#### ⚙️ I18n Engine

> Rolled out the translation engine across all Rails views, controllers, and Stimulus controllers.

### ⚡ Improved

#### 🔀 Unified Translations

> Merged Rails and React translation sources into a single JSON source of truth to eliminate wording drift between the two frontends.

### 🐛 Fixed

#### ⚙️ Rails Settings

> Fixed live-preview bugs for theme and coordinate toggles.

#### 🔄 Board Orientation

> Fixed a critical bug where board orientation didn't flip when the trainee's side changed during a review session.

#### 🚢 Deployment

> Fixed Nginx configuration issues (resolver errors) and ensured `rails/bin` scripts have correct executable permissions in Linux environments.

#### 💎 UI Polish

> Wired the `bestStreak` stat into the Rails puzzles page.

---

## August 21, 2026

### ✨ Added

#### 🧪 E2E Test Suite

> Added comprehensive Playwright tests covering the entire user journey: registration, email verification, training flows, and settings persistence.

#### 🗺️ Route Mapping

> Added a Mermaid flowchart to the React documentation mapping all guarded and public routes.

### ⚡ Improved

#### 🏗️ Component Architecture

> Refactored duplicated markup into reusable React components: `AuthCard`, `SettingsToggleRow`, `ProgressStat`, and `apiErrorMessage`.

### 🐛 Fixed

#### 🔐 Auth Interceptor

> Fixed a loop where 401 errors on the login page triggered a refresh flow that wiped out "Invalid credentials" error messages.

#### ♿ Accessibility

> Fixed `aria-level` violations on the dashboard greeting and resolved contrast issues on group labels.

I have captured the remaining entries from your logs. I've continued using the **H4 headers + Blockquotes** to maintain those visual rails and the high-contrast spacing that helps with tracking.

---

## August 20, 2026

### ✨ Added

#### ⚒️ Khuzdul & Sindarin Locales

> Added Tolkien-inspired locales. Khuzdul includes attested vocabulary (Baruk!) and a pickaxe emoji; Sindarin includes complete translations and an elf emoji.

#### 🏠 Dashboard Greeting

> Moved the "Good morning/afternoon/evening" greeting from the crowded site header to a new `.dashboard-stack` on the main page for better readability.

#### 💡 Hint Auto-Escalation

> Implemented a system that automatically provides hints after repeated failures: 2 misses reveal the source square, and 4 misses reveal the target square with an arrow.

#### ♿ Board Accessibility Extension

> Integrated the `cm-chessboard` Accessibility extension. Screen readers now receive a hidden description of the position and braille notation in the SVG alt text.

#### 🛡️ Registration Disclaimer

> Added a small disclaimer under the email field reassuring users that emails are collected solely for bot prevention.

### 🐛 Fixed

#### 🧹 I18n Cleanup

> Removed 19 unused translation keys across 35 locale files to ensure the translation set is lean and consistent.

#### 📐 Layout Overflow

> Fixed a bug where `.card` elements would overflow the right edge of the screen when placed inside the new dashboard column layout.

#### ⚙️ Settings Preview Board

> Resolved a bug where the preview board stopped accepting moves after changing a board style preference by implementing a `boardVersion` counter.

#### 🛠️ Accessibility Refinement

> Fixed two bugs in the Accessibility extension: prevented `TypeErrors` on read-only boards and stopped the board from rebuilding entirely on every move submission.

---

## August 19, 2026

### ✨ Added

#### 🎨 New Piece Sets

> Added Merida, Pirouetti, and Chessnut piece sets (sourced from Lichess) to the Settings switcher.

#### 🎉 Win Celebrations

> Added `canvas-confetti` bursts to celebrate completed training sessions and correct puzzle answers.

#### ❄️ Snow Effect

> Added a local-only "snow" toggle in Settings for a visual easter egg.

#### 🔊 Sound System

> Implemented a full sound preferences system, including feedback sounds for moves and a master mute toggle.

#### 👤 User Preferences System

> Created a `PreferencesContext` that syncs theme, language, and board look (skin, pieces, coordinates, animations) to the backend for logged-in users.

#### 🔄 Training Flow Improvements

> Replaced the "Session complete" dead-end with "Train again" and "Choose another opening" actions.

### 🐛 Fixed

#### ❄️ Snow Loop

> Fixed a bug where the snow effect continued falling for 15 seconds after being disabled.

#### 🖼️ Piece Sprite Caching

> Disabled `assetsCache` in `cm-chessboard` to ensure that changing piece sets in Settings actually updated the board visuals.

#### 🌍 Locale Corrections

> Fixed mislabeled translation files for Danish (was Norwegian) and Ukrainian (was Slovak).

### ⚡ Improved

#### 🎚️ UI Toggles

> Converted appearance checkboxes (coordinates, animations, sound, snow) into modern toggle switches.

### 🛠️ Infrastructure & Docs

#### 🏗️ CI/CD Gating

> Updated `deploy.yml` to gate production deployments on the success of lint and test workflows.

#### 📦 Project Cleanup

> Stopped deploying the legacy Angular frontend and adopted formal Semantic Versioning starting at `v1.0.0`.

#### 🌏 Asian Locale Support

> Added Hindi, Japanese, Chinese, and Korean locales.

---

## August 17, 2026

### ✨ Added

#### 📧 Localized Emails

> Added per-user language support for account verification emails.

#### 🛠️ Translation Sync Script

> Created `scripts/sync-locales.mjs` to allow `en.json` to act as the single source of truth for all translation keys across all locales.

#### 🌍 Expanded Language Support

> Added French, German, Italian, Dutch, Polish, Portuguese, Russian, and Turkish locales.

#### 🖖 Fantasy Locales

> Added "Klingon" (English with canonical interjections) and "Groot" (where most text is replaced with "I am Groot" variants).

#### 🎨 Dashboard Color Filter

> Added a White/Black filter to the opening cards grid, automatically classifying "Defense" openings as Black's repertoire.

#### 🔄 Auto-Orienting Thumbnails

> Opening card thumbnails and previews now automatically flip to the correct side (e.g., Black-at-bottom for defenses) and update live when the user toggles their perspective.

### 🐛 Fixed

#### 🧹 Dead Key Removal

> Dropped unused `language.english` and `language.spanish` keys from the translation files.

#### ⏳ Memory Leaks

> Guarded `submitMove` and `loadNext` against state updates after a component unmounts and cleared pending timeouts to prevent intermittent test failures.

### 🧪 Testing

#### 🧪 Testing Library Linting

> Added `eslint-plugin-testing-library` to identify and fix missing `findBy` waits and redundant manual cleanups in the test suite.

I have processed the rest of your history. To keep this readable and prevent the "wall of text" effect, I have grouped the smaller, older updates logically while keeping that same **H4 header + Blockquote** structure.

This ensures you have the visual "rails" all the way back to the start of the project.

---

## August 20, 2026

### ✨ Added

#### ⚒️ Khuzdul & Sindarin Locales

> Added Tolkien-inspired locales. Khuzdul includes attested vocabulary and a pickaxe emoji; Sindarin includes complete translations and an elf emoji.

#### 🏠 Dashboard Greeting

> Moved the "Good morning/afternoon/evening" greeting from the site header to a new `.dashboard-stack` on the main page for better readability.

#### 💡 Hint Auto-Escalation

> Implemented a system that automatically provides hints after repeated failures: 2 misses reveal the source square, and 4 misses reveal the target square.

#### ♿ Board Accessibility Extension

> Integrated the `cm-chessboard` Accessibility extension. Screen readers now receive a hidden description of the position and braille notation.

#### 🛡️ Registration Disclaimer

> Added a disclaimer under the email field reassuring users that emails are collected solely for bot prevention.

### 🐛 Fixed

#### 🧹 I18n Cleanup

> Removed 19 unused translation keys across 35 locale files to ensure the translation set remains lean.

#### 📐 Layout Overflow

> Fixed a bug where `.card` elements would overflow the right edge of the screen in the new dashboard column layout.

#### ⚙️ Settings Preview Board

> Resolved a bug where the preview board stopped accepting moves after changing a board style preference.

---

## August 19, 2026

### ✨ Added

#### 🎨 New Piece Sets

> Added Merida, Pirouetti, and Chessnut piece sets (sourced from Lichess) to the Settings switcher.

#### 🎉 Win Celebrations

> Added `canvas-confetti` bursts to celebrate completed training sessions and correct puzzle answers.

#### 🔊 Sound System

> Implemented a full sound preferences system, including feedback sounds for moves and a master mute toggle.

#### 👤 User Preferences System

> Created a `PreferencesContext` that syncs theme, language, and board look (skin, pieces, coordinates) to the backend.

### ⚡ Improved

#### 🎚️ UI Toggles

> Converted appearance checkboxes (coordinates, animations, sound, snow) into modern toggle switches.

### 🛠️ Infrastructure

#### 🏗️ CI/CD Gating

> Updated deployment workflows to gate production releases on the success of lint and test workflows.

---

## August 17, 2026

### ✨ Added

#### 🌍 Expanded Language Support

> Added French, German, Italian, Dutch, Polish, Portuguese, Russian, Turkish, and "Fantasy" locales (Klingon and Groot).

#### 🛠️ Translation Sync Script

> Created `scripts/sync-locales.mjs` to allow `en.json` to act as the single source of truth for all translation keys.

#### 🎨 Dashboard Color Filter

> Added a White/Black filter to the opening cards grid, automatically classifying "Defense" openings as Black's repertoire.

#### 🔄 Auto-Orienting Thumbnails

> Opening card thumbnails now automatically flip to the correct side (e.g., Black-at-bottom for defenses).

### 🐛 Fixed

#### ⏳ Memory Leaks

> Guarded `submitMove` and `loadNext` against state updates after a component unmounts to prevent intermittent test failures.

---

## August 16 – 14, 2026

### ✨ Added

#### ♟️ Black-Side Training

> Full support for playing the Black side. Training sessions now carry a `player_color` and all board logic is now color-aware.

#### 🛡️ Email Verification Gating

> Gated email verification behind a configuration flag to allow for SES sandbox testing.

### ⚡ Improved

#### 🎨 Shared Styling

> Centralized CSS shared between React and Angular into `packages/shared-styles/` to ensure visual consistency.

#### ⚙️ Core Logic Extraction

> Extracted timeline history and session-state derivation into pure `@knight-school/chess-core` modules.

---

## August 13, 2026

### ✨ Added

#### 🏗️ Angular Parity

> Brought the Angular frontend (Header, Dashboard, Training, Login) to feature parity with the React version.

#### 🧩 Framework-Neutral Board

> Replaced `react-chessboard` with a `cm-chessboard` wrapper, allowing the same board component to be used across different frameworks.

#### 📊 Dataset-Driven Training

> Replaced static MVP items with real `Opening` rows, making training session selection deterministic.

---

## July 28 – 20, 2026

### ✨ Added

#### 🖼️ Opening Board Previews

> Added prominent board previews and selection gating to the Dashboard.

#### 📉 Session Tracking

> Implemented `isSessionCompleted` tracking to better handle training flow.

### ⚡ Improved

#### 🎨 Dashboard UI

> Reorganized dashboard CSS, updated icons to SVG components, and added light/dark mode screenshots.

#### 🧪 Vitest Integration

> Integrated `vitest` and added initial tests for the `useTrainingSession` hook.

---

## July 18 – 8, 2026 (The MVP Era)

### 🚀 Core Foundation

#### 🔑 Auth & Training MVP

> Wired together the initial login/register flow, JWT authentication, and the basic training session loop.

#### 🏗️ Architecture Setup

> Established the project structure: Rails/FastAPI backend, React frontend, and Dockerized deployment.

#### 📖 Documentation

> Overhauled the README into professional documentation and added the initial project LICENCE.

#### 🗄️ Database Schema

> Built the initial Openings table and enriched the import process to include ECO and move index metadata.
