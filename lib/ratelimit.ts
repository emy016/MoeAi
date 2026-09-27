/**
 * Per-user hourly cap on model calls.
 *
 * This is the spending cap. Free provider tiers plus a cohort of students is
 * exactly how a project wakes up to a suspended API key. The counter lives in
 * Postgres (not memory) because serverless instances do not share state.
 *
 * It runs as the signed-in student (hit_rate_limit, SECURITY DEFINER, keyed on
 * auth.uid()), so it needs no service-role key and a student can only ever
 * move their own counter. The increment and the check are one atomic upsert,
 * so two tabs racing cannot both slip under the cap.
 */
import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

export interface RateResult {
  allowed: boolean;
  remaining: number;
  limit: number;
  resetAt: Date;
}

export async function checkRateLimit(sb: SupabaseClient, limit = Number(process.env.MOEAI_MAX_MESSAGES_PER_HOUR ?? 40)): Promise<RateResult> {
  const fallbackReset = new Date(Math.ceil(Date.now() / 3_600_000) * 3_600_000);
  const { data, error } = await sb.rpc("hit_rate_limit", { p_limit: limit });
  const row = Array.isArray(data) ? data[0] : data;
  // If the counter itself is unreachable, fail open: a database blip should
  // not silence the tutor, and the per-model quotas still bound spend.
  if (error || !row) return { allowed: true, remaining: limit, limit, resetAt: fallbackReset };
  return { allowed: Boolean(row.allowed), remaining: Number(row.remaining ?? 0), limit, resetAt: new Date(row.reset_at ?? fallbackReset) };
}

export interface DailyResult {
  allowed: boolean;
  remaining: number;
  limit: number;
  demo: boolean;
}

const num = (value: string | undefined, fallback: number) => (Number.isFinite(Number(value)) && Number(value) > 0 ? Number(value) : fallback);

/**
 * Today's allowance. The demo accounts are shared and their sign-in page is
 * public, so they get a small one (15 by default) to keep the free keys from
 * being drained; everyone else gets MOEAI_MAX_PER_DAY. Heavier callers (the
 * organizer) pass their own limits.
 */
export async function checkDailyLimit(
  sb: SupabaseClient,
  { perDay = num(process.env.MOEAI_MAX_PER_DAY, 150), demoPerDay = num(process.env.MOEAI_DEMO_PER_DAY, 15) }: { perDay?: number; demoPerDay?: number } = {},
): Promise<DailyResult> {
  const { data, error } = await sb.rpc("hit_daily_limit", { p_default: perDay, p_demo: demoPerDay });
  const row = Array.isArray(data) ? data[0] : data;
  if (error || !row) return { allowed: true, remaining: perDay, limit: perDay, demo: false };
  return { allowed: Boolean(row.allowed), remaining: Number(row.remaining ?? 0), limit: Number(row.day_limit ?? perDay), demo: Boolean(row.demo) };
}

/** Guests: counted per day by a salted hash of their IP, never the IP itself. */
export async function checkGuestLimit(sb: SupabaseClient, ip: string, perDay = num(process.env.MOEAI_GUEST_PER_DAY, 10)): Promise<{ allowed: boolean; remaining: number; limit: number }> {
  const { createHash } = await import("node:crypto");
  const salt = process.env.MOEAI_GUEST_SALT || process.env.NEXT_PUBLIC_SUPABASE_URL || "moeai";
  const key = createHash("sha256").update(`${salt}:${ip}`).digest("hex");
  const { data, error } = await sb.rpc("hit_guest_limit", { p_key: key, p_limit: perDay });
  const row = Array.isArray(data) ? data[0] : data;
  if (error || !row) return { allowed: true, remaining: perDay, limit: perDay };
  return { allowed: Boolean(row.allowed), remaining: Number(row.remaining ?? 0), limit: perDay };
}

/** What a student reads when the day is used up. */
export function dailyLimitMessage(result: { limit: number; demo?: boolean }): string {
  return result.demo
    ? `The demo account gets ${result.limit} MoeAI requests a day, and today's are used up. They reset at midnight UTC.`
    : `You've used today's ${result.limit} MoeAI requests. They reset at midnight UTC.`;
}
