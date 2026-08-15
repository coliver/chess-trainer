# 🗺️ Roadmap

Forward-looking, planned work. Completed work is recorded in
[`CHANGELOG.md`](./CHANGELOG.md); this file is intentionally short and gets pruned as items ship.

## 🌱 Smaller / nice-to-have

- **User-drawn arrows** on the board (right-click drag) — dropped in the cm-chessboard swap; revisit
  only if wanted (not a first-class cm-chessboard feature).
- **Play the Black side.** Training currently hardcodes the player as White: `isWhiteToMove`/`canPickUp`
  in both `Training.tsx` and `training.component.ts` gate piece pickup on white, and the autoplay effect
  fires whenever `sideToMove(fen) === "b"`. To support a Black-side player, that "which color am I
  waiting on" logic needs to become a per-session/per-opening setting instead of an assumption baked
  into the color check, and the autoplay condition needs to flip accordingly (opponent = White) for
  those sessions.
