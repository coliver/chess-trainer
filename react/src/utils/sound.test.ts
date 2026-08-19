// src/utils/sound.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { playSound, setSoundsEnabled } from "./sound";

const playMock = vi.fn(() => Promise.resolve());

beforeEach(() => {
  setSoundsEnabled(true);
  playMock.mockClear();

  class AudioMock {
    currentTime = 0;
    play = playMock;
    constructor(_src: string) {
      void _src;
    }
  }

  vi.stubGlobal("Audio", AudioMock);
});

describe("playSound", () => {
  it("plays a sound when enabled", () => {
    playSound("move");
    expect(playMock).toHaveBeenCalled();
  });

  it("does not play when disabled", () => {
    setSoundsEnabled(false);
    playSound("move");
    expect(playMock).not.toHaveBeenCalled();
  });
});
