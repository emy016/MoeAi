import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { streamGemini } from "../ai/gemini";
import { completeChat } from "../providers";
import { parseModelJson } from "../moeai/latex-json";
import { courseName } from "./retrieve";
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

async function complete(system: string, user: string, opts: { json?: boolean; tools?: unknown[]; maxOutputTokens?: number; onEvent?: (e: Record<string, unknown>) => void } = {}) {
  let out = "";
  for await (const delta of streamGemini({ system, contents: [{ role: "user", parts: [{ text: user }] }], temperature: 0.3, maxOutputTokens: opts.maxOutputTokens ?? 12000, ...opts })) out += delta;
  return out;
}

const MATERIAL_BUDGET = 24_000; // characters of one file per digest call
const MERGE_BUDGET = 60_000;

type Digest = {
  summary: string;
  topics: string[];
  glossary: Brain["glossary"];
  formulas: Brain["formulas"];
  mistakes: Brain["mistakes"];
  practice: Brain["practice"];
};

const ORGANIZER = [
  "You are the MoeAI Organizer. A university lecturer uploaded their course files; you turn them into the knowledge base a tutor will teach from.",
  "Stay faithful to the lecturer's material: their notation, terminology, order and level. Do not invent syllabus content.",
  "Output ONLY valid JSON. Put formulas in LaTeX without $ delimiters, and double every backslash inside JSON strings (\\\\frac, \\\\int).",
].join("\n");

/** One call, JSON back, LaTeX-safe parsing; falls back to the other providers when Gemini is busy. */
async function completeJson<T>(system: string, user: string, maxOutputTokens: number): Promise<T> {
  let raw = "";
  try {
    raw = await complete(system, user, { json: true, maxOutputTokens });
  } catch {
    raw = (await completeChat([{ role: "system", content: system }, { role: "user", content: user }], { maxTokens: Math.min(maxOutputTokens, 6000) })).text;
  }
  const parsed = parseModelJson<T>(raw);
  if (!parsed) throw new Error("MoeAI's answer was not readable JSON. Try again.");
  return parsed;
}

const arr = <T,>(v: T[] | undefined) => (Array.isArray(v) ? v : []);

/** Files the organizer reads: processed lecture files, not MoeAI's own notes. */
async function readyMaterials(sb: SupabaseClient, courseId: string) {
  const { data } = await sb
    .from("course_materials")
    .select("id, title, week, digest")
    .eq("course_id", courseId)
    .eq("status", "ready")
    .neq("kind", "generated")
    .order("week", { ascending: true, nullsFirst: false });
  return (data ?? []) as { id: string; title: string; week: number | null; digest: Digest | null }[];
}

/**
 * Step 1, per file: what this file teaches (topics, glossary, formulas,
 * common mistakes, two practice questions), sized to finish well inside one
 * serverless call. Saved on the file, so a failed file can be retried alone.
 */
export async function digestMaterial(sb: SupabaseClient, course: { id: string; code: string; title: string; code_verified?: boolean | null }, materialId: string): Promise<Digest> {
  const { data: material } = await sb.from("course_materials").select("id, title, week").eq("id", materialId).eq("course_id", course.id).maybeSingle();
  if (!material) throw new Error("That file is not in this course.");
  const { data: chunks } = await sb.from("course_chunks").select("idx, page, content").eq("material_id", materialId).order("idx").limit(600);
  const total = (chunks ?? []).reduce((n, c) => n + c.content.length, 0);
  if (!total) throw new Error(`"${material.title}" has no readable text yet. Process it first.`);
  const keepEvery = Math.max(1, Math.ceil(total / MATERIAL_BUDGET));
  const text = (chunks ?? []).filter((_, i) => i % keepEvery === 0).map((c) => `[p.${c.page}] ${c.content}`).join("\n").slice(0, MATERIAL_BUDGET + 2000);
  const digest = await completeJson<Digest>(ORGANIZER, [
    `Course: ${courseName(course)}. File: "${material.title}"${material.week ? ` (week ${material.week})` : ""}.`,
    "Return JSON with exactly these keys:",
    '{"summary": "two sentences: what this file teaches", "topics": ["topic in the lecturer\'s words"],',
    ' "glossary": [{"term": "...", "definition": "one sentence in the file\'s own words", "source": "p.N"}],  (3-10)',
    ' "formulas": [{"name": "...", "latex": "...", "when": "when to use it"}],  (0-8)',
    ' "mistakes": [{"mistake": "a specific error students make here", "fix": "how to avoid it"}],  (1-4)',
    ' "practice": [{"question": "exam-style question from this file", "answer": "worked answer", "topic": "...", "difficulty": "easy|medium|hard"}]}  (2)',
    "",
    "FILE TEXT:",
    text,
  ].join("\n"), 5000);
  const clean: Digest = {
    summary: String(digest.summary || "").slice(0, 600),
    topics: arr(digest.topics).map(String).slice(0, 12),
    glossary: arr(digest.glossary).slice(0, 12),
    formulas: arr(digest.formulas).slice(0, 10),
    mistakes: arr(digest.mistakes).slice(0, 5),
    practice: arr(digest.practice).slice(0, 3),
  };
  const { error } = await sb.from("course_materials").update({ digest: clean, summary: clean.summary || null }).eq("id", materialId);
  if (error) throw new Error(error.message);
  return clean;
}

