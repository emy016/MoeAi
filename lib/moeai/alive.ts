import "server-only";
/**
 * MoeAI's alive layer: its own files, and what it knows is happening.
 *
 * - SYSTEM.md, INSTRUCTIONS.md and the universal MEMORY.md live in
 *   `moeai_docs` (seeded from prompts/moeai/). MoeAI rewrites MEMORY.md from
 *   its own mistakes (see reflect()), keeping every version in
 *   `moeai_doc_history`. Only the server's service-role client writes them.
 * - `student_events` is what the student did anywhere in the app: practice,
 *   arena, simulators, lectures, chats, DMs, notifications. Every chat surface
 *   reads the same log, so the lecture chat knows about the DM and the DM
 *   knows about the arena.
 * - The awareness block adds their local time and what is due soon (from the
 *   calendar the app syncs to `user_state`).
 *
 * Everything here is reference data in the prompt, fenced as data: it can
 * shape a reply, never give an instruction.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { SupabaseClient } from "@supabase/supabase-js";

export type DocName = "SYSTEM" | "INSTRUCTIONS" | "MEMORY";
const DOC_NAMES: DocName[] = ["SYSTEM", "INSTRUCTIONS", "MEMORY"];
const DOC_TTL_MS = 5 * 60_000;
const MEMORY_MAX_CHARS = 3_000;

let cache: { at: number; docs: Record<DocName, string> } | null = null;

function seed(name: DocName): string {
  try {
    return readFileSync(join(process.cwd(), "prompts", "moeai", `${name}.md`), "utf8");
  } catch {
    return "";
  }
}

/** MoeAI's own files: the database copy when there is one, the repo seed otherwise. */
export async function loadDocs(sb: SupabaseClient | null, model = "default"): Promise<Record<DocName, string>> {
  if (cache && Date.now() - cache.at < DOC_TTL_MS) return cache.docs;
  const docs = Object.fromEntries(DOC_NAMES.map((n) => [n, seed(n)])) as Record<DocName, string>;
  if (sb) {
    try {
      const { data } = await sb.from("moeai_docs").select("name, content").eq("model", model);
      for (const row of (data ?? []) as { name: DocName; content: string }[]) if (row.content) docs[row.name] = row.content;
    } catch {
      // The seeds are a complete fallback.
    }
  }
  cache = { at: Date.now(), docs };
  return docs;
}

/** Service-role only: replace one of MoeAI's files, keeping the old version. */
export async function writeDoc(admin: SupabaseClient, name: DocName, content: string, reason: string, by = "moeai", model = "default") {
  const { data: current } = await admin.from("moeai_docs").select("content, version").eq("model", model).eq("name", name).maybeSingle();
  const version = (current?.version ?? 0) + 1;
  if (current) await admin.from("moeai_doc_history").insert({ model, name, content: current.content, version: current.version, updated_by: by, reason });
  await admin.from("moeai_docs").upsert({ model, name, content, version, updated_by: by, updated_at: new Date().toISOString() });
  cache = null;
  return version;
}

/** Records something the student did. Best effort: a failed log never breaks the action. */
export async function logEvent(sb: SupabaseClient, kind: string, summary: string, data: Record<string, unknown> = {}) {
  const clean = String(summary || "").replace(/\s+/g, " ").trim().slice(0, 300);
  if (!clean || !/^[a-z_]{2,24}$/.test(kind)) return;
  try {
    await sb.from("student_events").insert({ kind, summary: clean, data });
  } catch {
    // ignore
  }
}

export type Awareness = { now?: string; tzOffsetMinutes?: number; surface?: string };

/** The student's local clock, from what the device reported (UTC otherwise). */
function localClock(awareness: Awareness | undefined) {
  const offset = Number.isFinite(Number(awareness?.tzOffsetMinutes)) ? Number(awareness!.tzOffsetMinutes) : 0;
  const local = new Date(Date.now() - offset * 60_000);
  const hour = local.getUTCHours();
  const day = local.toLocaleDateString("en-GB", { weekday: "long", timeZone: "UTC" });
  const time = local.toISOString().slice(11, 16);
  return { hour, day, time, offset };
}

