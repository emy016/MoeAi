/**
 * GET /api/ranked/questions?course=<id|all>&count=10
 *
 * Arena questions from the student's own courses instead of a fixed bank:
 *  - built instantly and for free from MoeAI's course map (the lecturer's
 *    files): glossary terms against definitions, formula names against
 *    formulas, and the common mistakes as true/false;
 *  - plus multiple-choice questions a model wrote from the course's lecture
 *    passages, cached per course (ranked_questions) so each is generated once
 *    and shared. Generation runs after the response and only with the
 *    service-role client, so no student can plant questions for classmates.
 * Guests and students without course material get an empty list; the Arena
 * then falls back to its general bank.
 */
import { NextRequest, after } from "next/server";
import { supabaseAdmin, supabaseServer } from "@/lib/supabase-server";
import { streamGemini } from "@/lib/ai/gemini";
import { completeChat } from "@/lib/providers";
import { parseModelJson } from "@/lib/moeai/latex-json";
import { checkDailyLimit } from "@/lib/ratelimit";

export const runtime = "nodejs";
export const maxDuration = 60;

type Q = { q: string; choices: string[]; correct: number; exp: string; diff: "easy" | "medium" | "hard"; course: string; source: "map" | "lecture" };

const CACHE_TARGET = 30;

const esc = (s: unknown) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
/** Text with $math$ kept for KaTeX, everything else escaped. */
const text = (s: unknown) => esc(s).slice(0, 400);
const shuffle = <T,>(a: T[]) => { const b = a.slice(); for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; };

/** Four options with the right one at a random position. */
function mcq(right: string, wrong: string[]): { choices: string[]; correct: number } | null {
  const others = shuffle([...new Set(wrong.filter((w) => w && w !== right))]).slice(0, 3);
  if (others.length < 3) return null;
  const choices = shuffle([right, ...others]);
  return { choices, correct: choices.indexOf(right) };
}

type Brain = { glossary?: { term?: string; definition?: string }[]; formulas?: { name?: string; latex?: string; when?: string }[]; mistakes?: { mistake?: string; fix?: string }[] };

function fromBrain(brain: Brain, course: string): Q[] {
  const out: Q[] = [];
  const glossary = (brain.glossary ?? []).filter((g) => g.term && g.definition);
  for (const g of glossary) {
    const m = mcq(text(g.term), glossary.map((x) => text(x.term)));
    if (m) out.push({ q: `Which term matches this definition?<br><i>${text(g.definition)}</i>`, ...m, exp: `<b>${text(g.term)}</b>: ${text(g.definition)}`, diff: "easy", course, source: "map" });
  }
  const formulas = (brain.formulas ?? []).filter((f) => f.name && f.latex);
  for (const f of formulas) {
    const m = mcq(`$${text(f.latex)}$`, formulas.map((x) => `$${text(x.latex)}$`));
    if (m) out.push({ q: `Which one is the <b>${text(f.name)}</b>?`, ...m, exp: `${text(f.name)}: $${text(f.latex)}$${f.when ? `. ${text(f.when)}` : ""}`, diff: "medium", course, source: "map" });
  }
  for (const mk of (brain.mistakes ?? []).filter((x) => x.mistake && x.fix)) {
    out.push({ q: `True or false: this is correct.<br><i>${text(mk.mistake)}</i>`, choices: ["True", "False"], correct: 1, exp: `False. ${text(mk.fix)}`, diff: "medium", course, source: "map" });
  }
  return out;
}

