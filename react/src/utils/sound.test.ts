// src/utils/sound.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { playSound, setSoundsEnabled, getSoundsEnabled } from "./sound";

const playMock = vi.fn(() => Promise.resolve());

beforeEach(() => {
  localStorage.clear();
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

  it("warns when playback fails", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const rejectingPlay = vi.fn(() => Promise.reject(new Error("blocked")));

    class RejectingAudioMock {
      currentTime = 0;
      play = rejectingPlay;
      constructor(_src: string) {
        void _src;
      }
    }
    vi.stubGlobal("Audio", RejectingAudioMock);

    playSound("click");
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('failed to play "click"'),
      expect.any(Error),
    );

    warnSpy.mockRestore();
  });
});

describe("setSoundsEnabled / getSoundsEnabled", () => {
  it("persists the enabled flag to localStorage", () => {
    setSoundsEnabled(false);
    expect(getSoundsEnabled()).toBe(false);
    expect(localStorage.getItem("chess-trainer:soundsEnabled")).toBe("false");

    setSoundsEnabled(true);
    expect(getSoundsEnabled()).toBe(true);
    expect(localStorage.getItem("chess-trainer:soundsEnabled")).toBe("true");
  });

  it("reads a persisted value on fresh module load", async () => {
    localStorage.setItem("chess-trainer:soundsEnabled", "false");
    vi.resetModules();
    const freshSound = await import("./sound");
    expect(freshSound.getSoundsEnabled()).toBe(false);
  });

  it("defaults to enabled when nothing is stored", async () => {
    localStorage.clear();
    vi.resetModules();
    const freshSound = await import("./sound");
    expect(freshSound.getSoundsEnabled()).toBe(true);
  });
});
