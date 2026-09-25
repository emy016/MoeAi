/**
 * What the chat the student is using can render, told to the model once per
 * turn as application context (never as personality).
 *
 * "workspace" is the React workspace at /workspace: Markdown, KaTeX, Mermaid.
 * "app" is the MoeAI app at /moeai, which also renders MoeAI's generative
 * blocks — each is an ordinary fenced code block with a MoeAI language tag,
 * so a chat that does not know it still shows readable code instead of junk.
 * The block formats here are the contract with mobile/src/chat/blocks/.
 */
export type Surface = "app" | "workspace";

const COMMON = `# CHAT SURFACE (reference: what this chat can display)

Replies render as Markdown with LaTeX math ($inline$, $$display$$, balanced
delimiters, never math inside code fences). No raw HTML, and never wrap a whole
answer in a code fence. Formatting serves the conversation, not the other way
round: a short or casual answer has no headings and no horizontal rules.

\`\`\`mermaid draws a real diagram (flow, state machine, tree, sequence, ER,
class). Short plain-text labels, no LaTeX or quotes inside nodes.`;

const APP = `

This chat also turns these fenced blocks into live cards. This is what makes
MoeAI more than a text box, so use them whenever they teach better than
words: a process or structure gets a diagram, a formula with a parameter gets
a chart or visualizer, a topic being revised ends with a quiz, a multi-step
method gets steps. At most one or two per reply, always with the explanation in
words, and never name the block types to the student. Always use the exact
MoeAI tag: an interactive page is \`\`\`visualizer, never \`\`\`html, and
the opening and closing fences sit on lines of their own.

- \`\`\`visualizer: self-contained HTML with inline <style>/<script>, no external
  URLs, ~640x420 responsive. Classes .m-card .m-title .m-row .m-col .m-btn
  .m-btn-ghost .m-label .m-stat .m-muted; variables --m-accent --m-text
  --m-muted --m-surface --m-border. Canvas or SVG, label every control.
- \`\`\`chart: JSON {"type":"line|bar|scatter|pie|doughnut|radar","title","labels",
  "datasets":[{"label","data"}],"x","y"}; sample a function at 30-80 points.
- \`\`\`python / \`\`\`javascript: runnable in the browser (numpy available). Self-contained,
  print results, no input(), files, network or infinite loops.
- \`\`\`steps: one "### Title" per step with its Markdown description.
- \`\`\`quiz: JSON {"question","options":[...],"answer":<index>,"explain"}; one question.
- \`\`\`scene3d: JavaScript using THREE, scene, camera, renderer, controls and
  onFrame(fn(t)); add meshes and lights only.
- \`\`\`animation: JavaScript on Animator \`a\` (stage x in [-7,7], y in [-4,4]):
  a.axes, a.plot, a.dot, a.line, a.arrow, a.circle, a.rect, a.polygon, a.tex, a.text;
  await a.play(a.create|fadeIn|fadeOut|moveTo|transform|trace(...), {duration});
  await a.wait(s); a.caption(text). 3-8 steps.
- \`\`\`phet: JSON {"sim":"<id>","title","tasks":["..."]} embeds a real PhET
  simulation with your tasks; prefer it to a hand-made visualizer when one fits:
  projectile-motion, pendulum-lab, forces-and-motion-basics, energy-skate-park-basics, masses-and-springs, hookes-law, collision-lab, gravity-and-orbits, wave-on-a-string, bending-light, geometric-optics, coulombs-law, charges-and-fields, faradays-law, ohms-law, resistance-in-a-wire, circuit-construction-kit-dc, circuit-construction-kit-ac, capacitor-lab-basics, gas-properties, states-of-matter, calculus-grapher, graphing-quadratics, graphing-lines, function-builder, trig-tour, vector-addition, curve-fitting, plinko-probability, area-model-algebra, build-an-atom, isotopes-and-atomic-mass, molecule-shapes, balancing-chemical-equations, ph-scale, acid-base-solutions, concentration, molarity, beers-law-lab, reactants-products-and-leftovers.
  Give 2-4 tasks that use the sim's real controls; explain after they report back.
- \`\`\`questions: JSON array, when a short choice from the student decides the
  answer (which lecture, how deep, which exam format) or to check understanding:
  [{"question":"...","type":"test|checkbox|input","options":["..."],"allowCustom":true}].
  1-3 questions; the student taps an answer and it comes back as their next
  message. End the reply there and wait.
- \`\`\`flashcards: JSON [{"front":"short question or term","back":"answer, may use $math$"}], 8-12 cards.

Studio requests (the student tapped a tool; the one-or-two-blocks limit does not apply):
- study guide: one page. Key ideas, the formulas that matter, one short worked
  example, the traps, then 3 self-test questions. Headings allowed here.
- mind map: a \`\`\`mermaid mindmap (root = the lecture topic, 3-6 branches,
  2-4 short leaves each), then two lines on how the branches connect.
- flashcards: one \`\`\`flashcards block, then one line on how to use them.
- practice quiz: that many \`\`\`quiz blocks, one question each, mixed difficulty,
  each "explain" teaching the idea behind the answer.
- slides: one \`\`\`steps block, one "### Slide title" per slide (5-8 slides),
  each with 2-4 short bullets and the key formula if there is one.
- audio overview: a script to be read aloud, about 300 words, like a friend
  explaining it on a voice note. No blocks, no Markdown, no LaTeX (say math in
  words), no lists; short spoken sentences.`;

export function surfaceGuide(surface: Surface): string {
  return surface === "app" ? COMMON + APP : COMMON;
}
