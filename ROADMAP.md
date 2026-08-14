# 🗺️ Roadmap

Forward-looking, planned work. Completed work is recorded in
[`CHANGELOG.md`](./CHANGELOG.md); this file is intentionally short and gets pruned as items ship.

## 🧩 Frontend parity follow-ups (React → Angular)

The goal is that Angular *re-wraps* shared logic rather than rewriting it. Remaining logic still
living in React-specific files:

- **Extract the timeline** (the `fens`/`indices` history in `react/src/pages/Training.tsx`) into a
  pure reducer in `@knight-school/chess-core`.
- **Extract the session state machine** (`react/src/hooks/useTrainingSession.ts`: fetch-next /
  submit / advance) into a framework-neutral module that emits state, so React and Angular only
  supply the thin reactivity layer (hooks vs. signals/RxJS).

## ♞ Phase 4 — Engine analysis

Integrate a chess engine (e.g. Stockfish via WASM) so users get position
evaluations and best-move suggestions, and can review training mistakes with
engine feedback instead of just right/wrong against the opening line. Not yet
designed in detail (Phases 1–3 — progress tracking, streaks/mastery/review-due,
Lichess puzzles — are shipped; see CHANGELOG.md).

## 🌱 Smaller / nice-to-have

- **User-drawn arrows** on the board (right-click drag) — dropped in the cm-chessboard swap; revisit
  only if wanted (not a first-class cm-chessboard feature).
