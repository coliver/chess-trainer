# Angular vs React parity gap list

Snapshot from a 2026-08-27 audit of `frontend/react` against `frontend/angular`. This is the
backport punch list, ordered by foundational impact (do earlier items first — later items
depend on them). Angular is being actively brought back up to parity (no longer frozen/unwired
— it's back in `docker-compose.yml` and nginx as of 2026-08-27).

## 1. i18n infrastructure — missing entirely in Angular

**Status: landed 2026-08-27.** `TranslateService`/`TranslatePipe`/`LanguageToggleComponent`
added under `core/i18n/`, wired into header/theme-toggle/flip-board-button. Still open: the
rest of §5's components, and replacing hardcoded strings across the page components listed in
§3/§4 below with `| translate`.

React uses `i18next` + `react-i18next`, initialized in `frontend/react/src/i18n/i18n.ts`. It
loads 37 JSON locale files via `import.meta.glob` from the shared
`frontend/packages/i18n-locales/locales/*.json`. Language is persisted to
`localStorage["language"]`, synced with `<html lang>`, and toggled via
`frontend/react/src/components/LanguageToggle.tsx`. Every React page/component calls `t(...)`.

Angular has zero i18n setup — no ngx-translate, no Angular i18n, hardcoded English strings
throughout (`header.component.ts`, `login.component.ts`, `dashboard.component.ts`, etc.).

**To port:** add `@ngx-translate/core` (or similar) wired to the same
`frontend/packages/i18n-locales/locales/*.json` files, a language-toggle component, and replace
hardcoded strings with translation keys (the keys already exist in the shared locale JSON under
`header.*`, `settings.*`, `puzzleThemes.*`, `auth.verifyEmail.*`, etc. — just needs wiring).

## 2. API client — token-refresh race condition + missing endpoints

**Status: landed 2026-08-27.** `auth.interceptor.ts` now shares a single in-flight
`/auth/refresh` call across concurrent 401s (module-level `Observable` + `shareReplay(1)`,
mirroring `api.ts`'s `refreshPromise`). Added `AuthService.verifyEmail`/`resendVerification`,
`PuzzlesService.themes()`, and a new `PreferencesService` (`get`/`update` against
`/api/users/me/preferences`). These are service-layer only — the pages that consume them
(Settings, VerifyEmail, PuzzleThemes) are still §3/§4 below.

`frontend/react/src/api.ts` uses a single-flight refresh (shared `refreshPromise`) so concurrent
401s only trigger one `/auth/refresh` call. Angular's
`frontend/angular/src/app/core/auth.interceptor.ts` has no single-flight guard — concurrent 401s
will each independently POST `/auth/refresh`, which can invalidate each other if the backend
single-uses/rotates refresh tokens. This is a correctness bug, not just a missing feature.

React also calls these endpoints with no Angular equivalent:
- `GET /users/me/preferences`, `PATCH /users/me/preferences` — `PreferencesContext.tsx`
- `GET /auth/verify-email` — `VerifyEmail.tsx`
- `POST /auth/resend-verification` — used from Register/Login flow
- `GET /puzzles/themes` — `PuzzleThemes.tsx`

**To port:** add `PreferencesService`, verify-email/resend-verification methods on
`AuthService`, a `themes` method on `PuzzlesService`, and fix `auth.interceptor.ts` to share a
single in-flight refresh Observable (e.g. `shareReplay(1)` reset on completion).

## 3. Missing pages (no Angular route/component at all)

- **Settings** — **Status: landed 2026-08-27** (minus the snow toggle's actual effect and
  sound-on-preview-move, both of which depend on §5's still-unported snow/sound utilities —
  the toggles themselves persist correctly, they just don't do anything visible yet).
  `frontend/react/src/pages/Settings.tsx` ported to `pages/settings/settings.component.ts`,
  backed by a new `PreferencesStoreService` (signal-based stand-in for `PreferencesContext`),
  `core/preferences.ts` (ported from `preferences.ts`), and
  `shared/settings-toggle-row.component.ts` / `shared/settings-radio-group.component.ts`. The
  live interactive preview reuses the existing `BoardComponent` from training. Route added at
  `/settings` (guarded). `AuthService` gained a `loggedIn` signal so the store can react to
  login/logout, and `LanguageToggleComponent` now routes language changes through the store
  instead of calling `TranslateService` directly, matching React's actual architecture (single
  writer, avoids the two fighting each other).
- **VerifyEmail** — **Status: landed 2026-08-27.** Ported to
  `pages/verify-email/verify-email.component.ts`, route at `/verify-email` (unguarded, matching
  React). Reads `?token=`, calls `AuthService.verifyEmail()`, shows loading/success/error
  states.
  **Status: landed 2026-08-27.** `login.component.ts` now handles the 403 "Email not verified"
  response with a resend-verification button (`AuthService.resendVerification()`) and is fully
  i18n'd, matching React's `Login.tsx`.

  **Status: landed 2026-08-27.** `register.component.ts` now has a password-confirmation field
  (checked client-side, `auth.register.passwordMismatch` on mismatch), sends
  `language: translate.lang()` on register, shows a persistent "check your inbox" success
  message (email interpolated into a sanitized `[innerHTML]` binding, matching React's `Trans`
  usage) instead of auto-navigating to `/login`, and is fully i18n'd. `AuthService.register()`
  gained a `language` parameter.
- **PuzzleThemes** — **Status: landed 2026-08-27.** Ported to
  `pages/puzzle-themes/puzzle-themes.component.ts` + `lib/puzzle-themes.ts` (`THEME_GROUPS`,
  `MATE_FENS`, `formatThemeLabel`, `themeIcon`), route at `/puzzles/themes` (guarded), fetches
  `/api/puzzles/themes` counts, links to `/puzzles?theme=X`. Note: that `?theme=` query param
  isn't consumed by `PuzzlesComponent` yet (no theme-filtered fetch, no "practicing X" banner,
  no theme chips) — React's `Puzzles.tsx` has this wired up but it's a separate, still-open
  piece of parity work, not tracked as its own item here yet.

`frontend/angular/src/app/app.routes.ts` only defines `login`, `register`, `dashboard`,
`training/:id`, `puzzles` — no `/settings`, `/verify-email`, `/puzzles/themes` routes exist.

## 4. Header architecture has diverged

**Status: landed 2026-08-27.** Split into `HomeHeaderComponent` (hamburger + brand + tabs) and
`GameHeaderComponent` (back/status/settings), routed by URL in `app.component.ts`/`.html`
matching React's `AppHeader()`. Added `OverflowMenuComponent` (focus trap, Escape, outside-click
— rendered in place rather than portalled to `<body>`, since `.overflow-menu` is already
`position: fixed`) and a `GameStatusService` (plain signal-based service standing in for
React's `GameHeaderContext`). The old single `header.component.ts` was deleted, not kept as
dead code. Note: the settings link/gear navigates to `/settings`, which doesn't exist yet
(§3 above) — it redirects to the dashboard via the wildcard route until that lands, same as
React before its Settings page shipped.

React replaced its single `Header.tsx` (now dead code) with two headers in `App.tsx`:
- `HomeHeader.tsx` — hamburger menu (`OverflowMenu.tsx`) for dashboard/puzzles, tab nav.
- `GameHeader.tsx` — minimal header for training/puzzle screens: back button, live status text
  (`GameHeaderContext.tsx`), settings gear linking to `/settings`.

Angular's `header.component.ts` is still the old single-header pattern (login/register/logout
icon buttons, GitHub link, greeting, `ThemeToggleComponent`) used everywhere via
`app.component.ts`. No overflow menu, no language toggle, no settings link, no minimal game
header.