async function generate(courseId: string, title: string): Promise<void> {
  const admin = supabaseAdmin();
  const { count } = await admin.from("ranked_questions").select("id", { count: "exact", head: true }).eq("course_id", courseId);
  if ((count ?? 0) >= CACHE_TARGET) return;
  const { data: chunks } = await admin.from("course_chunks").select("content, page").eq("course_id", courseId).limit(400);
  if (!chunks?.length) return;
  const sample = shuffle(chunks).slice(0, 14).map((c) => `[p.${c.page}] ${c.content}`).join("\n").slice(0, 16000);
  const system = "You write quick multiple-choice questions for a live quiz game between university students. Faithful to the lecture passages; one clearly correct option; plausible distractors; math in $...$ LaTeX with backslashes doubled inside JSON strings. Output only JSON.";
  const prompt = `Course: ${title}. From these lecture passages, write 10 questions answerable in under 20 seconds.\nReturn {"questions":[{"q":"question","choices":["a","b","c","d"],"correct":0,"exp":"one-sentence reason","diff":"easy|medium|hard"}]}.\n\nPASSAGES:\n${sample}`;
  let raw = "";
  try {
    for await (const d of streamGemini({ system, contents: [{ role: "user", parts: [{ text: prompt }] }], temperature: 0.6, maxOutputTokens: 5000, json: true })) raw += d;
  } catch {
    raw = (await completeChat([{ role: "system", content: system }, { role: "user", content: prompt }], { maxTokens: 4000, background: true })).text;
  }
  const parsed = parseModelJson<{ questions?: { q?: string; choices?: string[]; correct?: number; exp?: string; diff?: string }[] }>(raw);
  const rows = (parsed?.questions ?? [])
    .filter((x) => x.q && Array.isArray(x.choices) && x.choices.length === 4 && Number.isInteger(x.correct) && x.correct! >= 0 && x.correct! < 4)
    .map((x) => ({ course_id: courseId, question: { q: text(x.q), choices: x.choices!.map(text), correct: x.correct, exp: text(x.exp), diff: ["easy", "medium", "hard"].includes(String(x.diff)) ? x.diff : "medium" } }));
  if (rows.length) await admin.from("ranked_questions").insert(rows);
}

export async function GET(req: NextRequest) {
  const sb = await supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return Response.json({ questions: [], courses: [] });
  const url = new URL(req.url);
  const count = Math.min(20, Math.max(3, Number(url.searchParams.get("count")) || 10));
  const wanted = url.searchParams.get("course");

  const { data: enrolled } = await sb.from("course_enrollments").select("courses(id, title)").eq("user_id", user.id);
  let courses = (enrolled ?? []).map((e) => (Array.isArray(e.courses) ? e.courses[0] : e.courses) as { id: string; title: string } | null).filter(Boolean) as { id: string; title: string }[];
  if (wanted && wanted !== "all") courses = courses.filter((c) => c.id === wanted);
  if (!courses.length) return Response.json({ questions: [], courses: [] });
  const ids = courses.map((c) => c.id);

  const [{ data: brains }, { data: cached }] = await Promise.all([
    sb.from("course_brain").select("course_id, glossary, formulas, mistakes").in("course_id", ids),
    sb.from("ranked_questions").select("course_id, question").in("course_id", ids).limit(400),
  ]);
  const titleOf = (id: string) => courses.find((c) => c.id === id)?.title ?? "";
  const pool: Q[] = [
    ...(brains ?? []).flatMap((b) => fromBrain(b as Brain, titleOf(b.course_id))),
    ...(cached ?? []).map((r) => ({ ...(r.question as Omit<Q, "course" | "source">), course: titleOf(r.course_id), source: "lecture" as const })),
  ];

  // Top up the lecture-question cache for courses that have material, after responding.
  if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const cachedPer = new Map<string, number>();
    for (const r of cached ?? []) cachedPer.set(r.course_id, (cachedPer.get(r.course_id) ?? 0) + 1);
    const low = courses.filter((c) => (cachedPer.get(c.id) ?? 0) < CACHE_TARGET && (brains ?? []).some((b) => b.course_id === c.id));
    if (low.length) {
      const day = await checkDailyLimit(sb, { perDay: 150, demoPerDay: 15 });
      if (day.allowed) after(() => generate(low[0].id, low[0].title).catch(() => undefined));
    }
  }

  return Response.json({ questions: shuffle(pool).slice(0, count), courses, pool: pool.length });
}
