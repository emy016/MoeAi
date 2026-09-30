import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { completeChat, parseJsonBlock } from "./providers";

/**
 * Simulators MoeAI builds for each course, instead of a hard-coded catalog
 * matched by keywords (which put a number-systems workbench under
 * Differential Equations).
 *
 * plan(): once a course has a course map (the Organizer's "course brain"),
 * MoeAI reads its outline and formulas and decides what a student of THIS
 * course would actually want to play with. Where one of the app's built-in
 * engines fits exactly it is reused; everything else becomes a planned
 * custom simulator. build(): writes one custom simulator as a sandboxed page
 * fragment in the app's simulator kit (theme colours, KaTeX, plotting
 * helpers), one per request so each fits inside the function time limit.
 * Adding material later and re-planning only adds what is new.
 */

export const BUILTINS: Record<string, string> = {
  "logic-gates": "Logic gates lab: toggle inputs A/B, see AND/OR/NOT/NAND/NOR/XOR/XNOR and half adder outputs",
  "truth-table": "Truth table builder: type any Boolean expression, get its full truth table",
  "kmap": "Karnaugh map simplifier: 2-4 variable K-map, click cells, minimal SOP/POS with groupings",
  "number-systems": "Number systems workbench: binary/octal/decimal/hex conversion, two's complement, step by step",
  "combinational-blocks": "Adders, decoders and multiplexers: interactive combinational circuit blocks",
  "flip-flops": "Flip-flops and timing diagrams: SR/JK/D/T flip-flops with clocked timing diagram",
  "integral-solver": "Integral solver: symbolic and numeric integrals with steps",
  "area-between-curves": "Area between two curves with shading and intersection points",
  "volume-of-revolution": "Volume of revolution: disk/washer/shell method",
  "arc-length": "Arc length of a curve on an interval",
  "series-tester": "Series convergence tester: ratio, root, comparison, integral tests",
  "matrix-calculator": "Matrix calculator: multiply, determinant, inverse, RREF, eigenvalues",
  "linear-system": "Linear system solver: Gaussian elimination with row operations shown",
  "ode-first-order": "First-order ODE solver: separable/linear/exact with slope field and solution curve",
  "ode-second-order": "Second-order linear ODE solver: characteristic equation, undetermined coefficients, plot",
  "ode-system": "Systems of ODEs: phase portrait with eigenvalue classification",
  "python-ide": "Python IDE running in the browser",
  "sorting": "Sorting visualizer: bubble/insertion/merge/quick sort animated",
  "graph-search": "BFS and DFS on a graph, animated",
  "sets": "Sets and Venn diagrams: union, intersection, difference, complement",
  "function-plotter": "Function plotter for any f(x)",
  "projectile": "Projectile motion with angle, speed and gravity",
  "pendulum": "Pendulum and simple harmonic motion",
  "circuit": "Series and parallel resistor circuit with Ohm's law",
  "normal": "Normal distribution: mean, standard deviation, shaded probabilities",
  "ideal-gas": "Ideal gas law PV = nRT",
  "onecompiler-c": "C / C++ online compiler (external)",
  "onecompiler-java": "Java online compiler (external)",
};

const PLANNER = "You design interactive simulators for university courses. You only propose simulators that match what THIS course actually teaches, according to its course map. Output only JSON.";

type BrainRow = { overview?: string | null; outline?: unknown; formulas?: unknown; glossary?: unknown };
type Plan = { builtins?: { id: string; why?: string }[]; custom?: { title: string; topic?: string; purpose: string }[] };

const list = (v: unknown) => (Array.isArray(v) ? (v as Record<string, unknown>[]) : []);

function courseMap(brain: BrainRow): string {
  const outline = list(brain.outline).map((o) => `- ${o.topic ?? ""}${list(o.subtopics).length ? `: ${list(o.subtopics).map(String).join(", ")}` : ""}`).join("\n");
  const formulas = list(brain.formulas).map((f) => `- ${f.name ?? ""}: ${f.latex ?? ""}`).join("\n");
  return [brain.overview ?? "", outline && `Outline:\n${outline}`, formulas && `Formulas:\n${formulas}`].filter(Boolean).join("\n\n").slice(0, 9000);
}

