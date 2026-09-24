import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { streamGemini } from "../ai/gemini";
import { parseJsonBlock } from "../providers";
import { ingestText } from "./ingest";

/**
 * The MoeAI Organizer: from a pile of lecture files to a course MoeAI knows.
 *
 * buildBrain reads everything staff uploaded for a course and writes the
 * course's "brain": a week-by-week map, a glossary in the lecturer's own
 * terms, the formulas, the mistakes students will make, practice questions,
 * and the gaps (topics the slides lean on but never explain).
 *
 * researchGap then fills one gap on its own: it researches the topic on the
 * web (Gemini with Google Search), writes a study note at the course's level
 * with its sources, and files it as course material marked pending_review.
 * Staff approve it before any student can retrieve it (RLS enforces that, not
 * the page), so MoeAI can extend a course without putting words in a
 * lecturer's mouth.
 */
export type Brain = {
  overview: string;
  outline: { week?: number | null; topic: string; subtopics?: string[]; materials?: string[] }[];
  glossary: { term: string; definition: string; source?: string }[];
  formulas: { name: string; latex: string; when?: string }[];
  mistakes: { mistake: string; fix: string }[];
  practice: { question: string; answer: string; topic?: string; difficulty?: string }[];
  gaps: { topic: string; why: string }[];
  summaries?: { id: string; summary: string }[];
};

const BUDGET = 110_000;

async function complete(system: string, user: string, opts: { json?: boolean; tools?: unknown[]; maxOutputTokens?: number; onEvent?: (e: Record<string, unknown>) => void } = {}) {
  let out = "";
  for await (const delta of streamGemini({ system, contents: [{ role: "user", parts: [{ text: user }] }], temperature: 0.3, maxOutputTokens: opts.maxOutputTokens ?? 12000, ...opts })) out += delta;
  return out;
}

/** Everything uploaded for the course, trimmed evenly to what one model call can read. */
async function courseText(sb: SupabaseClient, courseId: string) {
  const { data: materials } = await sb
    .from("course_materials")
    .select("id, title, week, kind, status")
    .eq("course_id", courseId)
    .in("status", ["ready"])
    .neq("kind", "generated")
    .order("week", { ascending: true, nullsFirst: false });
  if (!materials?.length) return { materials: [], text: "" };
  const { data: chunks } = await sb
    .from("course_chunks")
    .select("material_id, idx, page, content")
    .eq("course_id", courseId)
    .in("material_id", materials.map((m) => m.id))
    .order("idx")
    .limit(4000);
  const total = (chunks ?? []).reduce((n, c) => n + c.content.length, 0);
  const keepEvery = Math.max(1, Math.ceil(total / BUDGET));
  const text = materials.map((m) => {
    const own = (chunks ?? []).filter((c) => c.material_id === m.id);
    const kept = own.filter((_, i) => i % keepEvery === 0);
    return `=== MATERIAL id=${m.id} "${m.title}"${m.week ? ` (week ${m.week})` : ""} ===\n${kept.map((c) => `[p.${c.page}] ${c.content}`).join("\n")}`;
  }).join("\n\n");
  return { materials, text };
}

