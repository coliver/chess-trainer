// Framework-neutral derived-UI logic for the training page: the status
// banner, the eco/opening-name split, and hint-marker squares. The
// React training page computes these from the same inputs.

export type StatusKind = "your" | "good" | "bad" | "hint" | "done";

export type StatusInfo = {
  kind: StatusKind;
  icon: string;
  message: string;
  sub: string;
};

/**
 * Classify a feedback string by its ✅/❌ prefix into a status kind + icon.
 * Single source of truth so pages don't each hand-roll (and drift on) the
 * emoji-prefix mapping — used by deriveStatus below and by Puzzles directly.
 */
export function classifyFeedback(feedback: string): {
  kind: "good" | "bad" | "neutral";
  icon: string;
} {
  if (feedback.startsWith("✅")) return { kind: "good", icon: "✓" };
  if (feedback.startsWith("❌")) return { kind: "bad", icon: "✗" };
  return { kind: "neutral", icon: "♔" };
}

/** Derive the status banner (kind/icon/message/sub) from training state. */
export function deriveStatus(params: {
  isSessionCompleted: boolean;
  feedback: string;
  hintLevel: number;
  isPlayerToMove: boolean;
  playerColor?: "w" | "b";
}): StatusInfo {
  const { isSessionCompleted, feedback, hintLevel, isPlayerToMove, playerColor = "w" } = params;

  if (isSessionCompleted) {
    return {
      kind: "done",
      icon: "⚑",
      message: "Session complete",
      sub: "You played the line. Train it again or pick another opening below.",
    };
  }

  if (feedback.startsWith("✅")) {
    return {
      kind: "good",
      icon: classifyFeedback(feedback).icon,
      message: feedback.replace(/^✅\s*/, ""),
      sub: "",
    };
  }

  if (feedback.startsWith("❌")) {
    return {
      kind: "bad",
      icon: classifyFeedback(feedback).icon,
      message: feedback.replace(/^❌\s*/, ""),
      sub: "Try a different move.",
    };
  }

  if (feedback) {
    return { kind: "your", icon: "♔", message: feedback, sub: "" };
  }

  if (hintLevel >= 0) {
    return {
      kind: "hint",
      icon: "💡",
      message: "Hint",
      sub: "Look at the highlighted square.",
    };
  }

  return {
    kind: "your",
    icon: "♔",
    message: "Your move",
    sub: isPlayerToMove
      ? `Play the correct move for ${playerColor === "b" ? "Black" : "White"}.`
      : "Waiting for the reply…",
  };
}

/** Split "C50 Italian Game" into an ECO chip + opening name for the rail header. */
export function splitOpeningLabel(openingLabel: string): {
  eco: string;
  openingName: string;
} {
  const m = openingLabel.match(/^([A-E]\d{2})\s+(.*)$/);
  return {
    eco: m ? m[1] : "",
    openingName: m ? m[2] : openingLabel || "Training",
  };
}

/** From/to hint squares for the current hint level, or null if no hint is shown. */
export function deriveHintMarkers(
  correctMoveUci: string,
  hintLevel: number,
  isSessionCompleted: boolean,
): { from: string; to?: string } | null {
  if (!correctMoveUci || hintLevel < 0 || isSessionCompleted) return null;

  const from = correctMoveUci.substring(0, 2);
  const to = correctMoveUci.substring(2, 4);
  return hintLevel === 1 ? { from, to } : { from };
}
