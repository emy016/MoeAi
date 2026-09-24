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
  /** Gemini tools, e.g. [{ google_search: {} }] to let the model research on the web. */
  tools?: unknown[];
  /** Ask for a JSON body (not combinable with tools). */
  json?: boolean;
  /** Sees each raw stream event, for metadata such as search grounding sources. */
  onEvent?: (event: Record<string, unknown>) => void;
};

export class ProvidersUnavailable extends Error {
  constructor(public readonly detail: string[]) {
    super("PROVIDERS_UNAVAILABLE");
  }
}

/**
 * Streams text deltas, racing models so an overloaded Google still answers
 * inside the function's time limit.
 *
 * When Gemini is under heavy demand, some models refuse at once (503) and the
 * ones that accept can take 20-30 s before their first byte. Trying them one
 * at a time, each with every key, can take minutes, and Vercel ends the
 * function at 60 s, so the student saw nothing at all. Instead: start the
 * best model; every HEDGE_MS without an answer, start the next one as well
 * (up to MAX_PARALLEL); whichever starts answering first wins and the rest
 * are cancelled. A refusal or a timeout is the model's state, not the key's,
 * so that model is skipped rather than retried with the next key; a quota or
 * bad key moves on to the next key for the same model. Past FIRST_BYTE_DEADLINE_MS
 * with nothing, it gives up so the route can say so while it still can.
 *
 * Models are only raced before the first delta: once a student is reading an
 * answer it is never spliced with another model's.
 */
const HEDGE_MS = 4000;
const MAX_PARALLEL = 3;
const FIRST_BYTE_DEADLINE_MS = 40_000;

class AttemptError extends Error {
  constructor(public readonly status: number, public readonly detail: string) {
    super(`${status}`);
  }
}

type Opened = { model: string; first: string; rest: AsyncGenerator<string>; cancel: () => void };

async function openStream(model: string, key: string, req: GeminiRequest, signal: AbortSignal): Promise<Opened> {
  const res = await fetch(`${BASE}/models/${encodeURIComponent(model)}:streamGenerateContent?alt=sse`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-goog-api-key": key },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: req.system }] },
      contents: req.contents,
      generationConfig: {
        temperature: req.temperature ?? 0.65,
        maxOutputTokens: req.maxOutputTokens ?? 8192,
        ...(req.json ? { responseMimeType: "application/json" } : {}),
      },
      ...(req.tools ? { tools: req.tools } : {}),
    }),
    signal,
    cache: "no-store",
  });
  if (!res.ok || !res.body) throw new AttemptError(res.status, await res.text().catch(() => ""));
  const reader = res.body.getReader();
  const texts = (async function* () {
    const decoder = new TextDecoder();
    let buffer = "";
    try {
      for (;;) {
        const chunk = await reader.read();
        if (chunk.done) return;
        buffer += decoder.decode(chunk.value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.startsWith("data:")) continue;
          const payload = line.slice(5).trim();
          if (!payload) continue;
          const data = JSON.parse(payload);
          if (data.error) throw new AttemptError(Number(data.error.code) || 500, "stream error");
          req.onEvent?.(data);
          const parts = data.candidates?.[0]?.content?.parts ?? [];
          // Thought summaries, when a model sends them, are not the answer.
          const text = parts.filter((p: { thought?: boolean }) => !p.thought).map((p: { text?: string }) => p.text ?? "").join("");
          if (text) yield text;
        }
      }
    } finally {
      await reader.cancel().catch(() => {});
    }
  })();
  const first = await texts.next();
  if (first.done) throw new AttemptError(0, "empty reply");
  return { model, first: first.value, rest: texts, cancel: () => { void texts.return(undefined); } };
}

export async function* streamGemini(req: GeminiRequest): AsyncGenerator<string, { model: string }> {
  const keys = rotatedKeys();
  if (!keys.length) throw new ProvidersUnavailable(["no gemini key configured"]);
  const all = await geminiModels();
  const warm = all.filter((m) => !cold(`model:${m}`));
  const models = warm.length ? warm : all;
  const failures: string[] = [];
  const deadline = Date.now() + FIRST_BYTE_DEADLINE_MS;
  const exhausted = new Set<string>();
  const tried = new Set<string>();
  const running = new Map<number, { model: string; ctrl: AbortController }>();
  let winner: Opened | null = null;
  let seq = 0;
  let lastLaunch = 0;
  let wake: () => void = () => {};

  const pick = () => {
    for (const model of models) {
      if (exhausted.has(model) || [...running.values()].some((r) => r.model === model)) continue;
      const untried = keys.filter((k) => !tried.has(`${model}|${k}`));
      const key = untried.find((k) => !cold(`key:${k}`) && !cold(`key:${k}:${model}`)) ?? untried.find((k) => !cold(`key:${k}`));
      if (!key) { exhausted.add(model); continue; }
      return { model, key };
    }
    return null;
  };

  const launch = () => {
    const next = pick();
    if (!next) return false;
    const { model, key } = next;
    const id = ++seq;
    const ctrl = new AbortController();
    tried.add(`${model}|${key}`);
    running.set(id, { model, ctrl });
    lastLaunch = Date.now();
    const timer = setTimeout(() => ctrl.abort(), Math.max(1000, deadline - Date.now()));
    const signal = req.signal ? AbortSignal.any([req.signal, ctrl.signal]) : ctrl.signal;
    openStream(model, key, req, signal).then(
      (opened) => {
        clearTimeout(timer);
        running.delete(id);
        if (winner || req.signal?.aborted) { opened.cancel(); return; }
        winner = opened;
        wake();
      },
      (error) => {
        clearTimeout(timer);
        running.delete(id);
        if (winner || req.signal?.aborted) return;
        const status = error instanceof AttemptError ? error.status : 0;
        const detail = error instanceof AttemptError ? error.detail : "";
        failures.push(`${model}: ${status || (error instanceof Error ? error.name : "failed")}`);
        const badKey = status === 401 || status === 403 || (status === 400 && /API_KEY|api key/i.test(detail));
        if (badKey) chill(`key:${key}`, BAD_KEY_COOLDOWN_MS);
        else if (status === 429) chill(`key:${key}:${model}`, KEY_COOLDOWN_MS);
        else {
          // Overloaded, gone, empty or too slow: this model, not this key.
          if (status >= 500 || status === 0) chill(`model:${model}`, MODEL_COOLDOWN_MS);
          exhausted.add(model);
        }
        lastLaunch = 0; // replace it straight away
        wake();
      },
    );
    return true;
  };

  const stopAll = () => { for (const r of running.values()) r.ctrl.abort(); running.clear(); };

  launch();
  while (!winner) {
    if (req.signal?.aborted) { stopAll(); throw new Error("ABORTED"); }
    if (Date.now() >= deadline) { stopAll(); throw new ProvidersUnavailable([...failures, "no first byte before the deadline"]); }
    if (!running.size && !launch()) throw new ProvidersUnavailable(failures);
    if (running.size < MAX_PARALLEL && Date.now() - lastLaunch >= HEDGE_MS) launch();
    await new Promise<void>((resolve) => { wake = resolve; setTimeout(resolve, 250); });
  }
  stopAll();
  const won: Opened = winner;
  yield won.first;
  try {
    for await (const text of won.rest) yield text;
  } catch {
    throw new Error("STREAM_INTERRUPTED");
  }
  return { model: won.model };
}
