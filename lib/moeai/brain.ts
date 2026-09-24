import "server-only";
import { parseContext, sessionBlock, type BrainContext } from "./context";
import { providerKeys } from "../keys";
import { streamGemini, ProvidersUnavailable, type GeminiContent, type GeminiPart } from "../ai/gemini";
import { conversationLanguage, detectLanguage, type LanguageDecision } from "../emy/language";
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
 * Gemini gets a generous budget, so nearly all of the specification goes in;
 * Groq, the fallback, runs on the bot's own 5,900-token budget because its
 * free tier counts tokens per minute.
 */
const GEMINI_BUDGET_TOKENS = 24_000;
const GROQ_BUDGET_TOKENS = 5_900;

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

function systemFor(turn: Turn, decision: LanguageDecision, budgetTokens: number) {
  const current = turn.messages[turn.messages.length - 1]?.content ?? "";
  const session = sessionBlock(turn.context ?? parseContext(null));
  return buildSystemPrompt(loadRegistry(), {
    decision,
    signals: detectSignals(current),
    budgetTokens,
    appContext: [...(turn.appContext ?? []), session].filter(Boolean),
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

async function* streamGroq(system: string, messages: ChatMessage[], images: AttachedImage[], signal: AbortSignal) {
  const last = messages[messages.length - 1];
  // Groq's models are text-only: name the images rather than fail the request.
  const note = images.length ? `\n\n[Attached image${images.length > 1 ? "s" : ""}: ${images.map((i) => i.name).join(", ")} — this model cannot view images]` : "";
  const body = [{ role: "system", content: system }, ...messages.slice(0, -1), { role: last.role, content: last.content + note }];
  const failures: string[] = [];
  for (const key of providerKeys("groq")) {
    let delivered = false;
    let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
    try {
      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model: process.env.GROQ_MODEL || "openai/gpt-oss-120b", messages: body, max_tokens: 4096, temperature: 0.65, stream: true }),
        signal: AbortSignal.any([signal, AbortSignal.timeout(30_000)]),
        cache: "no-store",
      });
      if (!res.ok || !res.body) { failures.push(`groq ${res.status}`); continue; }
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
          const delta = JSON.parse(value).choices?.[0]?.delta?.content;
          if (typeof delta === "string" && delta) { delivered = true; yield delta; }
        }
      }
      if (delivered) return;
    } catch {
      if (delivered || signal.aborted) throw new Error("STREAM_INTERRUPTED");
      failures.push("groq failed");
    } finally {
      await reader?.cancel().catch(() => {});
    }
  }
  throw new ProvidersUnavailable(failures);
}

/**
 * Streams one reply: Gemini (every ranked model, every key), then Groq.
 * Falls back only before the first word is delivered; two providers' answers
 * are never spliced together.
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
    console.warn("MoeAI: Gemini unavailable, trying Groq", error.detail.slice(0, 6).join("; "));
  }
  if (!providerKeys("groq").length) throw new Error("PROVIDERS_UNAVAILABLE");
  try {
    yield* streamGroq(systemFor(turn, decision, GROQ_BUDGET_TOKENS), turn.messages, images, turn.signal);
  } catch (error) {
    if (error instanceof ProvidersUnavailable) throw new Error("PROVIDERS_UNAVAILABLE");
    throw error;
  }
}

/** Whole reply at once, for callers that do not stream. */
export async function reply(messages: ChatMessage[], context: BrainContext = parseContext(null)) {
  let text = "";
  for await (const delta of streamReply({ messages, context, signal: AbortSignal.timeout(55_000) })) text += delta;
  return text.trim();
}
