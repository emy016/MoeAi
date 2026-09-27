/**
 * POST /api/organizer/research — MoeAI researches one gap in a course and
 * files a study note for staff review.
 */
import { NextRequest } from "next/server";
import { researchGap } from "@/lib/rag/brain";
import { errorMessage, sameOrigin, staffFor } from "@/lib/rag/staff";
import { checkDailyLimit, dailyLimitMessage } from "@/lib/ratelimit";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return Response.json({ error: "Request origin not allowed." }, { status: 403 });
  const body = await req.json().catch(() => ({}));
  const ctx = await staffFor(body.courseId);
  if (ctx instanceof Response) return ctx;
  // Staff get a larger allowance, but the demo staff account is public too.
  const day = await checkDailyLimit(ctx.sb, { perDay: 400, demoPerDay: 60 });
  if (!day.allowed) return Response.json({ error: dailyLimitMessage(day) }, { status: 429 });
  const topic = String(body.topic ?? "").trim().slice(0, 200);
  if (!topic) return Response.json({ error: "Name the topic to research." }, { status: 400 });
  try {
    const note = await researchGap(ctx.sb, ctx.course, { topic, why: String(body.why ?? "").slice(0, 400) }, ctx.userId);
    return Response.json({ ok: true, note });
  } catch (err) {
    return Response.json({ error: errorMessage(err, "Research failed.") }, { status: 500 });
  }
}