**To port:** split into `HomeHeaderComponent` + `OverflowMenuComponent` and
`GameHeaderComponent` with a shared status context, routed by URL in `app.component.ts` like
React's `AppHeader()`.

## 5. Shared UI components with no Angular counterpart

Only `flip-board-button`, `header`, `knight-school-icon`, `theme-toggle` exist under
`frontend/angular/src/app/shared/`. Missing:

| React component | Purpose |
|---|---|
| `LanguageToggle.tsx` | i18next language switch (blocked on §1) |
| `SettingsToggleRow.tsx` | settings on/off row |
| `SettingsRadioGroup.tsx` | settings radio group |
| `OverflowMenu.tsx` | hamburger dropdown |
| `AuthCard.tsx` | shared login/register/verify-email card shell |
| `ProgressStat.tsx` | dashboard stat display (used 8x in `Dashboard.tsx`) |
| `RandomQuote.tsx` | dashboard motivational quote |
| `FenTurnBadge.tsx` | turn indicator badge |
| `GameHeaderContext.tsx` | status text shared into `GameHeader` |

**Status: `AuthCard`/`ProgressStat` landed 2026-08-27.** `shared/auth-card.component.ts` and
`shared/progress-stat.component.ts` added, and `login`/`register`/`verify-email` (AuthCard) and
`dashboard` (ProgressStat, both progress rows) refactored to use them. Dashboard's stat icons
(♟️ 🎯 📅 🏆 🧩) were also added while doing this — Angular didn't have them, React does.
`RandomQuote.tsx` and `FenTurnBadge.tsx` were checked and are dead code in React itself (defined
and unit-tested, but not imported by any page) — not ported, nothing to port.

