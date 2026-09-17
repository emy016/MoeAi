/**
 * /api/ranked — the leaderboard.
 *
 * Ranked is the one part of EduMoe that is inherently cross-user: a rating
 * only means something measured against other students. Everything else can
 * live in the student's own state; this cannot.
 *
 * The client reports its own match result, so the write path clamps what it is
 * allowed to claim. That is not a substitute for server-authoritative matches
 * — it stops a casual tamper, not a determined one — and the ceiling is
 * documented rather than pretended away.
 */
import { NextRequest } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";

export const runtime = "nodejs";

const MIN_RATING = 0;
const MAX_RATING = 4000;
/** Largest rating change a single reported match may claim. */
const MAX_DELTA = 64;

export async function GET(req: NextRequest) {
  const sb = await supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return Response.json({ leaderboard: [], me: null });

  const limit = Number(new URL(req.url).searchParams.get("limit") ?? 50);
  const { data, error } = await sb.rpc("leaderboard", { max_rows: limit });
  if (error) return Response.json({ leaderboard: [], me: null });

  const rows = data ?? [];
  return Response.json({
    leaderboard: rows,
    me: rows.find((r: { is_me: boolean }) => r.is_me) ?? null,
  });
}

export async function POST(req: NextRequest) {
  const sb = await supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return Response.json({ ok: true, synced: false });

  let body: {
    displayName?: string;
    rating?: number;
    wins?: number; losses?: number; draws?: number;
    bestStreak?: number; matches?: number;
    achievements?: unknown[];
  };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Malformed request." }, { status: 400 });
  }

  const [{ data: current }, { data: profile }] = await Promise.all([
    sb.from("ranked_profiles")
      .select("rating, wins, losses, draws, matches, best_streak, display_name")
      .eq("user_id", user.id)
      .maybeSingle(),
    sb.from("profiles").select("display_name").eq("id", user.id).maybeSingle(),
  ]);

  // The page calls the local player "You". On a shared leaderboard that is
  // useless, so fall back to the account's own name.
  const claimedName = String(body.displayName || "").trim();
  const displayName =
    claimedName && claimedName.toLowerCase() !== "you"
      ? claimedName
      : current?.display_name || profile?.display_name || "Student";

  const previous = current?.rating ?? 1000;
  const claimed = Number(body.rating);
  // A client may move its own rating by at most one match's worth per report.
  const rating = Number.isFinite(claimed)
    ? Math.min(Math.max(claimed, previous - MAX_DELTA), previous + MAX_DELTA)
    : previous;

  // Counters only ever go up.
  const monotonic = (next: unknown, prev: number) =>
    Math.max(prev, Math.min(Number(next) || 0, prev + 1));

  const row = {
    user_id: user.id,
    display_name: displayName.slice(0, 40),
    rating: Math.min(Math.max(Math.round(rating), MIN_RATING), MAX_RATING),
    wins: monotonic(body.wins, current?.wins ?? 0),
    losses: monotonic(body.losses, current?.losses ?? 0),
    draws: monotonic(body.draws, current?.draws ?? 0),
    matches: monotonic(body.matches, current?.matches ?? 0),
    best_streak: Math.max(current?.best_streak ?? 0, Number(body.bestStreak) || 0),
    achievements: Array.isArray(body.achievements) ? body.achievements.slice(0, 60) : [],
    updated_at: new Date().toISOString(),
  };

  const { error } = await sb.from("ranked_profiles").upsert(row, { onConflict: "user_id" });
  if (error) return Response.json({ error: "Could not save your rating." }, { status: 500 });

  return Response.json({ ok: true, synced: true, rating: row.rating });
}
