import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const localesDir = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "locales",
);
const localeFiles = fs
  .readdirSync(localesDir)
  .filter((f) => f.endsWith(".json"));

function loadLocale(file: string): object {
  return JSON.parse(fs.readFileSync(path.join(localesDir, file), "utf-8"));
}

function flattenKeys(obj: object, prefix = ""): string[] {
  return Object.entries(obj).flatMap(([key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    return value && typeof value === "object"
      ? flattenKeys(value, path)
      : [path];
  });
}

describe("locale resources", () => {
  const en = loadLocale("en-US.json");
  const enKeys = flattenKeys(en).sort();
  const otherLocaleFiles = localeFiles.filter((f) => f !== "en-US.json");

  it.each(otherLocaleFiles)(
    "%s exposes the same set of translation keys as en-US.json",
    (file) => {
      expect(flattenKeys(loadLocale(file)).sort()).toEqual(enKeys);
    },
  );

  it.each(localeFiles)("%s has no empty translation values", (file) => {
    const resource = loadLocale(file);
    for (const key of flattenKeys(resource)) {
      const value = key
        .split(".")
        .reduce<unknown>(
          (o, k) => (o as Record<string, unknown>)[k],
          resource,
        );
      expect(value, `${file}:${key} should not be empty`).not.toBe("");
    }
  });

  it.each(otherLocaleFiles)(
    "%s has no leftover [TODO] translation stubs",
    (file) => {
      const resource = loadLocale(file);
      for (const key of flattenKeys(resource)) {
        const value = key
          .split(".")
          .reduce<unknown>(
            (o, k) => (o as Record<string, unknown>)[k],
            resource,
          );
        expect(value, `${file}:${key} still has a [TODO] stub`).not.toMatch(
          /^\[TODO /,
        );
      }
    },
  );
});
