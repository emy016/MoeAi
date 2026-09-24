import "server-only";
import { providerKeys } from "../keys";

/**
 * Text embeddings for course retrieval, from Gemini with the same keys as the
 * tutor. 768 dimensions (the course_chunks column), normalized, so cosine
 * distance in pgvector compares like with like.
 *
 * The model is found the way the chat model is: the keys' model list, the
 * newest "gemini-embedding" model that supports embedContent, falling back to
 * gemini-embedding-001. GEMINI_EMBED_MODEL overrides it.
 */
const BASE = "https://generativelanguage.googleapis.com/v1beta";
export const EMBED_DIMENSIONS = 768;
const BATCH = 100;

let chosen: string | null = null;

async function embedModel(): Promise<string> {
  if (process.env.GEMINI_EMBED_MODEL) return process.env.GEMINI_EMBED_MODEL;
  if (chosen) return chosen;
  for (const key of providerKeys("gemini").slice(0, 2)) {
    try {
      const res = await fetch(`${BASE}/models?pageSize=1000`, { headers: { "x-goog-api-key": key }, signal: AbortSignal.timeout(6000), cache: "no-store" });
      if (!res.ok) continue;
      const body = (await res.json()) as { models?: { name: string; supportedGenerationMethods?: string[] }[] };
      const names = (body.models ?? []).filter((m) => m.supportedGenerationMethods?.some((g) => /embed/i.test(g))).map((m) => m.name.replace(/^models\//, ""));
      const pick = names.find((n) => n === "gemini-embedding-001") ?? names.find((n) => /^gemini-embedding/.test(n) && !/exp|preview/.test(n)) ?? names.find((n) => /embedding/.test(n));
      if (pick) { chosen = pick; return pick; }
    } catch {
      // Try the next key.
    }
  }
  return "gemini-embedding-001";
}

function normalize(v: number[]): number[] {
  const n = Math.hypot(...v) || 1;
  return v.map((x) => x / n);
}

let cursor = 0;

/** One vector per text, in order. `task` tells the model whether it is embedding material or a question. */
export async function embed(texts: string[], task: "RETRIEVAL_DOCUMENT" | "RETRIEVAL_QUERY" = "RETRIEVAL_DOCUMENT"): Promise<number[][]> {
  const keys = providerKeys("gemini");
  if (!keys.length) throw new Error("No Gemini key is configured for embeddings.");
  const model = await embedModel();
  const out: number[][] = [];
  for (let i = 0; i < texts.length; i += BATCH) {
    const batch = texts.slice(i, i + BATCH).map((t) => t.slice(0, 8000));
    let done = false;
    let lastError = "";
    for (let attempt = 0; attempt < keys.length && !done; attempt++) {
      const key = keys[cursor++ % keys.length];
      const res = await fetch(`${BASE}/models/${model}:batchEmbedContents`, {
        method: "POST",
        headers: { "content-type": "application/json", "x-goog-api-key": key },
        body: JSON.stringify({
          requests: batch.map((text) => ({ model: `models/${model}`, content: { parts: [{ text }] }, taskType: task, outputDimensionality: EMBED_DIMENSIONS })),
        }),
        signal: AbortSignal.timeout(30000),
        cache: "no-store",
      });
      if (!res.ok) { lastError = `${model} ${res.status}`; continue; }
      const body = (await res.json()) as { embeddings?: { values: number[] }[] };
      if (!body.embeddings || body.embeddings.length !== batch.length) { lastError = "embedding count mismatch"; continue; }
      out.push(...body.embeddings.map((e) => normalize(e.values)));
      done = true;
    }
    if (!done) throw new Error(`Embedding failed: ${lastError}`);
  }
  return out;
}

/** pgvector's text form. */
export const toVector = (v: number[]) => `[${v.map((x) => x.toFixed(6)).join(",")}]`;
