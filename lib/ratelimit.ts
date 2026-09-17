/**
 * Per-user hourly cap on model calls.
 *
 * This is the spending cap. Free provider tiers plus 230 students is exactly
 * how a project wakes up to a suspended API key. The counter lives in Postgres
 * (not memory) because serverless instances do not share state.
 */
// Reads provider API keys / the service-role key. The "server-only" import
// makes importing this from a client component a BUILD error rather than a
// silent leak of those keys into the browser bundle.
import "server-only";
import { supabaseAdmin } from "./supabase-server";

export interface RateResult {
  allowed: boolean;
  remaining: number;
  limit: number;
  resetAt: Date;
}

export async function checkRateLimit(userId: string): Promise<RateResult> {
  const limit = Number(process.env.MOEAI_MAX_MESSAGES_PER_HOUR ?? 40);

  // Bucket by clock hour: simple, and the row count stays tiny.
  const now = new Date();
  const windowStart = new Date(now);
  windowStart.setMinutes(0, 0, 0);
  const resetAt = new Date(windowStart.getTime() + 3_600_000);

  const db = supabaseAdmin();

  const { data: row } = await db
    .from("rate_limits")
    .select("count")
    .eq("user_id", userId)
    .eq("window_start", windowStart.toISOString())
    .maybeSingle();

  const used = row?.count ?? 0;
  if (used >= limit) {
    return { allowed: false, remaining: 0, limit, resetAt };
  }

  await db.from("rate_limits").upsert(
    { user_id: userId, window_start: windowStart.toISOString(), count: used + 1 },
    { onConflict: "user_id,window_start" },
  );

  return { allowed: true, remaining: limit - used - 1, limit, resetAt };
}
