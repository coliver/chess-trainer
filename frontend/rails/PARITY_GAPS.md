# Rails vs React parity gap list

Snapshot from a 2026-09-04 audit of `frontend/react` against `frontend/rails`. Rails has been
kept up to date via its own commit stream (unlike Angular, which had a long frozen period), so
this audit checks it fresh on its own merits rather than assuming it shares Angular's gaps.

## 1. Puzzle multi-move handling — regressed relative to Angular

**Status: landed 2026-09-04.** `puzzle_controller.js`'s `submitAttempt()` now branches three ways
(`correct && puzzleComplete` / `correct` alone / incorrect), mirroring Angular's post-§9 fix:
a correct-but-incomplete answer applies `opponentReplyUci` (via the existing `lastMoveUci`
render path), advances `correctMoveUci` to `nextCorrectMoveUci`, and increments `moveIndex`
instead of reloading a new puzzle. `moveIndex`/`solverMovesTotal` are now Stimulus values seeded
from `PuzzlesController#assign_puzzle` and sent back on `POST /puzzles/:id/attempts` via
`create_attempt`. Covered by two new request specs in `spec/requests/puzzles_spec.rb` (the
`moveIndex`/`solverMovesTotal` data attributes render, and `move_index` is forwarded on attempt
submission). Note: the JS branching logic itself has no unit-test coverage — this project has no
JS test runner for Stimulus controllers (only esbuild), matching how the rest of
`puzzle_controller.js` was already untested before this fix.

## 2. Puzzle prev/next navigation + hint tracking

**Status: not started** (same gap as Angular). React's `Puzzles.tsx` (shipped 2026-09-04) added
session-local prev/next stepping through already-fetched puzzles (`HistoryEntry[]`/
`historyIndex`, read-only replay when going back) and sends a `usedHint` flag on
`POST /puzzles/{id}/attempts`. Rails has no history state, no prev/next buttons, and no hint UI
at all (no hint button, no `deriveHintMarkers` equivalent).

**To port:** add history/prev-next state to `puzzle_controller.js`, Prev/Next buttons to
`views/puzzles/show.html.erb`, and send `usedHint` on attempt submission (the backend already
accepts it).

## 3. Puzzle rail layout — partially landed

**Status: partially landed.** `frontend/rails/app/views/puzzles/show.html.erb` already uses the
modern rail markup (`rail-eyebrow`, `rail-title`, `eco-chip`, `puzzles-stats` stat pills) — ahead
of Angular's older layout. Missing, all downstream of §1/§2: a move-progress chip
(`puzzles.moveProgress`, "Move 2 of 3"), per-puzzle theme chips (`.puzzles-theme-chip`), and
Prev/Next buttons — Rails still auto-reloads on a timeout instead of showing a "Next puzzle"
button. Compare React's rail block in `Puzzles.tsx` (lines ~488-568).

## 4. Dashboard — mostly landed, one real gap

**Status: mostly landed.** The troubleSteps/needs-work section is fully ported:
`views/dashboard/show.html.erb` (lines 55-133) renders the same `ws-tile`/`ws-grid`/
`ws-expanded` structure as React's `Dashboard.tsx`, backed by `needs_work_controller.js`, with
`DashboardController#show` fetching `/progress/weak-spots` and `/progress/step-accuracy`. The
White/Black/All opening-browser color filter also landed (`_opening_browser.html.erb` lines
30-38 + `@color_filter` in `dashboard_controller.rb`).

**Gap found:** no "Puzzles" progress-group section at all — `dashboard_controller.rb` never
calls `/puzzles/summary`, so there's no puzzlesSeen/accuracy/mastered stat block or "Practice
puzzles" button (React `Dashboard.tsx` lines 560-598). Also missing: the mobile `stat-tabs`
toggle (React lines 296-318) and the "popular openings" carousel section
(`showCarousel`/`opening-carousel` in React, absent from `_opening_browser.html.erb`).

**To port:** add a puzzles progress-group section (backend call + view block), the mobile
stat-tabs toggle, and the popular-openings carousel.

## 5. Settings — snow toggle and interactive preview missing

**Status: not started.** No snow toggle anywhere in `views/settings/show.html.erb` or elsewhere
under `frontend/rails/app/` — the locale key `settings.appearance.snowLabel` already exists in
the shared JSON but is never wired to a UI element, and there is no snow-effect animation in the
Rails layout at all (React has `useSnowPreference`/`lib/snow.ts`; Angular ported it to
`snow-preference.service.ts`). The settings preview board is also non-interactive:
`board_preview_controller.js` only calls `createPreviewBoard`, with no move input and no
preview-move sound, versus React's `Settings.tsx` `previewOnMove` (plays a sound via
`useSound`). The main sound on/off toggle does exist and works correctly
(`settings_controller.rb`, read by `puzzle_controller.js`/`training_controller.js`).

**To port:** add a snow toggle row + snow animation, and wire move input + a preview-move sound
into the settings preview board.

## 6. i18n coverage — landed, ahead of Angular in one respect

**Status: landed.** Rails doesn't hand-maintain per-language YAML (only `config/locales/en.yml`
for Rails-only strings) — instead `config/initializers/i18n_json_loader.rb` transforms every file
in `frontend/packages/i18n-locales/locales/*.json` (all 37 locales) into Rails I18n's native
shape at boot, so all 37 locales are actually usable via Rails' own `t()`, not just English.
`ApplicationController#set_locale` reads the language from `session[:preferences]["language"]`.
Stimulus-side strings are bridged via `ApplicationHelper#js_translations` into a
`<script id="i18n-strings">` blob read by `app/javascript/i18n.js`.

**Minor gap:** `RegistrationsController#create` hardcodes `language: "en-US"` on the register API
call (`registrations_controller.rb` line 15) instead of the user's currently-selected language,
unlike React's `Register.tsx` which sends `translate.lang()`.

## 7. Missing pages — none, full page parity

**Status: landed.** Rails has controller+view pairs for all nine: Login (with 403-email-not-
verified handling and resend-verification), Register (password-confirmation check, persistent
"check your inbox" view), VerifyEmail, PuzzleThemes (including mate-position board previews via
`puzzle_theme_board_controller.js`), Settings, Dashboard, Training, and Puzzles.

## 8. Mobile bottom tab bar

**Status: landed 2026-09-04, matches.** `views/layouts/_header.html.erb` (lines 35-53) renders
`.bottom-tabbar` with Dashboard/Puzzle-themes/Settings links, active-state via
`request.path.start_with?(...)`, gated on `logged_in?` — equivalent to React's `HomeHeader.tsx`.
Icons are hand-rolled inline SVG vs React's `lucide-react` icons (cosmetic only).

## 9. Training "session completed" screen

**Status: landed, matches.** `views/trainings/show.html.erb` (lines 72-77) has a
`completedControls` block (Train again / Choose another opening) toggled by
`training_controller.js` based on `isSessionCompleted` — matches React's `Training.tsx`.

## Suggested backport order

1. ~~Puzzle multi-move handling fix (§1)~~ — landed 2026-09-04.
2. Puzzle prev/next + hint tracking (§2), then the rail UI pieces that depend on it (§3).
3. Dashboard puzzles progress-group + stat-tabs + carousel (§4).
4. Settings snow toggle + interactive preview sound (§5).
5. Minor: send active locale on register instead of hardcoded `en-US` (§6).
