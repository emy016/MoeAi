import readings from "@/content/starter-lessons.json";

export type Mode = "tutor" | "quick" | "code" | "math" | "library" | "quiz";
export const modes: { id: Mode; label: string; description: string }[] = [
  { id: "tutor", label: "Study with Moe", description: "Understand it, one idea at a time" },
  { id: "quick", label: "Quick answer", description: "Keep it short and direct" },
  { id: "code", label: "Code partner", description: "Write, trace, and debug" },
  { id: "math", label: "Work the math", description: "Steps, equations, and intuition" },
  { id: "library", label: "Library mode", description: "Answers grounded in your selected sources" },
  { id: "quiz", label: "Quiz me", description: "One question, then your turn" },
];
/** A passage the answer was built on. `excerpt` is short on purpose: enough to
 *  recognise the paragraph, not enough to re-host somebody's lecture. */
export type Citation = { title: string; ref: string; source: string; excerpt: string };
import { normalizeSubject, type Subject } from "./subjects";
import { CalendarKind, type CalendarObject, type Kind } from "./calendar";
const KINDS = new Set<Kind>(Object.values(CalendarKind));
export type Message = { id: string; role: "user" | "assistant"; content: string; sources?: string[]; citations?: Citation[]; status?: "error" | "stopped" };
export type Chat = { id: string; title: string; messages: Message[]; updated: number; mode: Mode };
export type LibraryFile = { id: string; title: string; content: string; scope: "semester" | "student" | "tutor" | "faculty"; course: string; added: number };
/**
 * The planner's events are calendar objects now — see lib/moeai/calendar.ts.
 * The old shape ({ date }) is still in people's browsers, so it is migrated on
 * read rather than discarded: a stored deadline keeps its title and its time
 * and gains the kind it always was.
 */
export type StudyEvent = CalendarObject;
type LegacyEvent = { id: string; title: string; date: string; done?: boolean };

function migrateEvent(raw: LegacyEvent | CalendarObject): CalendarObject | null {
  if (!raw || typeof raw.id !== "string" || typeof raw.title !== "string") return null;
  if ("start" in raw && typeof raw.start === "string" && Number.isFinite(Date.parse(raw.start))) {
    return { ...raw, kind: KINDS.has(raw.kind) ? raw.kind : CalendarKind.EVENT };
  }
  const legacy = raw as LegacyEvent;
  if (!Number.isFinite(Date.parse(legacy.date))) return null;
  return {
    id: legacy.id,
    title: legacy.title,
    // Everything the old planner held was something with a due time.
    kind: CalendarKind.ASSIGNMENT_DUE,
    start: new Date(legacy.date).toISOString(),
    point: true,
    done: Boolean(legacy.done),
  };
}
/**
 * `textSize`, `textWeight` and `motion` are the app's accessibility settings,
 * ported: the same three controls, the same scales. The web had none of them
 * and relied on the browser's own zoom, which resizes the chrome too.
 */
export type Settings = { name: string; language: string; detail: string; memory: string; proactive: boolean; theme: string; textSize: string; textWeight: string; motion: boolean; mode: string };
/** The app's four steps, as multipliers on the workspace's base size. */
export const TEXT_SIZES: Record<string, number> = { Small: 0.92, Default: 1, Large: 1.12, "Extra large": 1.26 };
/**
 * `subjects` holds only the courses the student added — the eight seeded ones
 * live in code, so they can be corrected without migrating anyone's storage.
 * `completions` is keyed "subjectId:lectureId" and is kept apart from the
 * lectures for the same reason: ticking a lecture off must never mean editing
 * shared course material.
 */
export type Workspace = { chats: Chat[]; files: LibraryFile[]; events: StudyEvent[]; settings: Settings; notebook: string; dismissed: string[]; subjects: Subject[]; completions: Record<string, boolean> };
export const defaults: Settings = { name: "", language: "Auto · match me", detail: "Balanced", memory: "", proactive: true, theme: "ruby", mode: "Dark", textSize: "Default", textWeight: "Regular", motion: true };
export const starterFiles: LibraryFile[] = readings.map((item, i) => ({ id: `edumoe-${i}`, title: item.title, content: item.summary, scope: "semester", course: item.code, added: 0 }));
export function emptyWorkspace(): Workspace { return { chats: [], files: [], events: [], settings: { ...defaults }, notebook: "", dismissed: [], subjects: [], completions: {} }; }
export const storageKey = "moeai-workspace-v2";
export function loadWorkspace(): Workspace {
  try {
    const data = JSON.parse(localStorage.getItem(storageKey) || "null");
    if (!data || !Array.isArray(data.chats) || !Array.isArray(data.files) || !Array.isArray(data.events)) return emptyWorkspace();
    return {
      chats: data.chats.filter((c: Chat) => typeof c.id === "string" && typeof c.title === "string" && Array.isArray(c.messages) && modes.some(m => m.id === c.mode)).slice(0, 40).map((c: Chat) => ({ ...c, messages: c.messages.filter(m => m && typeof m.content === "string" && ["user", "assistant"].includes(m.role)).slice(-80) })),
      files: data.files.filter((f: LibraryFile) => typeof f.id === "string" && typeof f.title === "string" && typeof f.content === "string" && ["student", "tutor"].includes(f.scope)).slice(0, 40),
      events: data.events.map(migrateEvent).filter((e: CalendarObject | null): e is CalendarObject => Boolean(e)).slice(0, 100),
      settings: { ...defaults, ...Object.fromEntries(Object.entries(data.settings || {}).filter(([k, v]) => k in defaults && typeof v === typeof defaults[k as keyof Settings])) },
      notebook: typeof data.notebook === "string" ? data.notebook.slice(0, 50000) : "",
      dismissed: Array.isArray(data.dismissed) ? data.dismissed.filter((v: unknown) => typeof v === "string").slice(-100) : [],
      subjects: Array.isArray(data.subjects)
        ? data.subjects.filter((s: Subject) => s && typeof s.id === "string" && typeof s.name === "string").slice(0, 30).map(normalizeSubject)
        : [],
      completions: data.completions && typeof data.completions === "object" && !Array.isArray(data.completions)
        ? Object.fromEntries(Object.entries(data.completions).filter(([, v]) => v === true).slice(0, 2000)) as Record<string, boolean>
        : {},
    };
  } catch { return emptyWorkspace(); }
}
export function downloadText(name: string, text: string, type = "text/markdown") {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement("a"); a.href = url; a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function sourceExcerpt(content: string, query: string, limit = 8000) {
  if (content.length <= limit) return content;
  const words = query.toLowerCase().match(/[\p{L}\p{N}]{3,}/gu) || [];
  const chunks = content.match(/[\s\S]{1,1400}/g) || [];
  return chunks.map((text, i) => ({ text, i, score: words.reduce((sum, word) => sum + Number(text.toLowerCase().includes(word)), 0) })).sort((a, b) => b.score - a.score || a.i - b.i).slice(0, 5).sort((a, b) => a.i - b.i).map(c => c.text).join("\n[…]\n").slice(0, limit);
}
