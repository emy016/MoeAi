/**
 * /api/nudges — the proactive layer, read side.
 *
 * The daily job writes these in SQL: a misconception that has sat unrevised
 * for two days, a student who has not been back in three, material uploaded
 * and never tested. Nothing here calls a model — waking up 230 model calls
 * every morning is how a free tier dies, and a template sentence is no worse
 * than a generated one for "you have not opened this in three days".
 */
import { NextRequest } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";

export const runtime = "nodejs";

export async function GET() {
  const sb = await supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return Response.json({ nudges: [] });

  // New lectures, today's practice question, a misconception to revisit:
  // written for this student on the spot (refresh_nudges only writes for
  // auth.uid()), so MoeAI reaches out even without the daily job.
  await sb.rpc("refresh_nudges").then(() => {}, () => {});

  const { data } = await sb
    .from("nudges")
    .select("id, kind, body, prompt, action_url, course_id, material_id, created_at")
    .is("seen_at", null)
    .order("created_at", { ascending: false })
    .limit(3);

  return Response.json({ nudges: data ?? [] });
}

/** Dismiss one. A nudge that keeps coming back is an annoyance, not a nudge. */
export async function POST(req: NextRequest) {
  const sb = await supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return Response.json({ ok: true });

  let body: { id?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Malformed request." }, { status: 400 });
  }
  if (!body.id) return Response.json({ error: "id is required." }, { status: 400 });

  await sb.from("nudges").update({ seen_at: new Date().toISOString() }).eq("id", body.id);
  return Response.json({ ok: true });
}
