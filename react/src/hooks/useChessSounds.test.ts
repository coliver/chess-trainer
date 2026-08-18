import { renderHook, act } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useChessSounds } from "./useChessSounds";

describe("useChessSounds", () => {
  const playMock = vi.fn().mockResolvedValue(undefined);
  const loadMock = vi.fn();

  beforeEach(() => {
    class AudioMock {
      src: string;
      preload = "";
      currentTime = 0;
      load = loadMock;
      play = playMock;

      constructor(src?: string) {
        this.src = src ?? "";
      }
    }

    vi.stubGlobal("Audio", AudioMock as unknown as typeof Audio);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    playMock.mockClear();
    loadMock.mockClear();
  });

  it("loads all sounds on mount", () => {
    renderHook(() => useChessSounds());
    expect(loadMock).toHaveBeenCalledTimes(6);
  });

  it("plays move sound", () => {
    const { result } = renderHook(() => useChessSounds());

    act(() => {
      result.current.playSound("move");
    });

    expect(playMock).toHaveBeenCalledTimes(1);
  });

  it("plays capture sound", () => {
    const { result } = renderHook(() => useChessSounds());

    act(() => {
      result.current.playSound("capture");
    });

    expect(playMock).toHaveBeenCalledTimes(1);
  });

  it("plays setup sound", () => {
    const { result } = renderHook(() => useChessSounds());

    act(() => {
      result.current.playSound("setup");
    });

    expect(playMock).toHaveBeenCalledTimes(1);
  });
});
