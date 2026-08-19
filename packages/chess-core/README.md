# ♟️ @knight-school/chess-core

Framework-neutral chess logic — FEN handling, move validation, and opening-preview positions — built on `chess.js` and shared by both the React and Angular frontends as a single source of truth.

## Why This Package Exists

Both the React and Angular frontends need to handle chess moves, validate them against standard rules, and preview opening positions. Rather than duplicate this logic or couple it to either framework, we isolate it in a **framework-agnostic package** that both frontends consume via a `file:` dependency.

The result:
- **Single source of truth** for chess rules (no sync issues)
- **No framework boilerplate** — just functions that wrap `chess.js`
- **Shared dependency tree** avoided — React and Angular each get their own `node_modules` copy, so no version conflicts
- **Independently tested** against real `chess.js` before either UI ever calls it

## 📦 Public API

Exported from `@knight-school/chess-core`:

### FEN Handling (`fen.ts`)
```typescript
START_FEN: string
  // Standard chess starting position FEN

normalizeFen(raw: unknown): string
  // Normalize a raw FEN-ish value (stripping backend row suffixes), fall back to START_FEN

sideToMove(fen: string): "w" | "b"
  // Determine whose turn it is; defaults to "w" on parse failure
```

### Move Logic (`moves.ts`)
```typescript
type UciMove = { from: string; to: string; promotion?: string }

uciToMove(uci: string): UciMove | null
  // Parse a UCI string ("e2e4", "e7e8q") into a move object

uciListToMoves(uciMoves?: string | null): string[]
  // Split a space-separated UCI move list into individual moves

pieceColorAt(fen: string, square: string): "w" | "b" | null
  // Color of the piece on a square ("w"/"b"), or null if empty/unparseable

legalMoves(fen: string, square: string): { to: string; promotion?: string }[]
  // Legal destination squares for the piece on a square

applyMove(fen: string, from: string, to: string, correctMoveUci: string): { nextFen: string; uci: string } | null
  // Apply a from→to move on a FEN, honoring promotion; returns the resulting FEN or null if illegal

applyUci(fen: string, uci: string): { nextFen: string } | null
  // Apply a full UCI move on a FEN; returns the resulting FEN or null if illegal
```

### Opening Previews (`preview.ts`)
```typescript
type PreviewOpening = {
  epd?: string | null;
  uci_moves?: string | null;
}

previewFen(opening: PreviewOpening | null, ply: number): string
  // FEN after applying up to `ply` half-moves of an opening
  // Uses opening's EPD (or start position) + its UCI moves; handles fallback if EPD moves don't apply
```

### Move Timeline (`timeline.ts`)
```typescript
type Timeline = {
  fens: string[];
  index: number;
}

createTimeline(fen: string): Timeline
  // Start a fresh timeline at a single position

resetTimeline(fen: string): Timeline
  // Alias for createTimeline — reads better at call sites that discard history

appendTimelineFen(timeline: Timeline, nextFen: string): Timeline
  // Append a played position after the current index, truncating any future positions

jumpToIndex(timeline: Timeline, nextIndex: number): Timeline
  // Move to nextIndex, clamped to the timeline's bounds

currentFen(timeline: Timeline): string
  // The FEN at the timeline's current index

isAtLatest(timeline: Timeline): boolean
  // Whether the timeline is positioned at its most recent entry
```

### Training Item Normalization (`next-item.ts`)
```typescript
type NextItemResponse = {
  fen?: string | null;
  fenAfter?: string | null;
  epd?: string | null;
  itemId?: string | number | null;
  id?: string | number | null;
  openingName?: string | null;
  openingEco?: string | null;
  correctMoveUci?: string;
  playerColor?: "w" | "b" | null;
  [k: string]: unknown;
}

type TrainingItem = {
  fen: string;
  itemId: string | null;
  openingLabel: string;
  correctMoveUci: string;
  playerColor: "w" | "b";
}

deriveNextItem(data: NextItemResponse): TrainingItem
  // Parse a raw `next` response into a normalized TrainingItem
```

### Training Status & UI Logic (`status.ts`)
```typescript
type StatusKind = "your" | "good" | "bad" | "hint" | "done"

type StatusInfo = {
  kind: StatusKind;
  icon: string;
  message: string;
  sub: string;
}

classifyFeedback(feedback: string): { kind: "good" | "bad" | "neutral"; icon: string }
  // Classify a feedback string by its ✅/❌ prefix into a status kind + icon

deriveStatus(params: { isSessionCompleted: boolean; feedback: string; hintLevel: number; isPlayerToMove: boolean; playerColor?: "w" | "b" }): StatusInfo
  // Derive the status banner (kind/icon/message/sub) from training state

splitOpeningLabel(openingLabel: string): { eco: string; openingName: string }
  // Split "C50 Italian Game" into an ECO chip + opening name for the rail header

deriveHintMarkers(correctMoveUci: string, hintLevel: number, isSessionCompleted: boolean): { from: string; to?: string } | null
  // From/to hint squares for the current hint level, or null if no hint is shown
```

## 🛠 Build & Test

**Build:**
```bash
npm run build
```
Runs `tsup` to compile `src/index.ts` to:
- `dist/index.js` (ES module)
- `dist/index.d.ts` (TypeScript declarations)

**Test:**
```bash
npm run test
```
Runs `vitest` against real `chess.js` to verify all move logic.

## 📥 How Frontends Consume It

Each frontend declares a `file:` dependency in its `package.json`:

```json
{
  "dependencies": {
    "@knight-school/chess-core": "file:../packages/chess-core"
  }
}
```

### Docker Build Flow

In both React and Angular Dockerfiles, the package is **built before** the frontend installs:

```dockerfile
# Build the shared chess-core package first
COPY packages/chess-core /packages/chess-core
RUN cd /packages/chess-core && npm ci && npm run build

# Now install the frontend (which links to the prebuilt package)
COPY react/package*.json ./
RUN npm ci
```

This ensures:
1. Each frontend has its own isolated `node_modules`
2. Chess-core is built once and reused
3. No dependency conflicts between React and Angular

## 🚀 CI

See [`.github/workflows/core.yml`](.github/workflows/core.yml) — runs linting, tests, and build on every commit to ensure the shared logic stays healthy.

---

## 📚 See Also

- **[Root README](../../README.md)** — Architecture overview
- **[React Frontend](../../react/README.md)** — How React uses chess-core
- **[Angular Frontend](../../angular/README.md)** — How Angular uses chess-core
