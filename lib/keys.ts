/**
 * One place that decides what an API key is called.
 *
 * There were two answers to that, which is one too many: the tutor's brain read
 * GEMINI_API_KEY, while quizzes and memory extraction read GEMINI_API_KEYS.
 * Whichever name you set, half the product worked and the other half failed
 * silently — the quiz just never generated, the memory never updated, and
 * nothing said why.
 *
 * So: both names work everywhere, plural first, and either may hold several
 * comma-separated keys. That is what makes free-tier rotation possible — when
 * one key is exhausted the next is tried, rather than the answer failing.
 */

/** The canonical name, the legacy name, and any extras that belong to it. */
const NAMES: Record<string, string[]> = {
  gemini: ["GEMINI_API_KEYS", "GEMINI_API_KEY", "GEMINI_BACKUP_API_KEY"],
  groq: ["GROQ_API_KEYS", "GROQ_API_KEY"],
  openrouter: ["OPENROUTER_API_KEYS", "OPENROUTER_API_KEY"],
};

export type Provider = keyof typeof NAMES;
export const PROVIDER_NAMES = Object.keys(NAMES) as Provider[];

/**
 * Every key configured for a provider, in the order they should be tried,
 * with duplicates removed — a key set in both the singular and the plural
 * variable is one key, not two chances.
 */
export function providerKeys(provider: Provider, env: Record<string, string | undefined> = process.env): string[] {
  const seen = new Set<string>();
  for (const name of NAMES[provider] ?? []) {
    for (const key of (env[name] ?? "").split(",")) {
      const clean = key.trim();
      if (clean) seen.add(clean);
    }
  }
  return [...seen];
}

/** For the health check: how many keys each provider has, never what they are. */
export function keyCounts(env: Record<string, string | undefined> = process.env): Record<Provider, number> {
  return Object.fromEntries(
    PROVIDER_NAMES.map(provider => [provider, providerKeys(provider, env).length]),
  ) as Record<Provider, number>;
}

/** Which env names a provider will accept, for documentation and diagnostics. */
export function acceptedNames(provider: Provider): string[] {
  return NAMES[provider] ?? [];
}
