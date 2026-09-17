// Reads provider API keys / the service-role key. The "server-only" import
// makes importing this from a client component a BUILD error rather than a
// silent leak of those keys into the browser bundle.
import "server-only";
/**
 * AI provider chain with multi-key rotation and streaming.
 *
 * Free tiers rate-limit aggressively, so each provider takes a comma-separated
 * list of keys. A key that returns 429 is put on a short cooldown and skipped.
 * When every key of a provider is cold or failing, we fall through to the next
 * provider. The student never sees which one served them.
 *
 * Deliberately no SDK. Three fetch() calls, two of which share a shape.
 */

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface StreamResult {
  stream: ReadableStream<Uint8Array>;
  provider: string;
  model: string;
}

const TIMEOUT_MS = 30_000;
const COOLDOWN_MS = 60_000;

/** key -> timestamp until which it is considered rate-limited. */
const cooldown = new Map<string, number>();

function keysFor(env: string): string[] {
  return (process.env[env] ?? "")
    .split(",")
    .map((k) => k.trim())
    .filter(Boolean);
}

function usableKeys(env: string): string[] {
  const now = Date.now();
  const all = keysFor(env);
  const warm = all.filter((k) => (cooldown.get(k) ?? 0) < now);
  // If every key is cooling down, try them anyway rather than failing outright.
  return warm.length ? warm : all;
}

function markCold(key: string) {
  cooldown.set(key, Date.now() + COOLDOWN_MS);
}

/** Turn an SSE byte stream into a plain text stream of content deltas. */
function sseToText(
  upstream: ReadableStream<Uint8Array>,
  extract: (json: any) => string | undefined,
  onDone?: (full: string) => void,
): ReadableStream<Uint8Array> {
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  let buffer = "";
  let full = "";

  return new ReadableStream({
    async start(controller) {
      const reader = upstream.getReader();
      try {
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";
          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed.startsWith("data:")) continue;
            const payload = trimmed.slice(5).trim();
            if (!payload || payload === "[DONE]") continue;
            try {
              const delta = extract(JSON.parse(payload));
              if (delta) {
                full += delta;
                controller.enqueue(encoder.encode(delta));
              }
            } catch {
              // Partial JSON across chunk boundaries; the buffer picks it up.
            }
          }
        }
      } finally {
        reader.releaseLock();
        onDone?.(full);
        controller.close();
      }
    },
  });
}

async function withTimeout(url: string, init: RequestInit): Promise<Response> {
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: ac.signal });
  } finally {
    clearTimeout(timer);
  }
}

// ── Gemini ──────────────────────────────────────────────────────────────────

async function callGemini(
  messages: ChatMessage[],
  maxTokens: number,
  onDone?: (full: string) => void,
): Promise<StreamResult> {
  const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";
  const system = messages.filter((m) => m.role === "system").map((m) => m.content).join("\n\n");
  const contents = messages
    .filter((m) => m.role !== "system")
    .map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));

  let lastError = "no gemini key";
  for (const key of usableKeys("GEMINI_API_KEYS")) {
    const url =
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent` +
      `?alt=sse&key=${encodeURIComponent(key)}`;
    const res = await withTimeout(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        contents,
        systemInstruction: system ? { parts: [{ text: system }] } : undefined,
        generationConfig: { maxOutputTokens: maxTokens, temperature: 0.7 },
      }),
    });

    if (res.status === 429) { markCold(key); lastError = "gemini 429"; continue; }
    if (!res.ok || !res.body) { lastError = `gemini ${res.status}`; continue; }

    return {
      provider: "gemini",
      model,
      stream: sseToText(res.body, (j) => j?.candidates?.[0]?.content?.parts?.[0]?.text, onDone),
    };
  }
  throw new Error(lastError);
}

// ── OpenAI-compatible (Groq, OpenRouter, and anything else that speaks it) ──

async function callOpenAICompatible(
  name: string,
  endpoint: string,
  keyEnv: string,
  model: string,
  messages: ChatMessage[],
  maxTokens: number,
  extraHeaders: Record<string, string>,
  onDone?: (full: string) => void,
): Promise<StreamResult> {
  let lastError = `no ${name} key`;
  for (const key of usableKeys(keyEnv)) {
    const res = await withTimeout(endpoint, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${key}`,
        ...extraHeaders,
      },
      body: JSON.stringify({
        model,
        messages,
        stream: true,
        max_tokens: maxTokens,
        temperature: 0.7,
      }),
    });

    if (res.status === 429) { markCold(key); lastError = `${name} 429`; continue; }
    if (!res.ok || !res.body) { lastError = `${name} ${res.status}`; continue; }

    return {
      provider: name,
      model,
      stream: sseToText(res.body, (j) => j?.choices?.[0]?.delta?.content, onDone),
    };
  }
  throw new Error(lastError);
}

