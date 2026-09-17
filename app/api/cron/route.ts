/**
 * GET /api/cron — the proactive layer, run daily by Vercel Cron.
 *
 * Deliberately deterministic. It decides *whether* to nudge a student using SQL,
 * not an LLM, because waking up 230 model calls every morning is how a free tier
 * dies. Only the wording of a nudge should ever go through a model, and not yet.
 */
import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  // Vercel Cron sends the secret as a bearer token. Reject anything else.
  const auth = req.headers.get("authorization");
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const db = supabaseAdmin();

  // Students who have not had a conversation in three days.
  const cutoff = new Date(Date.now() - 3 * 86_400_000).toISOString();
  const { data: stale } = await db
    .from("conversations")
    .select("user_id, updated_at")
    .lt("updated_at", cutoff)
    .order("updated_at", { ascending: true })
    .limit(200);

  const dormant = [...new Set((stale ?? []).map((r) => r.user_id))];

  // TODO: deliver these. Web push and the Expo app both land after the spine.
  // For now the job proves the schedule works and reports what it would send.
  return Response.json({
    ok: true,
    ranAt: new Date().toISOString(),
    dormantStudents: dormant.length,
    delivered: 0,
  });
}
