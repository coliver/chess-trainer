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

  **Newly discovered while doing that:** `register.component.ts` has a bigger gap than Login
  did — React's `Register.tsx` also has a password-confirmation field, sends
  `language: i18n.language` on register, and (correctly) does NOT auto-navigate to `/login` on
  success — it shows a persistent "check your email" message with a manual "return to login"
  link, since the account isn't usable until email verification completes. Angular's
  `register.component.ts` has none of that: no password confirm, doesn't send `language`,
  hardcoded English, and auto-navigates to `/login` immediately on success (arguably a bug,
  since it skips past the just-added success message with no time to read it). Not fixed in
  this pass — bigger than a like-for-like i18n port, needs its own pass.
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

Also entirely absent as concepts: sound feedback (`useSound.ts`, `utils/sound.ts`), snow effect
(`utils/snow.tsx`, `useSnowPreference.ts`), win-celebration confetti
(`utils/winCelebration.ts`). Note: Angular's `training.component.ts` already has its own local
`blinkGreen` correct-move flash (parity with `useBlinkGreen.ts`) — don't redo that one.

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

## Suggested backport order

1. i18n plumbing (§1) — everything else touches translated strings.
2. API client single-flight refresh fix + missing service methods (§2).
3. Header split (HomeHeader/GameHeader) + OverflowMenu (§4, §5).
4. Settings page + PreferencesService (§3, §5's SettingsToggleRow/RadioGroup).
5. PuzzleThemes page (§3).
6. VerifyEmail page + resend-verification (§3).
7. Remaining small components: sound, snow, win-celebration, ProgressStat, RandomQuote,
   FenTurnBadge, AuthCard (§5).
