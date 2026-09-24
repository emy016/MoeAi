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
