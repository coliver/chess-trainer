#!/usr/bin/env node
// Copies static assets that are shared between the react/ and rails/ frontends
// from packages/shared-assets/ (the git-tracked source of truth) into
// react/public/, where Vite expects to serve them from. Runs automatically
// before `npm run dev` / `npm run build` via the predev/prebuild scripts in
// package.json, since react/public/ no longer tracks these files itself.

import { cpSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const sharedAssets = join(root, "..", "packages", "shared-assets");

cpSync(join(sharedAssets, "cm-chessboard-assets"), join(root, "public", "cm-chessboard-assets"), {
  recursive: true,
});
cpSync(join(sharedAssets, "sounds"), join(root, "public", "sounds"), { recursive: true });