/**
 * Step 2, the course: merge the file digests into the course map (overview,
 * week-by-week outline, merged glossary and formulas, mistakes, practice,
 * gaps). The digests are small, so this reads the whole course at once.
 */
export async function mergeBrain(sb: SupabaseClient, course: { id: string; code: string; title: string; code_verified?: boolean | null }): Promise<Brain> {
  const materials = await readyMaterials(sb, course.id);
  if (!materials.length) throw new Error("Upload and process at least one file first.");
  const digested = materials.filter((m) => m.digest);
  if (!digested.length) throw new Error("No file has been read yet. Organize again.");
  const digestText = JSON.stringify(digested.map((m) => ({ file: m.title, week: m.week, ...m.digest }))).slice(0, MERGE_BUDGET);
  const merged = await completeJson<Brain>(ORGANIZER, [
    `Course: ${courseName(course)}. Below are digests of each lecture file, in course order.`,
    "Return JSON with exactly these keys:",
    '{"overview": "markdown course map, 150-300 words: what the course is about, how the topics build on each other, what to master first",',
    ' "outline": [{"week": number|null, "topic": "...", "subtopics": ["..."], "materials": ["file title"]}],',
    ' "glossary": [{"term": "...", "definition": "...", "source": "file title, p.N"}],  (merge duplicates, 15-40)',
    ' "formulas": [{"name": "...", "latex": "...", "when": "..."}],  (merge duplicates)',
    ' "mistakes": [{"mistake": "...", "fix": "..."}],  (6-12, the most important)',
    ' "practice": [{"question": "...", "answer": "...", "topic": "...", "difficulty": "easy|medium|hard"}],  (8-12, across the course)',
    ' "gaps": [{"topic": "a concept the files use or assume but never explain well", "why": "where it is needed"}],  (2-5)',
    ' "code": "the course code exactly as printed on the files (e.g. CS 103), or null if the files never show one"}',
    "",
    "FILE DIGESTS:",
    digestText,
  ].join("\n"), 9000);
  if (typeof merged.overview !== "string" || !merged.overview.trim()) throw new Error("MoeAI returned an empty course map. Try again.");
  const { error } = await sb.from("course_brain").upsert({
    course_id: course.id,
    overview: merged.overview,
    outline: arr(merged.outline),
    glossary: arr(merged.glossary),
    formulas: arr(merged.formulas),
    mistakes: arr(merged.mistakes),
    practice: arr(merged.practice),
    gaps: arr(merged.gaps),
    updated_at: new Date().toISOString(),
  });
  if (error) throw new Error(error.message);
  // A code printed on the lecturer's own files replaces the seeded guess.
  const printed = typeof (merged as { code?: unknown }).code === "string" ? String((merged as { code?: string }).code) : "";
  if (printed && !course.code_verified) await sb.rpc("set_course_code", { p_course: course.id, p_code: printed }).then(() => {}, () => {});
  return merged;
}

/** Everything at once (server-side callers): digest files that have none, then merge. */
export async function buildBrain(sb: SupabaseClient, course: { id: string; code: string; title: string; code_verified?: boolean | null }): Promise<Brain> {
  for (const m of await readyMaterials(sb, course.id)) if (!m.digest) await digestMaterial(sb, course, m.id);
  return mergeBrain(sb, course);
}

/** Which files still need a digest, for the organizer page to walk through one call at a time. */
export async function organizePlan(sb: SupabaseClient, courseId: string, fresh: boolean) {
  const materials = await readyMaterials(sb, courseId);
  return materials.map((m) => ({ id: m.id, title: m.title, needsDigest: fresh || !m.digest }));
}

export async function researchGap(
  sb: SupabaseClient,
  course: { id: string; code: string; title: string; code_verified?: boolean | null },
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
    `Course: ${courseName(course)}`,
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
