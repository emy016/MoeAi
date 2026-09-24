import "server-only";
import { providerKeys } from "../keys";
import { rankModels } from "./rank-models.ts";

/**
 * Gemini, called the way the Telegram bot calls it: the native
 * generateContent API with a real system instruction, temperature 0.65.
 *
 * Nobody picks a model by hand. The first request asks Google which models
 * these keys can use, keeps the chat-capable ones, and ranks them newest
 * first; the list is cached per server instance for six hours. When a model
 * is overloaded (503) the next one answers; when a key hits its quota (429)
 * the next key does. GEMINI_MODELS, comma-separated, overrides the ranking.
 */

const BASE = "https://generativelanguage.googleapis.com/v1beta";
const MODEL_CACHE_MS = 6 * 60 * 60 * 1000;
const KEY_COOLDOWN_MS = 60_000;
const BAD_KEY_COOLDOWN_MS = 10 * 60_000;
const MODEL_COOLDOWN_MS = 30_000;
const FIRST_BYTE_TIMEOUT_MS = 25_000;

/** Used when the model list cannot be fetched at all. Aliases Google keeps pointing at current models. */
export const FALLBACK_MODELS = ["gemini-flash-latest", "gemini-2.5-flash", "gemini-flash-lite-latest"];

export type GeminiPart = { text: string } | { inlineData: { mimeType: string; data: string } };
export type GeminiContent = { role: "user" | "model"; parts: GeminiPart[] };

let modelCache: { models: string[]; at: number } | null = null;

export async function geminiModels(): Promise<string[]> {
  const configured = (process.env.GEMINI_MODELS ?? process.env.GEMINI_MODEL ?? "")
    .split(",").map((m) => m.trim()).filter(Boolean);
  if (configured.length) return configured;
  if (modelCache && Date.now() - modelCache.at < MODEL_CACHE_MS) return modelCache.models;

  for (const key of providerKeys("gemini").slice(0, 3)) {
    try {
      const res = await fetch(`${BASE}/models?pageSize=1000`, {
        headers: { "x-goog-api-key": key },
        signal: AbortSignal.timeout(6000),
        cache: "no-store",
      });
      if (!res.ok) continue;
      const body = (await res.json()) as { models?: { name: string; supportedGenerationMethods?: string[] }[] };
      const usable = (body.models ?? [])
        .filter((m) => m.supportedGenerationMethods?.includes("generateContent"))
        .map((m) => m.name);
      const ranked = rankModels(usable);
      if (ranked.length) {
        modelCache = { models: ranked, at: Date.now() };
        return ranked;
      }
    } catch {
      // Try the next key; a list failure must never block an answer.
    }
  }
  return FALLBACK_MODELS;
}

const cooldown = new Map<string, number>();
const cold = (id: string) => (cooldown.get(id) ?? 0) > Date.now();
const chill = (id: string, ms: number) => cooldown.set(id, Date.now() + ms);

let cursor = 0;
/** Keys in rotation order, warm ones first, so load spreads across free quotas. */
function rotatedKeys(): string[] {
  const keys = providerKeys("gemini");
  if (!keys.length) return [];
  const start = cursor++ % keys.length;
  const ordered = [...keys.slice(start), ...keys.slice(0, start)];
  return [...ordered.filter((k) => !cold(`key:${k}`)), ...ordered.filter((k) => cold(`key:${k}`))];
}

export type GeminiRequest = {
  system: string;
  contents: GeminiContent[];
  temperature?: number;
  maxOutputTokens?: number;
  signal?: AbortSignal;
};

export class ProvidersUnavailable extends Error {
  constructor(public readonly detail: string[]) {
    super("PROVIDERS_UNAVAILABLE");
  }
}

/**
 * Streams text deltas. Falls back across models and keys only before the
 * first delta: once a student is reading an answer it is never spliced with
 * another model's.
 */
export async function* streamGemini(req: GeminiRequest): AsyncGenerator<string, { model: string }> {
  const keys = rotatedKeys();
  if (!keys.length) throw new ProvidersUnavailable(["no gemini key configured"]);
  const models = await geminiModels();
  const failures: string[] = [];

  for (const model of models) {
    if (cold(`model:${model}`)) { failures.push(`${model}: cooling down`); continue; }
    for (const key of keys) {
      if (req.signal?.aborted) throw new Error("ABORTED");
      if (cold(`key:${key}:${model}`)) continue;
      let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
      let delivered = false;
      // Waiting for the first byte is bounded; a long answer that is already
      // streaming is not, apart from the route's own time limit.
      const firstByte = new AbortController();
      const firstByteTimer = setTimeout(() => firstByte.abort(), FIRST_BYTE_TIMEOUT_MS);
      try {
        const res = await fetch(`${BASE}/models/${encodeURIComponent(model)}:streamGenerateContent?alt=sse`, {
          method: "POST",
          headers: { "content-type": "application/json", "x-goog-api-key": key },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: req.system }] },
            contents: req.contents,
            generationConfig: { temperature: req.temperature ?? 0.65, maxOutputTokens: req.maxOutputTokens ?? 8192 },
          }),
          signal: req.signal ? AbortSignal.any([req.signal, firstByte.signal]) : firstByte.signal,
          cache: "no-store",
        });
        if (!res.ok || !res.body) {
          const status = res.status;
          const detail = await res.text().catch(() => "");
          failures.push(`${model}: ${status}`);
          const badKey = status === 401 || status === 403 || (status === 400 && /API_KEY|api key/i.test(detail));
          if (badKey) { chill(`key:${key}`, BAD_KEY_COOLDOWN_MS); continue; }
          // Overloaded or gone: this model will not answer with any key right now.
          if (status >= 500) { chill(`model:${model}`, MODEL_COOLDOWN_MS); break; }
          if (status === 404 || status === 400) break;
          // Quota: this key is spent on this model; the next key may not be.
          if (status === 429) chill(`key:${key}:${model}`, KEY_COOLDOWN_MS);
          continue;
        }
        clearTimeout(firstByteTimer);
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
            const payload = line.slice(5).trim();
            if (!payload) continue;
            const data = JSON.parse(payload);
            if (data.error) throw new Error(`stream error ${data.error.code ?? ""}`);
            const parts = data.candidates?.[0]?.content?.parts ?? [];
            // Thought summaries, when a model sends them, are not the answer.
            const text = parts.filter((p: { thought?: boolean }) => !p.thought).map((p: { text?: string }) => p.text ?? "").join("");
            if (text) { delivered = true; yield text; }
          }
        }
        if (delivered) return { model };
        failures.push(`${model}: empty reply`);
        break;
      } catch (error) {
        if (delivered || req.signal?.aborted) throw new Error("STREAM_INTERRUPTED");
        failures.push(`${model}: ${error instanceof Error ? error.message : "failed"}`);
      } finally {
        clearTimeout(firstByteTimer);
        await reader?.cancel().catch(() => {});
      }
    }
  }
  throw new ProvidersUnavailable(failures);
}
