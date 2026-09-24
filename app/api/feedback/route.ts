/**
 * POST /api/feedback — a thumbs up or down on one MoeAI answer.
 *
 * Stored per student and answer (one vote each, changeable). Answers in a
 * university course are visible to that course's staff, so a lecturer can see
 * where the tutor is falling short on their material.
 */
import { NextRequest } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";
import { sameOrigin } from "@/lib/rag/staff";

export const runtime = "nodejs";

const REASONS = new Set(["wrong", "unclear", "off_topic", "too_long", "not_my_course", "other"]);

export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return Response.json({ error: "Request origin not allowed." }, { status: 403 });
  const body = await req.json().catch(() => null);
  const key = typeof body?.key === "string" ? body.key.slice(0, 120) : "";
  const rating = body?.rating === 1 || body?.rating === -1 ? body.rating : 0;
  if (!key || !rating) return Response.json({ error: "Malformed feedback." }, { status: 400 });
  const sb = await supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  // Signed-out students can still vote; it just is not stored anywhere.
  if (!user) return Response.json({ ok: true, stored: false });
  const courseId = typeof body?.courseId === "string" && /^[0-9a-f-]{36}$/i.test(body.courseId) ? body.courseId : null;
  const { error } = await sb.from("message_feedback").upsert({
    user_id: user.id,
    message_key: key,
    rating,
    reason: REASONS.has(body?.reason) ? body.reason : null,
    course_id: courseId,
    excerpt: typeof body?.excerpt === "string" ? body.excerpt.slice(0, 600) : null,
  }, { onConflict: "user_id,message_key" });
  if (error) return Response.json({ error: "Could not save that. Try again." }, { status: 500 });
  return Response.json({ ok: true, stored: true });
}
