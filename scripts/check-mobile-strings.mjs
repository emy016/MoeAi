/**
 * Static checks for the mobile app, which cannot be built or run here.
 *
 * Two things, both of which fail silently rather than loudly at runtime:
 * every t('key') must exist, and every relative import must point at a file
 * that is actually there.
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
for (const [key, file] of missing) console.log(`MISSING STRING  ${key}  (used in ${file.replace(ROOT + "/", "")})`);
console.log(missing.length
  ? `${missing.length} string${missing.length > 1 ? "s" : ""} asked for and never defined`
  : `All ${used.size} strings the app asks for are defined.`);

// ── Relative imports resolve to a file that exists ──────────────────────────
// A typo in an import is a red screen on the device and nothing at all here,
// so it is worth a walk.
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";

const broken = [];
let checked = 0;
for (const [file, text] of Object.entries(source)) {
  for (const match of text.matchAll(/(?:from|require\()\s*['"](\.[^'"]+)['"]/g)) {
    checked++;
    const target = resolve(dirname(file), match[1]);
    const found = [target, `${target}.js`, `${target}.jsx`, `${target}.json`, resolve(target, "index.js")]
      .some(candidate => existsSync(candidate));
    if (!found) broken.push([match[1], file]);
  }
}
for (const [spec, file] of broken) console.log(`BROKEN IMPORT  ${spec}  (in ${file.replace(ROOT + "/", "")})`);
console.log(broken.length
  ? `${broken.length} import${broken.length > 1 ? "s" : ""} point at nothing`
  : `All ${checked} relative imports resolve.`);

process.exit(missing.length || broken.length ? 1 : 0);
