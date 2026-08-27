import confetti from 'canvas-confetti';

/** Angular counterpart of react/src/utils/winCelebration.ts. */

// A quick two-burst celebration (fired once when a training session completes).
export function celebrateWin(): void {
  const defaults = {
    startVelocity: 35,
    spread: 70,
    ticks: 100,
    zIndex: 1000,
    colors: ['#8a3f56', '#c97b98', '#e8b4c8', '#ffffff'],
  };

  confetti({
    ...defaults,
    particleCount: 80,
    angle: 60,
    origin: { x: 0, y: 0.6 },
  });
  confetti({
    ...defaults,
    particleCount: 80,
    angle: 120,
    origin: { x: 1, y: 0.6 },
  });
}

// A smaller, single-burst pop for a correct puzzle answer.
export function celebratePuzzleCorrect(): void {
  confetti({
    particleCount: 40,
    spread: 60,
    startVelocity: 30,
    ticks: 80,
    zIndex: 1000,
    origin: { x: 0.5, y: 0.6 },
    colors: ['#8a3f56', '#c97b98', '#e8b4c8', '#ffffff'],
  });
}
