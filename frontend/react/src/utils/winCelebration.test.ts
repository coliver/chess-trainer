// src/utils/winCelebration.test.ts
import { vi, describe, it, expect, beforeEach } from "vitest";

const confettiMock = vi.fn();
vi.mock("canvas-confetti", () => ({
  default: (...args: unknown[]) => confettiMock(...args),
}));

import { celebrateWin, celebratePuzzleCorrect } from "./winCelebration";

describe("winCelebration", () => {
  beforeEach(() => {
    confettiMock.mockReset();
  });

  it("celebrateWin fires two bursts from opposite corners", () => {
    celebrateWin();

    expect(confettiMock).toHaveBeenCalledTimes(2);
    expect(confettiMock).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ angle: 60, origin: { x: 0, y: 0.6 } }),
    );
    expect(confettiMock).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ angle: 120, origin: { x: 1, y: 0.6 } }),
    );
  });

  it("celebratePuzzleCorrect fires a single centered burst", () => {
    celebratePuzzleCorrect();

    expect(confettiMock).toHaveBeenCalledTimes(1);
    expect(confettiMock).toHaveBeenCalledWith(
      expect.objectContaining({
        particleCount: 40,
        origin: { x: 0.5, y: 0.6 },
      }),
    );
  });
});
