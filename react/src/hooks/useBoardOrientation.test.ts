import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useBoardOrientation } from "./useBoardOrientation";

describe("useBoardOrientation", () => {
  it("defaults to white", () => {
    const { result } = renderHook(() => useBoardOrientation());
    expect(result.current.orientation).toBe("white");
  });

  it("accepts an initial orientation", () => {
    const { result } = renderHook(() => useBoardOrientation("black"));
    expect(result.current.orientation).toBe("black");
  });

  it("flip toggles between white and black", () => {
    const { result } = renderHook(() => useBoardOrientation());

    act(() => result.current.flip());
    expect(result.current.orientation).toBe("black");

    act(() => result.current.flip());
    expect(result.current.orientation).toBe("white");
  });
});
