import confetti from 'canvas-confetti';

/** Angular counterpart of react/src/utils/snow.tsx. */
export function snow(): () => void {
  const duration = 15 * 1000;
  const animationEnd = Date.now() + duration;
  let skew = 1;
  let stopped = false;

  function randomInRange(min: number, max: number): number {
    return Math.random() * (max - min) + min;
  }

  function frame() {
    if (stopped) return;

    const timeLeft = animationEnd - Date.now();
    const ticks = Math.max(200, 500 * (timeLeft / duration));
    skew = Math.max(0.8, skew - 0.001);

    confetti({
      particleCount: 1,
      startVelocity: 0,
      ticks: ticks,
      origin: {
        x: Math.random(),
        y: Math.random() * skew - 0.2,
      },
      colors: ['#ffffff'],
      gravity: randomInRange(0.4, 0.6),
      drift: randomInRange(-0.4, 0.4),
    });

    if (timeLeft > 0) {
      requestAnimationFrame(frame);
    }
  }

  frame();

  return () => {
    stopped = true;
  };
}
