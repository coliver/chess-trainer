# 🗺️ Roadmap

Forward-looking, planned work. Completed work is recorded in
[`CHANGELOG.md`](./CHANGELOG.md); this file is intentionally short and gets pruned as items ship.

## 🎯 Next up

- **Angular training page.** Build the training UI in `angular/` — board, move input, hint/timeline
  controls, and the session flow — to reach feature parity with the React app. It should:
  - consume the shared chess logic via the same `file:` dependency
    ([`@knight-school/chess-core`](./packages/chess-core)) — no reimplementing chess rules;
  - mirror the React `Board` wrapper ([`react/src/components/Board.tsx`](./react/src/components/Board.tsx))
    over **cm-chessboard**, behind an Angular component with the same prop surface;
  - add the package-build step to `angular/Dockerfile` (as done for `react/Dockerfile`).

## 🧩 Frontend parity follow-ups (React → Angular)

The goal is that Angular *re-wraps* shared logic rather than rewriting it. Remaining logic still
living in React-specific files:

- **Extract the timeline** (the `fens`/`indices` history in `react/src/pages/Training.tsx`) into a
  pure reducer in `@knight-school/chess-core`.
- **Extract the session state machine** (`react/src/hooks/useTrainingSession.ts`: fetch-next /
  submit / advance) into a framework-neutral module that emits state, so React and Angular only
  supply the thin reactivity layer (hooks vs. signals/RxJS).

## 🔧 Backend

- **Dataset-driven training item selection** — replace the MVP static items with real
  opening-dataset selection. Full contract in
  [`AGENTS.md` → "Primary implementation target"](./AGENTS.md): `get_prompt_and_move()` feeding
  `create_training_session()`, deterministic for tests.

## 🌱 Smaller / nice-to-have

- **`/profile` page.** `Header.tsx` links to `/profile`, but there's no route — it falls through to
  the Dashboard. Either build the page or drop the link.
- **User-drawn arrows** on the board (right-click drag) — dropped in the cm-chessboard swap; revisit
  only if wanted (not a first-class cm-chessboard feature).
