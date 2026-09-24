/** Which Gemini models to try, and in what order. Pure, so the offline checks can run it. */

const version = (name: string) => {
  const match = /^gemini-(\d+(?:\.\d+)?)-/.exec(name);
  return match ? Number(match[1]) : 0;
};

/**
 * Chat models worth trying, best first: every stable Flash by version (newest
 * three), the moving "flash-latest" alias, the newest Flash-Lite as a fast
 * fallback, then Gemma. Previews, TTS, image, audio, live, robotics and agent
 * models are never chosen — they either answer differently or not in text.
 */
export function rankModels(names: string[]): string[] {
  const clean = names.map((n) => n.replace(/^models\//, ""));
  const flash = clean.filter((n) => /^gemini-\d+(?:\.\d+)?-flash$/.test(n)).sort((a, b) => version(b) - version(a));
  const lite = clean.filter((n) => /^gemini-\d+(?:\.\d+)?-flash-lite$/.test(n)).sort((a, b) => version(b) - version(a));
  const ranked = [
    ...flash.slice(0, 3),
    ...clean.filter((n) => n === "gemini-flash-latest"),
    ...lite.slice(0, 1),
    ...clean.filter((n) => n === "gemini-flash-lite-latest"),
    ...clean.filter((n) => /^gemma-4-31b-it$/.test(n)),
  ];
  return [...new Set(ranked)];
}
