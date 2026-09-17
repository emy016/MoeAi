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
export type Message = { id: string; role: "user" | "assistant"; content: string; sources?: string[]; status?: "error" | "stopped" };
export type Chat = { id: string; title: string; messages: Message[]; updated: number; mode: Mode };
export type LibraryFile = { id: string; title: string; content: string; scope: "semester" | "student" | "tutor" | "faculty"; course: string; added: number };
export type StudyEvent = { id: string; title: string; date: string; done: boolean };
export type Settings = { name: string; language: string; detail: string; memory: string; proactive: boolean; theme: string };
export type Workspace = { chats: Chat[]; files: LibraryFile[]; events: StudyEvent[]; settings: Settings; notebook: string; dismissed: string[] };
export const defaults: Settings = { name: "", language: "Auto · match me", detail: "Balanced", memory: "", proactive: true, theme: "ruby" };
export const starterFiles: LibraryFile[] = readings.map((item, i) => ({ id: `edumoe-${i}`, title: item.title, content: item.summary, scope: "semester", course: item.code, added: 0 }));
export function emptyWorkspace(): Workspace { return { chats: [], files: [], events: [], settings: { ...defaults }, notebook: "", dismissed: [] }; }
export const storageKey = "moeai-workspace-v2";
export function loadWorkspace(): Workspace {
  try {
    const data = JSON.parse(localStorage.getItem(storageKey) || "null");
    if (!data || !Array.isArray(data.chats) || !Array.isArray(data.files) || !Array.isArray(data.events)) return emptyWorkspace();
    return {
      chats: data.chats.filter((c: Chat) => typeof c.id === "string" && typeof c.title === "string" && Array.isArray(c.messages) && modes.some(m => m.id === c.mode)).slice(0, 40).map((c: Chat) => ({ ...c, messages: c.messages.filter(m => m && typeof m.content === "string" && ["user", "assistant"].includes(m.role)).slice(-80) })),
      files: data.files.filter((f: LibraryFile) => typeof f.id === "string" && typeof f.title === "string" && typeof f.content === "string" && ["student", "tutor"].includes(f.scope)).slice(0, 40),
      events: data.events.filter((e: StudyEvent) => typeof e.id === "string" && typeof e.title === "string" && Number.isFinite(Date.parse(e.date))).slice(0, 100),
      settings: { ...defaults, ...Object.fromEntries(Object.entries(data.settings || {}).filter(([k, v]) => k in defaults && typeof v === typeof defaults[k as keyof Settings])) },
      notebook: typeof data.notebook === "string" ? data.notebook.slice(0, 50000) : "",
      dismissed: Array.isArray(data.dismissed) ? data.dismissed.filter((v: unknown) => typeof v === "string").slice(-100) : [],
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
