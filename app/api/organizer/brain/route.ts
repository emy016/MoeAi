/**
 * /api/organizer/brain — MoeAI's organized knowledge of a course.
 * GET reads it; POST rebuilds it from every processed file.
 */
import { NextRequest } from "next/server";
import { buildBrain } from "@/lib/rag/brain";
import { errorMessage, sameOrigin, staffFor } from "@/lib/rag/staff";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  const ctx = await staffFor(new URL(req.url).searchParams.get("course"));
  if (ctx instanceof Response) return ctx;
  const { data } = await ctx.sb.from("course_brain").select("*").eq("course_id", ctx.course.id).maybeSingle();
  return Response.json({ brain: data ?? null }, { headers: { "cache-control": "no-store" } });
}

export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return Response.json({ error: "Request origin not allowed." }, { status: 403 });
  const body = await req.json().catch(() => ({}));
  const ctx = await staffFor(body.courseId);
  if (ctx instanceof Response) return ctx;
  try {
    const brain = await buildBrain(ctx.sb, ctx.course);
    return Response.json({ ok: true, brain });
  } catch (err) {
    return Response.json({ error: errorMessage(err, "MoeAI could not organize this course.") }, { status: 500 });
  }
}
