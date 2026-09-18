/**
 * Provider keys resolve the same way everywhere.
 *
 * This is the check that exists because of a real bug: the tutor's brain read
 * GEMINI_API_KEY and the quiz generator read GEMINI_API_KEYS. Whichever name
 * was set, half the product worked and the other half failed silently. Both
 * names now work everywhere, and this pins that down.
 */
import { acceptedNames, keyCounts, providerKeys, PROVIDER_NAMES } from "../lib/keys.ts";

let failures = 0;
function check(name: string, actual: unknown, expected: unknown) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (!ok) { failures++; console.log(`FAIL  ${name}\n      got      ${JSON.stringify(actual)}\n      expected ${JSON.stringify(expected)}`); }
  else console.log(`ok    ${name}`);
}

check("the singular name works", providerKeys("gemini", { GEMINI_API_KEY: "a" }), ["a"]);
check("the plural name works", providerKeys("gemini", { GEMINI_API_KEYS: "a" }), ["a"]);
check("either one holds several, comma-separated",
  providerKeys("gemini", { GEMINI_API_KEY: "a, b ,c" }), ["a", "b", "c"]);
check("plural comes first, then singular",
  providerKeys("gemini", { GEMINI_API_KEY: "single", GEMINI_API_KEYS: "plural" }), ["plural", "single"]);
check("the same key set twice is one key, not two chances",
  providerKeys("gemini", { GEMINI_API_KEY: "a", GEMINI_API_KEYS: "a" }), ["a"]);
check("the old backup variable is just another Gemini key",
  providerKeys("gemini", { GEMINI_API_KEY: "a", GEMINI_BACKUP_API_KEY: "b" }), ["a", "b"]);
check("blank and whitespace entries are dropped",
  providerKeys("groq", { GROQ_API_KEYS: " , a ,, " }), ["a"]);
check("nothing configured is an empty list, not a crash",
  providerKeys("openrouter", {}), []);
check("providers do not see each other's keys",
  providerKeys("groq", { GEMINI_API_KEY: "a" }), []);
check("counts report how many, never which",
  keyCounts({ GEMINI_API_KEYS: "a,b", GROQ_API_KEY: "c" }), { gemini: 2, groq: 1, openrouter: 0 });
check("every provider accepts a plural and a singular name",
  PROVIDER_NAMES.every(p => acceptedNames(p).some(n => n.endsWith("_API_KEYS")) && acceptedNames(p).some(n => n.endsWith("_API_KEY"))), true);

// The names the sample file documents must be names the code actually reads,
// or someone follows the file and configures nothing.
import { readFileSync } from "node:fs";
const sample = readFileSync(".env.example", "utf8");
const documented = [...sample.matchAll(/^([A-Z0-9_]*API_KEYS?)=/gm)].map(m => m[1]);
const known = new Set(PROVIDER_NAMES.flatMap(acceptedNames));
const unknown = documented.filter(name => !known.has(name));
check(".env.example documents only names the code reads", unknown, []);
check("and documents at least one name per provider",
  PROVIDER_NAMES.filter(p => !acceptedNames(p).some(n => documented.includes(n))), []);

console.log(failures ? `\n${failures} failing` : "\nAll provider key checks passed.");
process.exit(failures ? 1 : 0);
