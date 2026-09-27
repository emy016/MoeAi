/**
 * POST /api/events: the app telling MoeAI what the student just did
 * (finished a practice set, played an arena match, opened a simulator, read a
 * lecture, opened a notification). Every chat surface reads this log, which is
 * how MoeAI knows about the arena while you talk to it in the DM.
 */
import { NextRequest } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";
import { logEvent } from "@/lib/moeai/alive";

export const runtime = "nodejs";

const KINDS = new Set(["practice", "exam", "flashcards", "arena", "simulator", "lecture", "notification", "calendar", "organizer", "study"]);

export async function POST(req: NextRequest) {
  const origin = req.headers.get("origin");
  if (origin) {
    try {
      if (new URL(origin).host !== req.headers.get("host")) return Response.json({ error: "Request origin not allowed." }, { status: 403 });
    } catch {
      return Response.json({ error: "Request origin not allowed." }, { status: 403 });
    }
  }
  const sb = await supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return Response.json({ ok: false }, { status: 200 }); // guests: nothing to remember
  const body = await req.json().catch(() => ({}));
  const kind = String(body?.kind ?? "");
  if (!KINDS.has(kind)) return Response.json({ error: "Unknown event." }, { status: 400 });
  const data = body?.data && typeof body.data === "object" ? JSON.parse(JSON.stringify(body.data).slice(0, 2000) || "{}") : {};
  await logEvent(sb, kind, String(body?.summary ?? ""), data);
  return Response.json({ ok: true });
}
