/**
 * GET /api/realtime — what a plain page needs to open the Realtime websocket
 * as the signed-in student: the project URL, the public anon key, their
 * access token (so Postgres changes arrive through RLS), and their ranked
 * profile. The token is the one already in their session cookie; this only
 * hands it to same-origin script on a page that has no Supabase SDK bundled.
 */
import { supabaseServer } from "@/lib/supabase-server";
import { SUPABASE_ANON, SUPABASE_URL, isConfigured } from "@/lib/env";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const site = req.headers.get("sec-fetch-site");
  if (site && site !== "same-origin") return Response.json({ error: "Not allowed." }, { status: 403 });
  if (!isConfigured) return Response.json({ signedIn: false });
  const sb = await supabaseServer();
  const [{ data: { user } }, { data: { session } }] = await Promise.all([sb.auth.getUser(), sb.auth.getSession()]);
  if (!user || !session) return Response.json({ signedIn: false });
  const [{ data: profile }, { data: account }] = await Promise.all([
    sb.from("ranked_profiles").select("rating, wins, losses, draws, matches, best_streak, display_name").eq("user_id", user.id).maybeSingle(),
    sb.from("profiles").select("display_name").eq("id", user.id).maybeSingle(),
  ]);
  return Response.json({
    signedIn: true,
    url: SUPABASE_URL,
    anonKey: SUPABASE_ANON,
    token: session.access_token,
    expiresAt: session.expires_at,
    user: { id: user.id, name: profile?.display_name || account?.display_name || user.email?.split("@")[0] || "Student" },
    profile: profile ?? { rating: 1000, wins: 0, losses: 0, draws: 0, matches: 0, best_streak: 0 },
  }, { headers: { "cache-control": "no-store" } });
}