/** Decide the simulators for a course and store them as planned rows. Returns how many were added. */
export async function planCourse(sb: SupabaseClient, course: { id: string; title: string; code?: string | null }, userId: string | null): Promise<{ added: number; builtins: number; custom: number }> {
  const [{ data: brain }, { data: existing }] = await Promise.all([
    sb.from("course_brain").select("overview, outline, formulas, glossary").eq("course_id", course.id).maybeSingle(),
    sb.from("course_simulators").select("title, builtin_id, topic, status").eq("course_id", course.id),
  ]);
  if (!brain) throw new Error("This course has no course map yet. Upload material and press Organize first.");
  const have = existing ?? [];
  const prompt = [
    `Course: ${course.code ? `${course.code} ` : ""}${course.title}`,
    "",
    "COURSE MAP (from the lecturer's own files):",
    courseMap(brain as BrainRow),
    "",
    "Built-in simulators the app already has (reuse one only if it fits a topic this course actually covers):",
    ...Object.entries(BUILTINS).map(([id, d]) => `- ${id}: ${d}`),
    "",
    have.length ? `Already in this course (do not repeat): ${have.map((s) => s.builtin_id || s.title).join("; ")}` : "",
    "",
    "Return JSON: {\"builtins\": [{\"id\": \"built-in id\", \"why\": \"the course topic it serves\"}],",
    " \"custom\": [{\"title\": \"short name, e.g. RC circuit charging\", \"topic\": \"the course topic\", \"purpose\": \"exactly what the student sets, sees and learns: inputs, visuals, outputs\"}]}",
    "Rules: a simulator must be something a student of this course would open before an exam. Never add one for a topic the course map does not cover.",
    "Custom ones are for topics no built-in covers well; prefer visual, interactive, animated ideas (plots that respond to sliders, step-by-step algorithms, state machines).",
    `Aim for 2-6 built-ins and 2-5 custom${have.length ? " new ones (fewer if the course is already covered)" : ""}.`,
  ].filter((l) => l !== "").join("\n");
  const { text } = await completeChat([{ role: "system", content: PLANNER }, { role: "user", content: prompt }], { maxTokens: 2500, order: "gemini,groq,nvidia,openrouter" });
  const plan = parseJsonBlock<Plan>(text);
  if (!plan) throw new Error("MoeAI's plan did not come back readable. Try again.");

  const known = new Set(have.map((s) => s.builtin_id).filter(Boolean));
  const titles = new Set(have.map((s) => String(s.title).toLowerCase()));
  const rows: Record<string, unknown>[] = [];
  let position = have.length;
  for (const b of plan.builtins ?? []) {
    if (!BUILTINS[b.id] || known.has(b.id)) continue;
    known.add(b.id);
    rows.push({ course_id: course.id, title: BUILTINS[b.id].split(":")[0], topic: String(b.why ?? "").slice(0, 200), builtin_id: b.id, status: "ready", source: "auto", position: position++, created_by: userId });
  }
  let custom = 0;
  for (const c of (plan.custom ?? []).slice(0, 6)) {
    const title = String(c.title ?? "").trim().slice(0, 120);
    if (!title || titles.has(title.toLowerCase()) || !c.purpose) continue;
    titles.add(title.toLowerCase());
    custom++;
    rows.push({ course_id: course.id, title, topic: String(c.topic ?? "").slice(0, 200), purpose: String(c.purpose).slice(0, 600), status: "planned", source: "auto", position: position++, created_by: userId });
  }
  if (rows.length) {
    const { error } = await sb.from("course_simulators").insert(rows);
    if (error) throw new Error(error.message);
  }
  return { added: rows.length, builtins: rows.length - custom, custom };
}

