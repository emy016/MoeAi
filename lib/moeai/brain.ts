import "server-only";
import { parseContext, sessionBlock, type BrainContext } from "./context";
import { providerKeys } from "../keys";
import { streamGemini, ProvidersUnavailable, type GeminiContent, type GeminiPart } from "../ai/gemini";
import { conversationLanguage, detectLanguage, gatherEvidence, FRANCO_TARGETS, MIXED_TARGETS, TARGETS, type LanguageDecision, type Target } from "../emy/language";
import { detectSignals } from "../emy/signals";
import { loadRegistry, validateRegistry, MODULE_ORDER } from "../emy/specs";
import { buildSystemPrompt } from "../emy/prompt";

export type ChatMessage = { role: "user" | "assistant"; content: string };
export type AttachedImage = { name: string; dataUrl: string };

/**
 * MoeAI's voice is Eslam's six Markdown files in prompts/, assembled exactly
 * the way the Emy Telegram bot assembles them (lib/emy is a port of it, and
 * builds byte-identical prompts). The website used to send a different
 * personality file wrapped in generic "AI study companion" rules, which is
 * why the tutor sounded Egyptian on Telegram and like a generic assistant
 * here.
 *
 * Both providers get the bot's own 5,900-token selection of the
 * specification. The app's per-turn data (course passages, session, what the
 * chat can render) goes before the personality as reference material, so the
 * personality and the language directive are the last things the model reads,
 * exactly as in the bot.
 */
// The bot's own budget. Sending more of the specification (security, tools,
// memory policy in full) buried the personality: with 24,000 tokens the same
// model answered like a generic assistant; with the bot's selection it sounds
// like Emy. Tested side by side on the same messages.
// Eslam's PERSONALITY and TUTORING files always go in whole on providers with
// room for them (about 5,700 tokens together); the budget then covers the
// selected policy, security, memory and tool sections around them.
const GEMINI_BUDGET_TOKENS = 6_500; // + the voice calibration examples
const GROQ_BUDGET_TOKENS = 5_900;
const FULL_MODULES = ["PERSONALITY", "TUTORING"] as const;

