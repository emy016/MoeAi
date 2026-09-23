/**
 * The mobile chat's Markdown + KaTeX renderer, checked without a React Native runtime.
 *
 * MoeAI answers the app the same way it answers the web — headings, bold,
 * fenced code, lists, LaTeX — so if this drifts, a student reads asterisks and
 * dollar signs instead of an explanation. The renderer is Youssef's
 * src/chat/katexMessageUtils.js (markdown-it + KaTeX), shared by the web and
 * native chat bubbles; it needs the app's own dependencies installed.
 */
import { existsSync } from "node:fs";

if (!existsSync("mobile/node_modules/markdown-it") || !existsSync("mobile/node_modules/katex")) {
  console.log("SKIP  mobile dependencies are not installed — run `npm ci` in mobile/ (npm run build:app does it).");
  process.exit(0);
}

const { hasMarkdownContent, hasMathContent, renderMarkdownMarkup, splitMathSegments } =
  await import("../mobile/src/chat/katexMessageUtils.js");

let failures = 0;
function check(name, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (!ok) { failures++; console.log(`FAIL  ${name}\n      got      ${JSON.stringify(actual)}\n      expected ${JSON.stringify(expected)}`); }
  else console.log(`ok    ${name}`);
}
const html = (text) => renderMarkdownMarkup(text);

check("a plain sentence stays plain text", hasMarkdownContent("Pointers hold addresses."), false);
check("arabic prose stays plain text", hasMarkdownContent("الـ pointer بيخزن عنوان"), false);
check("bold is formatting", hasMarkdownContent("use **malloc**"), true);
check("a lone asterisk is not formatting", hasMarkdownContent("2 * 3 = 6"), false);

check("headings carry their level", html("## Why it matters"), "<h2>Why it matters</h2>");
check("bold, code and italic render", html("use **malloc** and `free`, *always*"),
  "<p>use <strong>malloc</strong> and <code>free</code>, <em>always</em></p>");
check("a list is one list", (html("- first\n- second").match(/<li>/g) || []).length, 2);
check("a fence is one code block with its language",
  /<pre><code class="language-python">x = 1\ny = 2\n<\/code><\/pre>/.test(html("```python\nx = 1\ny = 2\n```")), true);
check("arabic survives around bold", html("الـ **pointer** بيخزن عنوان"), "<p>الـ <strong>pointer</strong> بيخزن عنوان</p>");

check("inline math is found", hasMathContent("so $f(x)$ approaches"), true);
check("a price is not math", hasMathContent("it costs $5"), false);
check("math splits out of text", splitMathSegments("a $x^2$ b").map(s => s.type), ["text", "math", "text"]);
check("display math is marked as display", splitMathSegments("$$E = mc^2$$")[0].displayMode, true);
check("inline math renders as MathML", /<span class="moeai-math-inline"><span class="katex"><math/.test(html("so $f(x)$ approaches")), true);
check("display math renders as a block", /<span class="moeai-math-display"><span class="katex"><math[^>]*display="block"/.test(html("$$\\lim_{x\\to 0}\\frac{\\sin x}{x}=1$$")), true);
check("broken LaTeX does not throw", typeof html("$\\frac{1}{$"), "string");

check("raw HTML is escaped, never injected", html("<img src=x onerror=alert(1)>").includes("<img"), false);
check("links open in a new tab, without an opener", /<a href="https:\/\/example.com" target="_blank" rel="noopener noreferrer">/.test(html("[docs](https://example.com)")), true);
check("javascript: links are not rendered as links", html("[x](javascript:alert(1))").includes("href="), false);

console.log(failures ? `\n${failures} failing` : "\nAll mobile Markdown checks passed.");
process.exit(failures ? 1 : 0);