const KIT_GUIDE = `You write ONE interactive simulator as an HTML fragment (no <html>, <head> or <body>) that runs in a sandboxed iframe inside the MoeAI app.

The page already has (do not re-create):
- CSS variables for the student's theme: --m-accent, --m-text, --m-muted, --m-secondary, --m-bg, --m-surface, --m-surface-2, --m-border, --m-danger. Use ONLY these for colours (plus white on accent), so it follows light/dark and the accent.
- Classes: .m-card (panel), .m-title, .m-row (flex row), .m-col, .m-label, .m-muted, .m-stat (mono pill for a number), .m-btn-ghost; buttons, range sliders, inputs and selects are already styled. .sim-grid, .sim-row>label, .sim-out, .sim-tabs (button.on), canvas.sim-plot (280px plot), .sim-tag, .sim-err, .sim-examples.
- KaTeX: any text written as $...$ or $$...$$ is typeset automatically, including text your script writes later (in JS strings, double the backslashes: '$\\\\frac{a}{b}$').
- math.js as the global \`math\` (math.evaluate, math.parse, complex numbers, matrices).
- K helpers: K.$(id); K.fmt(n, digits) formats numbers cleanly; K.compile("sin(x)^2", ["x"]) returns f(x); K.tex(expr) returns LaTeX of an expression; K.plot(canvas, {xmin,xmax,ymin?,ymax?, fns:[{f, label?}], paths:[[[x,y],...]], points:[{x,y,label?}]}) draws axes, grid and curves in theme colours and returns {X,Y}; K.simpson(f,a,b,n); K.roots(f,a,b); K.on([ids], fn) re-runs fn on input; K.examples(containerId, [{label,...}], apply); K.debounce(fn, ms); K.color(i) series colour.

Quality bar (this is shown to real students before exams):
- One clear purpose. A short title row, the controls, and a live visual that responds immediately (sliders update in real time, requestAnimationFrame for motion, smooth easing).
- Numbers formatted with K.fmt, units shown, formulas typeset with KaTeX, a one-line live readout of the key result.
- Animate state changes (CSS transitions, canvas animation). Include 2-4 example presets with K.examples.
- Correct maths and physics. Handle bad input with a friendly .sim-err message, never a crash.
- Mobile first: works at 360px wide, touch-friendly (pointer events), no horizontal scroll.
- No external requests, no fetch, no localStorage, no alert(). Vanilla JS only. Keep it under 250 lines.
Output ONLY the fragment: optional <style>, the markup, and one <script>.`;

/** Write one planned custom simulator. Marks it ready or failed. */
export async function buildSimulator(sb: SupabaseClient, sim: { id: string; course_id: string; title: string; topic: string | null; purpose: string | null }, courseTitle: string): Promise<void> {
  await sb.from("course_simulators").update({ status: "building", error: null, updated_at: new Date().toISOString() }).eq("id", sim.id);
  try {
    const { text } = await completeChat([
      { role: "system", content: KIT_GUIDE },
      { role: "user", content: `Course: ${courseTitle}\nSimulator: ${sim.title}\nTopic: ${sim.topic ?? ""}\nWhat the student does and learns: ${sim.purpose ?? sim.title}` },
    ], { maxTokens: 9000, order: process.env.SIM_BUILD_ORDER || "groq,gemini,nvidia,openrouter" });
    const code = extractFragment(text);
    if (!code) throw new Error("The simulator did not come back as a page.");
    await sb.from("course_simulators").update({ code, status: "ready", error: null, updated_at: new Date().toISOString() }).eq("id", sim.id);
  } catch (err) {
    await sb.from("course_simulators").update({ status: "failed", error: (err instanceof Error ? err.message : "Build failed.").slice(0, 300), updated_at: new Date().toISOString() }).eq("id", sim.id);
    throw err;
  }
}

/** The fragment out of a reply that may wrap it in a code fence or a full document. */
export function extractFragment(raw: string): string | null {
  let s = raw.trim();
  const fence = s.match(/```(?:html)?\s*([\s\S]*?)```/i);
  if (fence) s = fence[1].trim();
  const body = s.match(/<body[^>]*>([\s\S]*)<\/body>/i);
  if (body) {
    const styles = [...s.matchAll(/<style[^>]*>[\s\S]*?<\/style>/gi)].map((m) => m[0]).join("\n");
    s = `${styles}\n${body[1]}`;
  }
  s = s.replace(/<\/?(html|head|body)[^>]*>/gi, "").replace(/<!doctype[^>]*>/gi, "").trim();
  // No network from a simulator: drop external scripts and fetch calls.
  s = s.replace(/<script[^>]+src=[^>]*>\s*<\/script>/gi, "");
  if (!/<script[\s>]/i.test(s) || s.length < 200) return null;
  return s.slice(0, 60000);
}
