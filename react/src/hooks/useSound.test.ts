// src/hooks/useSound.test.ts
import { describe, it, expect, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useSound } from "./useSound";
import * as sound from "../utils/sound";

describe("useSound", () => {
  it("calls playSound", () => {
    const spy = vi.spyOn(sound, "playSound").mockImplementation(() => {});
    const { result } = renderHook(() => useSound());

    act(() => {
      result.current.play("move");
    });

    expect(spy).toHaveBeenCalledWith("move");
  });

  it("calls setSoundsEnabled", () => {
    const spy = vi.spyOn(sound, "setSoundsEnabled").mockImplementation(() => {});
    const { result } = renderHook(() => useSound());

    act(() => {
      result.current.setEnabled(false);
    });

    expect(spy).toHaveBeenCalledWith(false);
  });
});
