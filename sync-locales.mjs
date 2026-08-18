// sync-locales.mjs
import fs from "node:fs";
import path from "node:path";

const localesDir = path.resolve("C:\\Users\\chris\\code\\chess-trainer\\react\\src\\i18n\\locales");
const sourceFile = path.join(localesDir, "en.json");

function isObject(v) {
  return v && typeof v === "object" && !Array.isArray(v);
}

function mergeMissing(target, source) {
  for (const [key, value] of Object.entries(source)) {
    if (!(key in target)) {
      target[key] = value;
    } else if (isObject(value) && isObject(target[key])) {
      mergeMissing(target[key], value);
    }
  }
}

const source = JSON.parse(fs.readFileSync(sourceFile, "utf8"));

for (const file of fs.readdirSync(localesDir)) {
  if (!file.endsWith(".json") || file === "en.json") continue;

  const filePath = path.join(localesDir, file);
  const current = JSON.parse(fs.readFileSync(filePath, "utf8"));

  mergeMissing(current, source);

  fs.writeFileSync(filePath, JSON.stringify(current, null, 2) + "\n", "utf8");
  console.log(`updated ${file}`);
}