**Status: sound/snow/win-celebration landed 2026-08-27.** `core/sound.service.ts` (port of
`utils/sound.ts` + `hooks/useSound.ts`), `core/snow-preference.service.ts` (port of
`useSnowPreference.ts`, using a signal instead of `useSyncExternalStore` since an injected
service already gives every consumer the same reactive value), `lib/snow.ts`, and
`lib/win-celebration.ts` all added — `canvas-confetti` added as a dependency
(`package-lock.json` regenerated with `npm install --package-lock-only`, since `npm ci` requires
it in sync). Sound files are synced from `packages/shared-assets/sounds/` the same way locale
JSON is (`scripts/sync-shared-assets.mjs`, gitignored `public/sounds/`, wired into the
Dockerfile and every `npm run` sync step). Wired into `app.component.ts` (the periodic snow
animation, gated on `SnowPreferenceService`), `settings.component.ts` (a snow toggle row that
was **entirely missing from the page**, not just inert as previously noted here — plus the
preview-move sound), `training.component.ts` (gameStart/correct/achievement/incorrect/
moveOpponent/illegal sounds + `celebrateWin()`), and `puzzles.component.ts`
(puzzleCorrect/puzzleWrong/illegal/move sounds + `celebratePuzzleCorrect()`). Note: Angular's
`training.component.ts` already has its own local `blinkGreen` correct-move flash (parity with
`useBlinkGreen.ts`) — that one wasn't touched.

## 9. Angular's puzzle attempts didn't handle multi-move puzzles

**Status: landed 2026-08-27.** Confirmed the backend already fully supported this (fixed there
2026-08-24, per project history) — `PuzzleNextResponse`/`PuzzleAttemptResponse` in
`backend/app/routers/puzzles.py` already return `lastMoveUci`/`moveIndex`/`solverMovesTotal` and
`puzzleComplete`/`opponentReplyUci`/`nextCorrectMoveUci`/accept `moveIndex`; this was a
frontend-only gap. `core/puzzles.service.ts`'s `NextPuzzle`/`PuzzleAttemptResult` types widened
to match, `submit()` now sends `moveIndex`, and `puzzles.component.ts`'s submit handler branches
three ways (`correct && puzzleComplete` / `correct` alone / incorrect) instead of two — a
correct-but-incomplete answer now applies `opponentReplyUci` (highlighted via a new `'lastmove'`
marker kind added to `board.component.ts`'s `BoardMarkerKind`, wired to an already-existing but
previously-unused `.marker-square-lastmove` CSS rule in `shared-styles/board.css`), advances to
`nextCorrectMoveUci`, and increments `moveIndex` — staying interactive instead of reloading.
`skip()`/reload-after-complete behavior is unchanged from before.

## 8. Dashboard/Training/Puzzles pages were never i18n'd

**Status: landed 2026-08-27.** All three pages now route their existing strings through
`TranslatePipe`/`TranslateService`, using the same locale keys React already had (no new keys
needed — the shared JSON already carried them). This was a pure i18n pass: Angular's markup was
translated as-is, not restructured to match React's current layout. Along the way this surfaced
that Angular's Dashboard/Training/Puzzles pages have real *structural* gaps versus React beyond
missing translations — logged as a new §10 below, not fixed here.

Two spots were deliberately left hardcoded because React doesn't translate them either (both in
Dashboard's opening search): the "No openings match…try a name (Sicilian) or an ECO code (B90)"
empty-state text, and the "Show N more" button. Also left untouched: Dashboard's "Weak spots"
list block (`progress-weak-spots`), which has no equivalent structure or locale key in React (see
§10) — forcing an approximate key onto it would have been a mismatch, not a translation.

Originally: found while wiring `ProgressStat` into `dashboard.component.ts` that it (and
`training.component.ts`, `puzzles.component.ts`) was hardcoded English throughout — zero
`| translate` usage versus 35/9/12 `t()` calls in React's `Dashboard.tsx`/`Training.tsx`/
`Puzzles.tsx`. §1 had flagged "the rest of the page components" as open when i18n plumbing
landed, but these three biggest pages hadn't been called out as their own item until now.

## 10. Newly discovered: Dashboard/Training/Puzzles have structural gaps beyond i18n

Found while doing the §8 i18n pass — these pages don't just lag on translation, their Angular
markup diverges from React's current structure:

- **Dashboard**: React has a `troubleSteps` section (per-move accuracy, "trickiest move" tile,
  common-wrong-move callouts) and a needs-work expand/collapse list — Angular has neither.
  React also has a White/Black/All color filter for the opening browser — Angular doesn't.
  Angular's own "Weak spots" list block (plain list, no expand) has no React equivalent at all —
  it looks like an earlier, simpler design that wasn't removed when React's richer
  `ws-tile`/`ws-grid` layout replaced it.
