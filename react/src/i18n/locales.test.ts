import { describe, it, expect } from "vitest";
import en from "./locales/en.json";
import es from "./locales/es.json";

function flattenKeys(obj: object, prefix = ""): string[] {
  return Object.entries(obj).flatMap(([key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    return value && typeof value === "object"
      ? flattenKeys(value, path)
      : [path];
  });
}

describe("locale resources", () => {
  it("en and es expose the same set of translation keys", () => {
    const enKeys = flattenKeys(en).sort();
    const esKeys = flattenKeys(es).sort();

    expect(esKeys).toEqual(enKeys);
  });

  it("has no empty translation values", () => {
    for (const [locale, resource] of [
      ["en", en],
      ["es", es],
    ] as const) {
      for (const key of flattenKeys(resource)) {
        const value = key
          .split(".")
          .reduce<unknown>((o, k) => (o as Record<string, unknown>)[k], resource);
        expect(value, `${locale}:${key} should not be empty`).not.toBe("");
      }
    }
  });
});