// ── The chain ───────────────────────────────────────────────────────────────

type Provider = (
  m: ChatMessage[],
  t: number,
  d?: (full: string) => void,
) => Promise<StreamResult>;

const PROVIDERS: Record<string, Provider> = {
  gemini: callGemini,

  groq: (m, t, d) =>
    callOpenAICompatible(
      "groq",
      "https://api.groq.com/openai/v1/chat/completions",
      "GROQ_API_KEYS",
      process.env.GROQ_MODEL || "llama-3.3-70b-versatile",
      m, t, {}, d,
    ),

  openrouter: (m, t, d) =>
    callOpenAICompatible(
      "openrouter",
      "https://openrouter.ai/api/v1/chat/completions",
      "OPENROUTER_API_KEYS",
      process.env.OPENROUTER_MODEL || "meta-llama/llama-3.3-70b-instruct:free",
      m, t,
      {
        "http-referer": process.env.NEXT_PUBLIC_SITE_URL || "https://moe-ai.vercel.app",
        "x-title": "MoeAI",
      },
      d,
    ),
};

/**
 * Try each configured provider in order. Returns the first that starts
 * streaming. Throws only when every provider has failed.
 *
 * `onDone` receives the full text once the stream closes, so the caller can
 * persist the assistant message and run the language check without buffering
 * the response itself.
 */
export async function streamChat(
  messages: ChatMessage[],
  opts: { maxTokens?: number; onDone?: (full: string) => void } = {},
): Promise<StreamResult> {
  const maxTokens = opts.maxTokens ?? Number(process.env.MOEAI_MAX_OUTPUT_TOKENS ?? 1200);
  const order = (process.env.AI_PROVIDER_ORDER || "gemini,groq,openrouter")
    .split(",")
    .map((p) => p.trim())
    .filter((p) => p in PROVIDERS);

  const errors: string[] = [];
  for (const name of order) {
    try {
      return await PROVIDERS[name](messages, maxTokens, opts.onDone);
    } catch (err) {
      errors.push(`${name}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
  throw new Error(`all providers failed — ${errors.join("; ")}`);
}

/**
 * Non-streaming variant, for short internal calls where nobody is watching the
 * tokens arrive — memory extraction, quiz generation. Drains the stream and
 * returns the whole string.
 */
export async function completeChat(
  messages: ChatMessage[],
  opts: { maxTokens?: number } = {},
): Promise<{ text: string; provider: string; model: string }> {
  const result = await streamChat(messages, { maxTokens: opts.maxTokens ?? 800 });
  const reader = result.stream.getReader();
  const decoder = new TextDecoder();
  let text = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    text += decoder.decode(value, { stream: true });
  }
  return { text, provider: result.provider, model: result.model };
}

/** Pull the first JSON object or array out of a model response. */
export function parseJsonBlock<T>(raw: string): T | null {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  const body = (fenced ? fenced[1] : raw).trim();
  const start = body.search(/[[{]/);
  if (start === -1) return null;
  const open = body[start];
  const close = open === "[" ? "]" : "}";
  const end = body.lastIndexOf(close);
  if (end <= start) return null;
  try {
    return JSON.parse(body.slice(start, end + 1)) as T;
  } catch {
    return null;
  }
}
