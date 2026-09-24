/**
 * Eslam's personality runtime (lib/emy), checked offline.
 *
 * lib/emy is a port of the Emy Telegram bot — the place MoeAI already sounds
 * like itself — and was verified to build byte-identical system prompts to
 * the bot's Python for the same messages. This keeps it that way: the bot's
 * own language regression cases, the spec-mapping validation, the order the
 * prompt is assembled in, and the Gemini model ranking.
 *
 * Run with: npm run check:emy
 */
import { detectLanguage, explicitLanguageRequest, AR, AR_EN, EN, FRANCO, FRANCO_EN, type Target } from "../lib/emy/language.ts";
import { detectSignals } from "../lib/emy/signals.ts";
import { loadRegistry, validateRegistry } from "../lib/emy/specs.ts";
import { buildSystemPrompt } from "../lib/emy/prompt.ts";
import { rankModels } from "../lib/ai/rank-models.ts";

let failures = 0;
const check = (name: string, ok: boolean, detail = "") => {
  if (!ok) { failures++; console.log(`FAIL  ${name}${detail ? `\n      ${detail}` : ""}`); }
};

// (message, previous conversation language, expected) — from the bot's tests/test_language.py
const DETECTION: [string, Target | null, Target][] = [
  ["What's a pointer?", null, EN],
  ["ممكن تشرحلي الـ pointer؟", null, AR],
  ["momken tfhmny el pointer?", null, FRANCO],
  ["bro ana msh fahm why *p is different", null, FRANCO_EN],
  ["بص، why does this pointer work?", null, AR_EN],
  ["Explain recursion to me", null, EN],
  ["Is 3x + 2 = 5 correct?", null, EN],
  ["Solve for x2 in this equation", null, EN],
  ["what does *p mean?", null, EN],
  ["Can you explain this formally for my report?", null, EN],
  ["I think I'm going to fail this course", null, EN],
  ["why tf do we need pointers", null, EN],
  ["bro c++ forgot my semicolon again", null, EN],
  ["HAHA I finally got it", null, EN],
  ["what does *p mean?", EN, EN],
  ["what does *p mean?", AR, EN],
  ["ok", AR, AR],
  ["yeah", FRANCO, FRANCO],
  ["tab", EN, EN],
  ["okay ده", EN, EN],
  ["this ده", EN, EN],
  ["this pointer", AR, AR],
  ["ممكن pointer", EN, AR],
  ["msh fahm el pointer", FRANCO, FRANCO],
  ["ممكن تشرحلي الـ pointers؟", AR, AR],
  ["keda fahmt", null, FRANCO],
  ["Answer in English.", AR, EN],
  ["كلمني بالعربي", EN, AR],
  ["جاوب بالفرانكو", EN, FRANCO],
  ["reply in arabic please", EN, AR],
];
for (const [message, previous, expected] of DETECTION) {
  const got = detectLanguage(message, previous);
  check(`detect ${JSON.stringify(message)} (prev ${previous})`, got.target === expected, `expected ${expected}, got ${got.target} — ${got.note}`);
}

const EXPLICIT: [string, Target | null][] = [
  ["Answer in English.", EN], ["رد بالعربي", AR], ["جاوب بالفرانكو", FRANCO], ["can you explain in franco", FRANCO], ["What is a pointer?", null],
];
for (const [message, expected] of EXPLICIT) check(`explicit ${JSON.stringify(message)}`, explicitLanguageRequest(message) === expected);

const registry = loadRegistry();
const problems = validateRegistry(registry);
check("every critical behaviour in Eslam's files maps to a heading", problems.length === 0, problems.join("; "));

const message = "bro ana msh fahm el recursion, exam bokra";
const built = buildSystemPrompt(registry, {
  decision: detectLanguage(message), signals: detectSignals(message), budgetTokens: 5900, appContext: ["# COURSE MATERIAL\n\nsample"],
});
const at = (s: string) => built.system.indexOf(s);
check("prompt opens with the runtime contract", built.system.startsWith("# RUNTIME CONTRACT"));
check("personality activation comes before the personality spec", at("# PERSONALITY ACTIVATION") > 0 && at("# PERSONALITY ACTIVATION") < at("\n# PERSONALITY\n"));
check("personality spec is present", at("\n# PERSONALITY\n") > 0);
check("app context comes after the specs", at("# COURSE MATERIAL") > at("\n# TUTORING\n"));
check("language directive is the very last block", at("# LANGUAGE DIRECTIVE") > at("# COURSE MATERIAL") && built.system.trim().endsWith("in logical reading order."));
check("a Franco message gets a Franco directive", built.system.includes("Language for THIS reply: franco"));
check("the bot's 5,900-token budget holds", !built.trace.overBudget, `${built.tokens} tokens`);

check("models rank newest Flash first, never previews or TTS",
  JSON.stringify(rankModels(["models/gemini-2.5-flash", "models/gemini-3.8-flash", "models/gemini-3.6-flash", "models/gemini-3.7-flash",
    "models/gemini-3-flash-preview", "models/gemini-3.8-flash-tts", "models/gemini-3.5-flash-lite", "models/gemini-flash-latest", "models/gemma-4-31b-it"]))
  === JSON.stringify(["gemini-3.8-flash", "gemini-3.7-flash", "gemini-3.6-flash", "gemini-flash-latest", "gemini-3.5-flash-lite", "gemma-4-31b-it"]));

const total = DETECTION.length + EXPLICIT.length + 9;
console.log(failures ? `\n${failures} of ${total} failing` : `All ${total} Emy runtime checks passed.`);
process.exit(failures ? 1 : 0);