- **Training**: React shows a distinct "session completed" screen (Train again / Choose another
  opening buttons) — Angular has no such state; the regular controls just stay visible.
- **Puzzles**: **Status: landed 2026-09-05.** Ported to the same `train-rail` layout as Training
  (`rail-head`/`rail-eyebrow`, `eco-chip`s for rating and move-progress, `stat-pill`s for
  solved/streak, `puzzles-theme-chip`s for the puzzle's own themes, status banner via
  `classifyFeedback` from chess-core) — replacing the older flat `puzzles-header`/`puzzles-meta`
  layout. The "Next puzzle" focus management already existed (`nextBtnRef`). Verified visually via
  a throwaway Playwright screenshot against the dev server. Note: the `?theme=` query-param
  filtering (linking from PuzzleThemes into a themed session, "Practicing: X" chip) is still not
  consumed by `PuzzlesComponent` — that remains open, tracked separately, not part of this layout
  port.

None of this was fixed in the i18n pass — these are real feature/redesign gaps, not translation
gaps, and each is sized more like its own item than a quick follow-on. Not started.

## 6. Shared packages — consumed correctly, not stale

Both `react/package.json` and `angular/package.json` reference `@knight-school/chess-core` via
the same `file:../packages/chess-core` link. `angular/src/styles.css` imports the same
`packages/shared-styles/*.css` files React does, except it's missing `login.css` and
`settings.css` (consistent with those pages not existing yet). `packages/i18n-locales/` and
`packages/shared-assets/` exist but Angular consumes neither — i18n-locales is §1;
shared-assets drift wasn't checked in detail.

## 7. Already done — do not re-port

- "Angular Parity" (CHANGELOG, 2026-08-13): Header/Dashboard/Training/Login brought to parity —
  predates Settings/VerifyEmail/PuzzleThemes/i18n, which all shipped after.
- Black-side play (`player_color`) — already implemented in `training.service.ts` /
  `training.component.ts`, matches React's `useTrainingSession.ts`.
- Shared CSS centralization into `packages/shared-styles/` — done.
- `chess-core` extraction — done and shared correctly.

## 11. Puzzle prev/next navigation + hint tracking (new gap)

**Status: landed 2026-09-05.** Ported session-local puzzle history navigation and hint tracking
from React's `Puzzles.tsx` to Angular's `puzzles.component.ts`. Added a `HistoryEntry` state
model tracking each fetched puzzle's final state, hint usage, and solve status; `historyIndex`
navigation backwards through completed puzzles (read-only replay showing each puzzle's initial
position); hint escalation (dot -> arrow) with auto-escalation after wrong attempts; and
`usedHint` flag sent on attempt submission. `PuzzlesService.submit()` now accepts a `usedHint`
parameter. Updated `BoardComponent` to support arrows visualization (new `Arrows` extension
from cm-chessboard, with a marker-clearing fix to prevent ghost highlights on subsequent
refreshes). Removed the old `setTimeout(loadNext)` auto-advance on puzzle completion, requiring
explicit "Next" click instead (matching React's interaction model). Note: the §10 train-rail
visual redesign (theme chips, stat pills, eyebrow) remains unported as a separate gap.

## 12. Mobile bottom tab bar (new gap, landed 2026-09-04)

**Status: landed 2026-09-04.** React's mobile-first dashboard redesign (2026-08 CSS makeover)
added a fixed bottom tab bar (`.bottom-tabbar`, `shared-styles/header.css`) for
Openings/Puzzles/Settings on phone widths, but only `HomeHeader.tsx` ever used it — the CSS
shipped shared, the markup didn't reach Angular or Rails. Ported to
`shared/home-header.component.ts`: an `@if (auth.isLoggedIn)` block with three `routerLink`s and
hand-rolled SVG icons (matching the component's existing hamburger-icon style rather than adding
an icon library), plus an `isSettingsActive()` signal alongside the existing
`isOpeningsActive()`/`isPuzzlesActive()`. No new CSS or i18n keys needed — both already existed.

## Suggested backport order

1. i18n plumbing (§1) — everything else touches translated strings.
2. API client single-flight refresh fix + missing service methods (§2).
3. Header split (HomeHeader/GameHeader) + OverflowMenu (§4, §5).
4. Settings page + PreferencesService (§3, §5's SettingsToggleRow/RadioGroup).
5. PuzzleThemes page (§3).
6. VerifyEmail page + resend-verification (§3).
7. Remaining small components: sound, snow, win-celebration, ProgressStat, RandomQuote,
   FenTurnBadge, AuthCard (§5).