export async function buildBrain(sb: SupabaseClient, course: { id: string; code: string; title: string }): Promise<Brain> {
  const { materials, text } = await courseText(sb, course.id);
  if (!materials.length) throw new Error("Upload and process at least one file first.");

  const system = [
    "You are the MoeAI Organizer. A university lecturer uploaded their course files; you turn them into the knowledge base a tutor will teach from.",
    "Stay faithful to the lecturer's material: their notation, terminology, order and level. Do not invent syllabus content.",
    "Output ONLY valid JSON matching the schema you are given. Use LaTeX (no $ delimiters) in formula fields.",
  ].join("\n");
  const user = [
    `Course: ${course.code} ${course.title}`,
    "",
    "Return JSON with exactly these keys:",
    '{"overview": "markdown course map, 150-300 words: what the course is about, how the topics build on each other, what to master first",',
    ' "outline": [{"week": number|null, "topic": "...", "subtopics": ["..."], "materials": ["material title"]}],',
    ' "glossary": [{"term": "...", "definition": "one or two sentences in the course\'s own words", "source": "material title, p.N"}],  (15-40 entries)',
    ' "formulas": [{"name": "...", "latex": "...", "when": "when to use it"}],',
    ' "mistakes": [{"mistake": "a specific error students make on this material", "fix": "how to avoid it"}],  (6-12)',
    ' "practice": [{"question": "exam-style question grounded in the material", "answer": "worked answer", "topic": "...", "difficulty": "easy|medium|hard"}],  (8-12)',
    ' "gaps": [{"topic": "a concept the material uses or assumes but never explains well", "why": "where it is needed"}],  (2-5)',
    ' "summaries": [{"id": "material id exactly as given", "summary": "two sentences"}]}',
    "",
    "COURSE MATERIAL:",
    text,
  ].join("\n");

  const raw = await complete(system, user, { json: true, maxOutputTokens: 16000 });
  const brain = parseJsonBlock<Brain>(raw);
  if (!brain || typeof brain.overview !== "string") throw new Error("MoeAI could not organize this course. Try again.");

  const arr = <T,>(v: T[] | undefined) => (Array.isArray(v) ? v : []);
  const { error } = await sb.from("course_brain").upsert({
    course_id: course.id,
    overview: brain.overview,
    outline: arr(brain.outline),
    glossary: arr(brain.glossary),
    formulas: arr(brain.formulas),
    mistakes: arr(brain.mistakes),
    practice: arr(brain.practice),
    gaps: arr(brain.gaps),
    updated_at: new Date().toISOString(),
  });
  if (error) throw new Error(error.message);

  const ids = new Set(materials.map((m) => m.id));
  await Promise.all(arr(brain.summaries).filter((s) => ids.has(s.id) && s.summary).map((s) =>
    sb.from("course_materials").update({ summary: String(s.summary).slice(0, 600) }).eq("id", s.id),
  ));
  return brain;
}

export async function researchGap(
  sb: SupabaseClient,
  course: { id: string; code: string; title: string },
  gap: { topic: string; why?: string },
  userId: string,
) {
  const sources = new Map<string, string>();
  const onEvent = (event: Record<string, unknown>) => {
    const candidates = event.candidates as { groundingMetadata?: { groundingChunks?: { web?: { uri?: string; title?: string } }[] } }[] | undefined;
    for (const chunk of candidates?.[0]?.groundingMetadata?.groundingChunks ?? []) {
      if (chunk.web?.uri) sources.set(chunk.web.uri, chunk.web.title || chunk.web.uri);
    }
  };
  const system = "You are the MoeAI Organizer writing a supplementary study note for a university course. Research the topic, then write clearly for a first-year student. Use Markdown and LaTeX ($...$). Be accurate; prefer standard textbook treatments.";
  const user = [
    `Course: ${course.code} ${course.title}`,
    `Topic the lecture material assumes but does not explain: ${gap.topic}`,
    gap.why ? `Where it is needed: ${gap.why}` : "",
    "",
    "Write a 250-450 word note: a plain explanation, one worked example, and how it connects to the course.",
    "Start with a level-2 heading naming the topic.",
  ].join("\n");

  let note = "";
  try {
    note = await complete(system, user, { tools: [{ google_search: {} }], maxOutputTokens: 4000, onEvent });
  } catch {
    // Search grounding is not available on every model or key; write from the model's own knowledge.
    note = await complete(system, user, { maxOutputTokens: 4000 });
  }
  note = note.trim();
  if (!note) throw new Error("MoeAI could not write this note.");
  const refs = [...sources.entries()].slice(0, 6);
  const body = refs.length ? `${note}\n\n**Sources MoeAI consulted:** ${refs.map(([uri, title]) => `[${title}](${uri})`).join(" · ")}` : note;

  const title = `MoeAI note: ${gap.topic}`.slice(0, 160);
  const { data: material, error } = await sb
    .from("course_materials")
    .insert({ course_id: course.id, title, kind: "generated", status: "pending_review", uploaded_by: userId, summary: body.slice(0, 20000), char_count: body.length })
    .select("id, course_id, title")
    .single();
  if (error || !material) throw new Error(error?.message ?? "Could not save the note.");
  const chunks = await ingestText(sb, material, body);
  await sb.from("course_materials").update({ chunk_count: chunks, pages: 1 }).eq("id", material.id);
  return { id: material.id, title, body, sources: refs.length };
}
