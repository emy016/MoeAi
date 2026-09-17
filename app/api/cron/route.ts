/**
 * GET /api/cron — the proactive layer. Vercel Cron runs it daily.
 *
 * Deliberately deterministic: SQL decides *who* gets nudged and *why*. Waking
 * up a model call per student every morning is how a free tier dies, and a
 * template sentence is no worse than a generated one for "you have not opened
 * this in three days".
 */
import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";

export const runtime = "nodejs";
export const maxDuration = 60;

const DAY = 86_400_000;

export async function GET(req: NextRequest) {
  // Vercel Cron sends the secret as a bearer token. Reject anything else, so
  // this cannot be triggered by anyone who finds the URL.
  const auth = req.headers.get("authorization");
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const db = supabaseAdmin();
  const now = Date.now();
  const rows: { user_id: string; kind: string; body: string; action_url: string }[] = [];

  // 1. Weak spots worth revisiting: a misconception recorded 2+ days ago.
  //    Spaced repetition, at its simplest and cheapest.
  const { data: stale } = await db
    .from("student_memory")
    .select("user_id, value, updated_at")
    .eq("kind", "misconception")
    .lt("updated_at", new Date(now - 2 * DAY).toISOString())
    .order("updated_at", { ascending: true })
    .limit(300);

  const seenRevisit = new Set<string>();
  for (const m of stale ?? []) {
    if (seenRevisit.has(m.user_id)) continue;   // at most one per student per day
    seenRevisit.add(m.user_id);
    rows.push({
      user_id: m.user_id,
      kind: "revisit",
      body: `Worth another look: ${String(m.value).slice(0, 160)}`,
      action_url: "/moeai",
    });
  }

  // 2. Students who have not been back in three days.
  const { data: dormant } = await db
    .from("conversations")
    .select("user_id, updated_at")
    .lt("updated_at", new Date(now - 3 * DAY).toISOString())
    .order("updated_at", { ascending: true })
    .limit(300);

  const seenDormant = new Set<string>();
  for (const c of dormant ?? []) {
    if (seenDormant.has(c.user_id) || seenRevisit.has(c.user_id)) continue;
    seenDormant.add(c.user_id);
    rows.push({
      user_id: c.user_id,
      kind: "dormant",
      body: "It has been a few days. Pick one topic you are shaky on and we will go through it.",
      action_url: "/moeai",
    });
  }

  // 3. Material uploaded but never quizzed.
  const { data: unquizzed } = await db
    .from("documents")
    .select("owner_id, title")
    .lt("created_at", new Date(now - DAY).toISOString())
    .limit(300);

  const seenQuiz = new Set<string>();
  for (const d of unquizzed ?? []) {
    if (seenQuiz.has(d.owner_id) || seenRevisit.has(d.owner_id) || seenDormant.has(d.owner_id)) continue;
    seenQuiz.add(d.owner_id);
    rows.push({
      user_id: d.owner_id,
      kind: "misconception",
      body: `You added “${String(d.title).slice(0, 80)}” but never tested yourself on it.`,
      action_url: "/quizzes",
    });
  }

  // Do not stack duplicates on someone who has not read yesterday's nudge.
  const userIds = [...new Set(rows.map((r) => r.user_id))];
  const { data: pending } = await db
    .from("nudges")
    .select("user_id")
    .in("user_id", userIds.length ? userIds : ["00000000-0000-0000-0000-000000000000"])
    .is("seen_at", null);

  const hasPending = new Set((pending ?? []).map((p) => p.user_id));
  const toInsert = rows.filter((r) => !hasPending.has(r.user_id));

  if (toInsert.length) await db.from("nudges").insert(toInsert);

  return Response.json({
    ok: true,
    ranAt: new Date().toISOString(),
    considered: rows.length,
    created: toInsert.length,
    skippedWithPending: rows.length - toInsert.length,
  });
}
