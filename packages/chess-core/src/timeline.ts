// Framework-neutral move timeline. No React — pure state + reducers.
// Backs the "prev/next" stepper in the React training page.

export type Timeline = {
  fens: string[];
  index: number;
};

/** Start a fresh timeline at a single position. */
export function createTimeline(fen: string): Timeline {
  return { fens: [fen], index: 0 };
}

/** Alias for createTimeline — reads better at call sites that discard history. */
export function resetTimeline(fen: string): Timeline {
  return createTimeline(fen);
}

/**
 * Append a played position after the current index, truncating any
 * "future" positions from a previous jump. No-ops if `nextFen` is already
 * the last fen in the truncated prefix (avoids duplicate entries).
 */
export function appendTimelineFen(timeline: Timeline, nextFen: string): Timeline {
  const prefix = timeline.fens.slice(0, timeline.index + 1);
  if (prefix[prefix.length - 1] === nextFen) return timeline;

  const fens = [...prefix, nextFen];
  return { fens, index: fens.length - 1 };
}

/** Move to `nextIndex`, clamped to the timeline's bounds. No-ops if unchanged. */
export function jumpToIndex(timeline: Timeline, nextIndex: number): Timeline {
  const clamped = Math.max(0, Math.min(nextIndex, timeline.fens.length - 1));
  if (clamped === timeline.index) return timeline;
  return { ...timeline, index: clamped };
}

/** The fen at the timeline's current index. */
export function currentFen(timeline: Timeline): string {
  return timeline.fens[timeline.index] ?? timeline.fens[0];
}

/** Whether the timeline is positioned at its most recent entry. */
export function isAtLatest(timeline: Timeline): boolean {
  return timeline.index === timeline.fens.length - 1;
}
