/**
 * Environment configuration, checked once and shared.
 *
 * A missing variable must never crash the build. If Supabase is not configured
 * yet, the site still renders and says so plainly — a deployment that fails to
 * build gives you no link at all, which is strictly worse than one that boots
 * and tells you what is missing.
 */
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

/** Is the app wired to a real Supabase project? */
export const isConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON);

/**
 * A syntactically valid placeholder, used only when configuration is missing so
 * that client construction does not throw during prerender. Every call made
 * with it fails, which is what we want: loud at runtime, quiet at build time.
 */
export const PLACEHOLDER_URL = "https://placeholder.supabase.co";
export const PLACEHOLDER_KEY = "placeholder-anon-key";
