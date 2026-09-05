// Type declarations for cm-chessboard extensions that don't have built-in types.
// Chessboard's own type is inferred by TS directly from Chessboard.js (allowJs),
// which only sees methods defined on the base class — not ones the Arrows
// extension mixes in at runtime — so augment it here instead of casting to any.
declare module 'cm-chessboard/src/extensions/arrows/Arrows.js' {
  export class Arrows {
    constructor(props?: Record<string, unknown>);
  }

  export const ARROW_TYPE: Record<string, { class: string }>;
}

declare module 'cm-chessboard/src/Chessboard.js' {
  interface Chessboard {
    removeArrows(): void;
    addArrow(type: { class: string }, from: string, to: string): void;
  }
}