/** For the health check: are Eslam's files loaded and mapped? */
export function personalityStatus() {
  try {
    const registry = loadRegistry();
    const problems = validateRegistry(registry);
    return {
      source: "prompts/ (Eslam's specification, Emy runtime)",
      files: Object.fromEntries(MODULE_ORDER.map((m) => [m, registry[m].raw.length])),
      ok: problems.length === 0,
      error: problems.length ? problems.join("; ") : null,
    };
  } catch (error) {
    return { source: "prompts/", files: {}, ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}

export type Turn = {
  messages: ChatMessage[];
  context?: BrainContext;
  /** Blocks the request layer worked out: course material, memory, attachments, the chat surface guide. */
  appContext?: string[];
  images?: AttachedImage[];
  signal: AbortSignal;
};

/** The reply language for this turn, with the conversation's language as continuity, as the bot tracks it. */
export function resolveLanguage(messages: ChatMessage[], hint?: string): LanguageDecision {
  const users = messages.filter((m) => m.role === "user").map((m) => m.content);
  const current = users[users.length - 1] ?? "";
  const previous = conversationLanguage(users.slice(0, -1)) ?? (hint?.toLowerCase().includes("arabic") ? "ar" : null);
  return detectLanguage(current, previous);
}

/**
 * A reply language the app sets outright (e.g. the app's own language).
 * Only single, spoken languages: never Franco and never a mixture.
 */
export function voiceLanguage(requested: unknown, messages: ChatMessage[]): LanguageDecision | null {
  const target = String(requested ?? "").toLowerCase() as Target;
  if (!TARGETS.includes(target) || FRANCO_TARGETS.has(target) || MIXED_TARGETS.has(target)) return null;
  const current = [...messages].reverse().find((m) => m.role === "user")?.content ?? "";
  return { target, source: "explicit", decisive: true, evidence: gatherEvidence(current), note: "the app asked for its own language (voice)" };
}

function systemFor(turn: Turn, decision: LanguageDecision, budgetTokens: number, referenceCounts = false, whole = true) {
  const current = turn.messages[turn.messages.length - 1]?.content ?? "";
  const session = sessionBlock(turn.context ?? parseContext(null));
  const reference = [...(turn.appContext ?? []), session].filter(Boolean);
  // Groq's free tier counts tokens per minute, so there the reference data
  // comes out of the same budget instead of on top of it.
  const referenceTokens = referenceCounts ? Math.ceil(reference.join("\n").length / 4) : 0;
  return buildSystemPrompt(loadRegistry(), {
    decision,
    signals: detectSignals(current),
    budgetTokens: Math.max(2_500, budgetTokens - referenceTokens),
    referenceContext: reference,
    fullModules: whole ? [...FULL_MODULES] : [],
  }).system;
}

const dataUrlPart = (dataUrl: string): GeminiPart | null => {
  const match = /^data:([^;]+);base64,(.+)$/s.exec(dataUrl);
  return match ? { inlineData: { mimeType: match[1], data: match[2] } } : null;
};

function geminiContents(messages: ChatMessage[], images: AttachedImage[]): GeminiContent[] {
  return messages.map((m, i) => {
    const parts: GeminiPart[] = [{ text: m.content }];
    if (i === messages.length - 1) for (const image of images) { const p = dataUrlPart(image.dataUrl); if (p) parts.push(p); }
    return { role: m.role === "assistant" ? "model" : "user", parts };
  });
}

/** OpenAI-compatible chat providers tried after Gemini, in CHAT_FALLBACK_ORDER. */
type Compatible = { name: "groq" | "nvidia" | "openrouter"; url: string; model: () => string; headers?: () => Record<string, string>; budget: number; whole: boolean };
const COMPATIBLE: Record<Compatible["name"], Compatible> = {
  // Groq's free tier counts ~8,000 tokens a minute: the bot's own trimmed prompt.
  groq: { name: "groq", url: "https://api.groq.com/openai/v1/chat/completions", model: () => process.env.GROQ_MODEL || "openai/gpt-oss-120b", budget: GROQ_BUDGET_TOKENS, whole: false },
  nvidia: { name: "nvidia", url: "https://integrate.api.nvidia.com/v1/chat/completions", model: () => process.env.NVIDIA_MODEL || "meta/llama-3.3-70b-instruct", budget: GEMINI_BUDGET_TOKENS, whole: true },
  openrouter: {
    name: "openrouter", url: "https://openrouter.ai/api/v1/chat/completions",
    model: () => process.env.OPENROUTER_MODEL || "meta-llama/llama-3.3-70b-instruct:free",
    headers: () => ({ "HTTP-Referer": process.env.NEXT_PUBLIC_SITE_URL || "https://moe-ai-sable.vercel.app", "X-Title": "MoeAI" }),
    budget: GEMINI_BUDGET_TOKENS, whole: true,
  },
};
function fallbackOrder(): Compatible[] {
  return (process.env.CHAT_FALLBACK_ORDER || "groq,nvidia,openrouter").split(",")
    .map((n) => COMPATIBLE[n.trim() as Compatible["name"]]).filter((c) => c && providerKeys(c.name).length);
}

async function* streamCompatible(cfg: Compatible, system: string, messages: ChatMessage[], images: AttachedImage[], signal: AbortSignal) {
  const last = messages[messages.length - 1];
  // These models are text-only here: name the images rather than fail the request.
  const note = images.length ? `\n\n[Attached image${images.length > 1 ? "s" : ""}: ${images.map((i) => i.name).join(", ")} — this model cannot view images]` : "";
  const body = [{ role: "system", content: system }, ...messages.slice(0, -1), { role: last.role, content: last.content + note }];
  const failures: string[] = [];
  for (const key of providerKeys(cfg.name)) {
    let delivered = false;
    let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
    try {
      const res = await fetch(cfg.url, {
        method: "POST",
        headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json", ...(cfg.headers?.() ?? {}) },
        body: JSON.stringify({ model: cfg.model(), messages: body, max_tokens: 4096, temperature: 0.65, stream: true }),
        signal: AbortSignal.any([signal, AbortSignal.timeout(30_000)]),
        cache: "no-store",
      });
      if (!res.ok || !res.body) { failures.push(`${cfg.name} ${res.status}`); continue; }
      reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      for (;;) {
        const chunk = await reader.read();
        if (chunk.done) break;
        buffer += decoder.decode(chunk.value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.startsWith("data:")) continue;
          const value = line.slice(5).trim();
          if (!value || value === "[DONE]") continue;
          let delta: unknown;
          try { delta = JSON.parse(value).choices?.[0]?.delta?.content; } catch { continue; }
          if (typeof delta === "string" && delta) { delivered = true; yield delta; }
        }
      }
      if (delivered) return;
    } catch {
      if (delivered || signal.aborted) throw new Error("STREAM_INTERRUPTED");
      failures.push(`${cfg.name} failed`);
    } finally {
      await reader?.cancel().catch(() => {});
    }
  }
  throw new ProvidersUnavailable(failures);
}

/**
 * Streams one reply: Gemini (every ranked model, every key), then Groq,
 * NVIDIA and OpenRouter in turn. Falls back only before the first word is
 * delivered; two providers' answers are never spliced together.
 */
export async function* streamReply(turn: Turn, decision = resolveLanguage(turn.messages, turn.context?.profile.language)): AsyncGenerator<string> {
  const images = turn.images ?? [];
  let delivered = false;
  try {
    for await (const delta of streamGemini({
      system: systemFor(turn, decision, GEMINI_BUDGET_TOKENS),
      contents: geminiContents(turn.messages, images),
      signal: turn.signal,
    })) { delivered = true; yield delta; }
    return;
  } catch (error) {
    if (delivered || turn.signal.aborted || !(error instanceof ProvidersUnavailable)) throw error;
    console.warn("MoeAI: Gemini unavailable, trying the other providers", error.detail.slice(0, 6).join("; "));
  }
  for (const cfg of fallbackOrder()) {
    try {
      yield* streamCompatible(cfg, systemFor(turn, decision, cfg.budget, !cfg.whole, cfg.whole), turn.messages, images, turn.signal);
      return;
    } catch (error) {
      if (!(error instanceof ProvidersUnavailable)) throw error;
      console.warn(`MoeAI: ${cfg.name} unavailable`, error.detail.slice(0, 4).join("; "));
    }
  }
  throw new Error("PROVIDERS_UNAVAILABLE");
}

/** Whole reply at once, for callers that do not stream. */
export async function reply(messages: ChatMessage[], context: BrainContext = parseContext(null)) {
  let text = "";
  for await (const delta of streamReply({ messages, context, signal: AbortSignal.timeout(55_000) })) text += delta;
  return text.trim();
}
