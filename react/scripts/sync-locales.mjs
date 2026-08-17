#!/usr/bin/env node
// Keeps every locale file's *key structure* in sync with en.json (the source of truth).
//
// - Adds keys that exist in en.json but are missing from a locale, filling them
//   with a "[TODO fr] English text" placeholder so they're easy to grep for and
//   the file stays valid to load.
// - Removes keys that no longer exist in en.json.
// - Reorders keys to match en.json so diffs stay readable.
//
// Usage:
//   node scripts/sync-locales.mjs          write changes
//   node scripts/sync-locales.mjs --check  report only, exit 1 if anything is out of sync

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const localesDir = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "../src/i18n/locales",
);
const checkOnly = process.argv.includes("--check");

function loadJson(file) {
  return JSON.parse(fs.readFileSync(path.join(localesDir, file), "utf-8"));
}

function todoMarker(locale) {
  return `[TODO ${locale}]`;
}

// Walks enNode in en's key order, carrying over existing translations from
// localeNode and stubbing anything missing. Returns the synced object plus
// the added/removed key paths (for reporting).
function syncObject(enNode, localeNode, locale, prefix, added, removed) {
  const result = {};
  for (const [key, enValue] of Object.entries(enNode)) {
    const path = prefix ? `${prefix}.${key}` : key;
    const localeValue = localeNode?.[key];
    if (enValue && typeof enValue === "object" && !Array.isArray(enValue)) {
      result[key] = syncObject(
        enValue,
        localeValue && typeof localeValue === "object" ? localeValue : undefined,
        locale,
        path,
        added,
        removed,
      );
    } else if (typeof localeValue === "string" && localeValue.length > 0) {
      result[key] = localeValue;
    } else {
      result[key] = `${todoMarker(locale)} ${enValue}`;
      added.push(path);
    }
  }
  return result;
}

function collectRemoved(enNode, localeNode, prefix, removed) {
  for (const key of Object.keys(localeNode)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (!(key in enNode)) {
      removed.push(path);
    } else if (
      typeof localeNode[key] === "object" &&
      localeNode[key] !== null &&
      typeof enNode[key] === "object"
    ) {
      collectRemoved(enNode[key], localeNode[key], path, removed);
    }
  }
}

const en = loadJson("en.json");
const localeFiles = fs
  .readdirSync(localesDir)
  .filter((f) => f.endsWith(".json") && f !== "en.json");

let outOfSync = false;

for (const file of localeFiles) {
  const locale = file.replace(/\.json$/, "");
  const existing = loadJson(file);
  const added = [];
  const removed = [];
  const synced = syncObject(en, existing, locale, "", added, removed);
  collectRemoved(en, existing, "", removed);

  if (added.length === 0 && removed.length === 0) {
    console.log(`${file}: in sync`);
    continue;
  }

  outOfSync = true;
  console.log(`${file}:`);
  for (const key of added) console.log(`  + ${key} (needs translation)`);
  for (const key of removed) console.log(`  - ${key} (stale, removed)`);

  if (!checkOnly) {
    fs.writeFileSync(
      path.join(localesDir, file),
      JSON.stringify(synced, null, 2) + "\n",
    );
  }
}

if (checkOnly && outOfSync) {
  console.error(
    "\nLocale files are out of sync with en.json. Run `npm run i18n:sync` to fix.",
  );
  process.exit(1);
}

if (!checkOnly && outOfSync) {
  console.log(
    `\nWrote stubs for new/changed keys. Search for "[TODO" to find text that still needs translating.`,
  );
}