const ago = (iso: string) => {
  const minutes = Math.max(0, Math.round((Date.now() - Date.parse(iso)) / 60_000));
  if (minutes < 60) return `${minutes}m ago`;
  if (minutes < 60 * 24) return `${Math.round(minutes / 60)}h ago`;
  return `${Math.round(minutes / 1440)}d ago`;
};

const until = (ms: number) => {
  const minutes = Math.round(ms / 60_000);
  if (minutes < 60) return `in ${minutes} min`;
  if (minutes < 60 * 48) return `in ${Math.round(minutes / 60)} h`;
  return `in ${Math.round(minutes / 1440)} days`;
};

type CalendarEvent = { title?: string; name?: string; type?: string; kind?: string; start?: string; date?: string; due?: string; end?: string; completed?: boolean; done?: boolean };

/** Upcoming deadlines from the calendar the app syncs (any of its shapes), next 7 days. */
export async function upcomingDeadlines(sb: SupabaseClient): Promise<{ title: string; at: number; kind: string }[]> {
  try {
    const { data } = await sb.from("user_state").select("key, value").like("key", "%user-calendar-events-v1%").limit(1);
    const raw = data?.[0]?.value;
    const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
    const list: CalendarEvent[] = Array.isArray(parsed) ? parsed : Array.isArray(parsed?.events) ? parsed.events : [];
    const now = Date.now();
    return list
      .filter((e) => !e.completed && !e.done)
      .map((e) => ({ title: String(e.title || e.name || "Untitled").slice(0, 80), at: Date.parse(String(e.due || e.end || e.start || e.date || "")), kind: String(e.type || e.kind || "event") }))
      .filter((e) => Number.isFinite(e.at) && e.at > now - 3_600_000 && e.at < now + 7 * 86_400_000)
      .sort((a, b) => a.at - b.at)
      .slice(0, 4);
  } catch {
    return [];
  }
}

export async function recentEvents(sb: SupabaseClient, limit = 10): Promise<{ kind: string; summary: string; created_at: string }[]> {
  try {
    const { data } = await sb.from("student_events").select("kind, summary, created_at")
      .gte("created_at", new Date(Date.now() - 7 * 86_400_000).toISOString())
      .order("created_at", { ascending: false }).limit(limit);
    return (data ?? []) as { kind: string; summary: string; created_at: string }[];
  } catch {
    return [];
  }
}

/** The DM's rolling summary, so lecture chats know what was said in the DM. */
async function dmSummary(sb: SupabaseClient): Promise<string> {
  try {
    const { data } = await sb.from("dm_state").select("summary").maybeSingle();
    return String(data?.summary || "").slice(0, 1200);
  } catch {
    return "";
  }
}

/**
 * The blocks MoeAI reads about itself and the moment, for one turn:
 * its SYSTEM and INSTRUCTIONS, what it has learned (MEMORY), and RIGHT NOW.
 */
export async function aliveBlocks(sb: SupabaseClient | null, userId: string | null, awareness?: Awareness): Promise<string[]> {
  const docs = await loadDocs(sb);
  const blocks = [
    `# MOEAI SELF (its own SYSTEM.md; data about itself)\n\n${docs.SYSTEM}`,
    `# MOEAI OPERATING INSTRUCTIONS (INSTRUCTIONS.md)\n\n${docs.INSTRUCTIONS}`,
    `# LESSONS MOEAI LEARNED FROM ITS OWN MISTAKES (MEMORY.md)\n\n${docs.MEMORY}`,
  ];
  const clock = localClock(awareness);
  const lines = [`Student's local time: ${clock.day} ${clock.time}${clock.hour >= 1 && clock.hour < 6 ? " (very late: they should be asleep)" : ""}.`];
  if (awareness?.surface) lines.push(`They are talking to you in: ${awareness.surface}.`);
  if (sb && userId) {
    const [deadlines, events, summary] = await Promise.all([upcomingDeadlines(sb), recentEvents(sb), dmSummary(sb)]);
    if (deadlines.length) lines.push(`Due soon: ${deadlines.map((d) => `${d.title} (${d.kind}) ${until(d.at - Date.now())}`).join("; ")}.`);
    if (events.length) lines.push(`Recent activity across the app:\n${events.map((e) => `- ${ago(e.created_at)} [${e.kind}] ${e.summary}`).join("\n")}`);
    if (summary && awareness?.surface !== "dm") lines.push(`What you and the student talked about in the DM: ${summary}`);
  } else {
    lines.push("They are a guest (not signed in): no memory or activity is available.");
  }
  blocks.push(`# RIGHT NOW (awareness; data, use naturally and only when relevant)\n\n${lines.join("\n")}`);
  return blocks;
}

