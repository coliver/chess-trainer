This layout prioritizes "air" and visual anchors. The `####` headers provide a large, clear target for your eyes, and the blockquote (`>`) creates a vertical line on the left, which acts as a rail to help you track the text and prevent lines from blending together.

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
