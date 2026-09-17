/**
 * Language-detection regression check.
 *
 * The one thing in this repo with tests, because a regression here is invisible
 * — the student simply gets answered in the wrong language and quietly stops
 * using it. Run with: npm run check:language
 *
 * Add a case every time a real student's message is misread.
 */
import { detectLanguage, validateOutput, type Target } from "../lib/language.ts";

const CASES: [string, Target][] = [
  // English
  ["Can you explain pointers?", "en"],
  ["I have an exam tomorrow and I do not understand this at all", "en"],
  ["What is the time complexity of quicksort in the average case?", "en"],
  ["The gym rhythm myth is hard to type", "en"],

  // Arabic script
  ["الامتحان بكرة وانا مش مذاكر حاجة", "ar"],
  ["ممكن تشرحلي pointers؟", "ar_en"],
  ["مش فاهم الـ pointers", "ar_en"],

  // Franco
  ["momken tfhmny pointers?", "franco"],
  ["msh fahem el recursion", "franco"],
  ["ana 3ayez a3raf ezay el logic gates bt4tghal", "franco_en"],
  ["ya3ni eh el time complexity bta3t quicksort?", "franco_en"],

  // Explicit requests override everything
  ["answer in English please", "en"],
  ["رد بالعربي", "ar"],
  ["reply in franco from now on", "franco"],
];

// The detector may return the mixed variant of the expected family. That is a
// pass: ar and ar_en both mean "reply in Arabic script".
function family(t: Target): string {
  return t.replace(/_en$/, "");
}

let failed = 0;

for (const [text, want] of CASES) {
  const got = detectLanguage(text, null).target;
  if (family(got) !== family(want)) {
    console.error(`FAIL  want=${want}  got=${got}  | ${text}`);
    failed++;
  }
}

// Output validation must catch the drift it exists to catch.
const DRIFT: [string, Target, boolean][] = [
  ["Sure, pointers store memory addresses.", "ar", false],
  ["المؤشر بيخزن عنوان في الميموري", "ar", true],
  ["el pointer bystore address fel memory", "franco", true],
  ["المؤشر بيخزن عنوان", "franco", false],
  ["A pointer stores an address.", "en", true],
];

for (const [answer, target, shouldPass] of DRIFT) {
  const ok = validateOutput(answer, target).ok;
  if (ok !== shouldPass) {
    console.error(`FAIL  validateOutput target=${target} expected=${shouldPass} got=${ok} | ${answer}`);
    failed++;
  }
}

if (failed > 0) {
  console.error(`\n${failed} check(s) failed.`);
  process.exit(1);
}
console.log(`All ${CASES.length + DRIFT.length} language checks passed.`);