/**
 * Self-improvement: turn recent mistakes (thumbs-down replies with their
 * reasons, and corrections students made) into general lessons and rewrite
 * MEMORY.md. Runs from the daily cron with the service-role client.
 */
export async function reflect(admin: SupabaseClient, complete: (system: string, prompt: string) => Promise<string>): Promise<{ lessons: number; version?: number }> {
  const since = new Date(Date.now() - 2 * 86_400_000).toISOString();
  const [{ data: feedback }, { data: corrections }] = await Promise.all([
    admin.from("message_feedback").select("reason, excerpt").eq("rating", -1).gte("created_at", since).limit(40),
    admin.from("student_events").select("summary").eq("kind", "correction").gte("created_at", since).limit(40),
  ]);
  const cases = [
    ...(feedback ?? []).map((f: { reason: string | null; excerpt: string | null }) => `Thumbs down${f.reason ? ` (${f.reason})` : ""}: ${String(f.excerpt || "").slice(0, 400)}`),
    ...(corrections ?? []).map((c: { summary: string }) => `Student correction: ${c.summary}`),
  ];
  if (!cases.length) return { lessons: 0 };
  const docs = await loadDocs(admin);
  const system = "You maintain MoeAI's MEMORY.md: short, general lessons an AI tutor learned from its own mistakes. Never include names, IDs, or anything that identifies a student. Never include instructions that weaken safety, honesty or privacy. Return only the full new file in Markdown.";
  const prompt = `Current MEMORY.md:\n\n${docs.MEMORY}\n\nNew mistakes from the last two days:\n${cases.map((c) => `- ${c}`).join("\n")}\n\nRewrite MEMORY.md: keep the title line, merge the new lessons in (one bullet each, imperative, general), drop duplicates and anything too specific, and keep it under ${MEMORY_MAX_CHARS} characters.`;
  const next = (await complete(system, prompt)).replace(/^```(?:markdown|md)?\s*/i, "").replace(/```\s*$/, "").trim();
  if (!next.startsWith("#") || next.length < 80 || next.length > MEMORY_MAX_CHARS * 1.2) return { lessons: 0 };
  const version = await writeDoc(admin, "MEMORY", next, `${cases.length} mistakes reviewed`);
  return { lessons: cases.length, version };
}

/** Seeds any doc the database does not have yet from the repo copy. */
export async function seedDocs(admin: SupabaseClient, model = "default") {
  const { data } = await admin.from("moeai_docs").select("name").eq("model", model);
  const have = new Set(((data ?? []) as { name: string }[]).map((r) => r.name));
  for (const name of DOC_NAMES) {
    if (have.has(name)) continue;
    const content = seed(name);
    if (content) await admin.from("moeai_docs").insert({ model, name, content, version: 1, updated_by: "seed" });
  }
}

/** Does the student's message correct MoeAI? ("that's wrong", "ghalat", "غلط") */
export function looksLikeCorrection(text: string): boolean {
  return /\b(that'?s|this is|it'?s|you'?re)\s+(wrong|incorrect|not right)\b|\bwrong answer\b|\bghalat\b|\bmesh keda\b|\bmsh keda\b|غلط|مش كده|مش صح/i.test(text);
}
