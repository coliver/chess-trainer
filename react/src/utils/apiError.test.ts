// src/utils/apiError.test.ts
import { describe, it, expect } from "vitest";
import { AxiosError } from "axios";
import { apiErrorMessage } from "./apiError";

describe("apiErrorMessage", () => {
  it("returns the response detail when present", () => {
    const err = new AxiosError();
    err.response = { data: { detail: "Bad credentials" } } as AxiosError["response"];

    expect(apiErrorMessage(err, "fallback", "generic")).toBe("Bad credentials");
  });

  it("returns the fallback when the axios error has no detail", () => {
    const err = new AxiosError();
    err.response = { data: {} } as AxiosError["response"];

    expect(apiErrorMessage(err, "fallback", "generic")).toBe("fallback");
  });

  it("returns the generic fallback for non-axios errors", () => {
    expect(apiErrorMessage(new Error("boom"), "fallback", "generic")).toBe("generic");
  });
});
