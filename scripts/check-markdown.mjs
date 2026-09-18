/**
 * The mobile chat's Markdown parser, checked without a React Native runtime.
 *
 * MoeAI answers the app the same way it answers the web — headings, bold,
 * fenced code, lists, LaTeX — so if this drifts, a student on Android reads
 * asterisks and dollar signs instead of an explanation.
 */
import { parseBlocks, parseInline } from "../mobile/src/chat/markdown.js";

let failures = 0;
function check(name, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (!ok) { failures++; console.log(`FAIL  ${name}\n      got      ${JSON.stringify(actual)}\n      expected ${JSON.stringify(expected)}`); }
  else console.log(`ok    ${name}`);
}

check("a plain line is a paragraph",
  parseBlocks("Pointers hold addresses."),
  [{ kind: "paragraph", text: "Pointers hold addresses." }]);

check("headings carry their level",
  parseBlocks("## Why it matters").map(b => [b.kind, b.level, b.text]),
  [["heading", 2, "Why it matters"]]);

check("bullets and numbers become one list",
  parseBlocks("- first\n- second").map(b => b.items?.map(i => i.text)),
  [["first", "second"]]);

check("a numbered list keeps its markers",
  parseBlocks("1. one\n2) two")[0].items.map(i => i.marker),
  ["1.", "2."]);

check("a fence is one code block, not four lines",
  parseBlocks("before\n```python\nx = 1\ny = 2\n```\nafter").map(b => b.kind),
  ["paragraph", "code", "paragraph"]);

check("the fence keeps its language and body",
  (b => [b.language, b.body])(parseBlocks("```python\nx = 1\n```")[0]),
  ["python", "x = 1"]);

check("a fence still open is shown as it streams",
  parseBlocks("```js\nconst a = 1").map(b => [b.kind, b.open]),
  [["code", true]]);

check("a list ends where a paragraph begins",
  parseBlocks("- a\n- b\nplain").map(b => b.kind),
  ["list", "paragraph"]);

check("blank lines are gaps, not empty paragraphs",
  parseBlocks("a\n\nb").map(b => b.kind),
  ["paragraph", "gap", "paragraph"]);

check("bold, code and italic split out of a line",
  parseInline("use **malloc** and `free`, *always*").map(r => [r.type, r.text]),
  [["text", "use "], ["bold", "malloc"], ["text", " and "], ["code", "free"], ["text", ", "], ["italic", "always"]]);

check("a line with no markup is one run",
  parseInline("no markup here").map(r => r.type),
  ["text"]);

check("arabic survives inline parsing",
  parseInline("الـ **pointer** بيخزن عنوان").map(r => r.text),
  ["الـ ", "pointer", " بيخزن عنوان"]);

check("a lone asterisk is not italic",
  parseInline("2 * 3 = 6").map(r => r.type),
  ["text"]);

check("LaTeX is left alone for the reader",
  parseBlocks("$$\nE = mc^2\n$$").map(b => b.kind),
  ["paragraph", "paragraph", "paragraph"]);

console.log(failures ? `\n${failures} failing` : "\nAll mobile Markdown checks passed.");
process.exit(failures ? 1 : 0);
