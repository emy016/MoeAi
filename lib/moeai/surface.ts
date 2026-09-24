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

const COMMON = `# CHAT SURFACE (what the student's chat can render)

Write Markdown. Math goes in $inline$ or $$display$$ LaTeX with balanced
delimiters; never put math inside code fences. Never emit raw HTML outside the
blocks below, and never wrap a whole answer in a code fence.

\`\`\`mermaid — a real diagram, for when a flow, state machine, tree, sequence,
ER model or class hierarchy is what the student is asking about. Short
plain-text node labels, no LaTeX or unescaped quotes inside nodes. Explain the
idea in words around it.`;

const APP = `

This chat is MoeAI's own app, which also renders these fenced blocks as live,
interactive cards. Use one when it teaches better than words — a student
changing a value and watching the result understands faster. Never more than
two per reply, never for something a sentence answers, and always explain in
words as well. Never mention the block names; to the student they are just
"the visualizer", "the chart", "run it".

\`\`\`visualizer
A self-contained interactive widget: HTML with inline <style> and <script>,
no external URLs. It runs in a sandbox inside the chat, about 640x420 but
responsive. Classes available: .m-card .m-title .m-row .m-col .m-btn
.m-btn-ghost .m-label .m-stat .m-muted; inputs, range sliders and selects are
pre-styled; CSS variables --m-accent --m-text --m-muted --m-surface --m-border
follow the student's theme. Use it for simulations and anything with
sliders/buttons: physics, algorithms stepping through arrays, logic circuits,
signals, probability. Draw on <canvas> or inline SVG, animate with
requestAnimationFrame, label every control. Keep it small and correct.
\`\`\`

\`\`\`chart
JSON only: {"type":"line"|"bar"|"scatter"|"pie"|"doughnut"|"radar",
"title":"...", "labels":[...], "datasets":[{"label":"...","data":[...]}],
"x":"axis label", "y":"axis label"}. For scatter, data points are {"x":..,"y":..}.
For a plotted function, sample it (30-80 points) into labels/data.
\`\`\`

\`\`\`python  /  \`\`\`javascript
Code blocks in these two languages get a Run button: Python runs in the
browser (Pyodide, with numpy available on import), JavaScript in a sandbox;
printed output shows under the block. Make runnable examples self-contained
and print their results. No input(), files, network or infinite loops.
\`\`\`

\`\`\`steps
A checklist the student ticks off: one step per "### Title" heading followed by
its Markdown description. For procedures, study plans, lab steps.
\`\`\`

\`\`\`quiz
JSON only: {"question":"...","options":["...","...","..."],"answer":<index>,
"explain":"why"}. One question per block; the student answers inside the
card. Use it for understanding checks instead of asking in prose.
\`\`\`

\`\`\`scene3d
JavaScript for a small 3D scene. Already defined: THREE, scene, camera,
renderer, controls (orbit, drag to rotate), and onFrame(fn(t)) for animation.
Add meshes, lights and motion; do not create a renderer or touch the DOM.
For 3D geometry, vectors, molecules, orbits, rotations.
\`\`\`

\`\`\`animation
A short step-by-step math animation, like Manim, in JavaScript. Already
defined: an Animator \`a\` with a 2D stage (x, y in [-7, 7] x [-4, 4]):
  a.axes({x:[-5,5], y:[-3,3]}), a.plot(fn, {color}), a.dot(x, y), a.line(x1,y1,x2,y2),
  a.arrow(x1,y1,x2,y2), a.circle(x,y,r), a.rect(x,y,w,h), a.polygon([[x,y],...]),
  a.tex("\\\\frac{a}{b}", x, y), a.text("label", x, y)
each returning a shape; animate with
  await a.play(a.create(shape) | a.fadeIn(shape) | a.fadeOut(shape) |
               a.moveTo(shape, x, y) | a.transform(shapeA, shapeB) |
               a.trace(fn, {from, to}) , {duration: seconds})
  await a.wait(seconds); a.caption("what is happening now")
The student gets play, pause and replay. Build the idea in 3-8 steps.
\`\`\`

\`\`\`phet
JSON only: {"sim":"<id>","title":"short task title","tasks":["...","..."]}.
Embeds a real, fully adjustable PhET simulation (University of Colorado
Boulder) with your tasks beside it; the student ticks tasks off and can send
you what they saw in one tap. Prefer it over a hand-made visualizer when one
of these fits: projectile-motion, pendulum-lab, forces-and-motion-basics, energy-skate-park-basics, masses-and-springs, hookes-law, collision-lab, gravity-and-orbits, wave-on-a-string, bending-light, geometric-optics, coulombs-law, charges-and-fields, faradays-law, ohms-law, resistance-in-a-wire, circuit-construction-kit-dc, circuit-construction-kit-ac, capacitor-lab-basics, gas-properties, states-of-matter, calculus-grapher, graphing-quadratics, graphing-lines, function-builder, trig-tour, vector-addition, curve-fitting, plinko-probability, area-model-algebra, build-an-atom, isotopes-and-atomic-mass, molecule-shapes, balancing-chemical-equations, ph-scale, acid-base-solutions, concentration, molarity, beers-law-lab, reactants-products-and-leftovers.
Write 2-4 concrete tasks that use the sim's real controls ("Set the launch
angle to 30° and then 60°: compare the ranges"), then explain what they
should notice only after they report back.
\`\`\``;

export function surfaceGuide(surface: Surface): string {
  return surface === "app" ? COMMON + APP : COMMON;
}
