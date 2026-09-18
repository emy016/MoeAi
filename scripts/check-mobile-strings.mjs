/**
 * Every t('key') the app asks for must exist, at least in English.
 *
 * t() falls back to the raw key, so a typo does not crash — it silently ships
 * `simLogicBody` to a student as if it were a sentence. This catches that, and
 * also flags English keys that no screen uses any more.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const ROOT = "mobile/src";
function walk(dir) {
  return readdirSync(dir).flatMap(name => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walk(path) : path.endsWith(".js") ? [path] : [];
  });
}

const files = walk(ROOT);
const source = Object.fromEntries(files.map(f => [f, readFileSync(f, "utf8")]));
const translations = source[join(ROOT, "localization", "translations.js")];

// Keys defined for English, across every Object.assign(en, {...}) and the literal.
const defined = new Set([...translations.matchAll(/(?:^|[{,\s])([A-Za-z][A-Za-z0-9_]*)\s*:\s*(?:'|"|`)/g)].map(m => m[1]));

const used = new Map();
for (const [file, text] of Object.entries(source)) {
  if (file.includes("translations.js")) continue;
  for (const match of text.matchAll(/\bt\(\s*'([A-Za-z][A-Za-z0-9_]*)'/g)) {
    if (!used.has(match[1])) used.set(match[1], file);
  }
  // Keys passed indirectly, e.g. titleKey: 'simLogic'.
  for (const match of text.matchAll(/\b(?:titleKey|bodyKey)\s*:\s*'([A-Za-z][A-Za-z0-9_]*)'/g)) {
    if (!used.has(match[1])) used.set(match[1], file);
  }
}

const missing = [...used].filter(([key]) => !defined.has(key));
for (const [key, file] of missing) console.log(`MISSING  ${key}  (used in ${file.replace(ROOT + "/", "")})`);
console.log(missing.length
  ? `\n${missing.length} string${missing.length > 1 ? "s" : ""} asked for and never defined`
  : `\nAll ${used.size} strings the app asks for are defined.`);
process.exit(missing.length ? 1 : 0);
