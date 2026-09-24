/**
 * Where to send someone after they sign in: only a path on this site.
 * `next` arrives from a URL, so anything else ("//evil.com", "https://…",
 * "/\evil.com", control characters) falls back to the default.
 */
export function safeNext(value: unknown, fallback = "/moeai"): string {
  if (typeof value !== "string") return fallback;
  const v = value.trim();
  if (!v.startsWith("/") || v.startsWith("//") || v.startsWith("/\\") || /[\u0000-\u001f\\]/.test(v) || v.length > 512) return fallback;
  try {
    const url = new URL(v, "https://moeai.invalid");
    if (url.origin !== "https://moeai.invalid") return fallback;
    return url.pathname + url.search + url.hash;
  } catch {
    return fallback;
  }
}
