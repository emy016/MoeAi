/**
 * /api/organizer/brain — MoeAI's organized knowledge of a course.
 * GET reads it. POST organizes it in steps small enough for one serverless
 * call each: {step:"plan"} lists the files, {step:"digest", materialId} reads
 * one file, {step:"merge"} builds the course map from the file digests.
 * Without a step it does everything in one go (fine for small courses).
 */
import { NextRequest } from "next/server";
import { buildBrain, digestMaterial, mergeBrain, organizePlan } from "@/lib/rag/brain";
import { errorMessage, sameOrigin, staffFor } from "@/lib/rag/staff";
import { checkDailyLimit, dailyLimitMessage } from "@/lib/ratelimit";

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
  if (body.step === "code") {
    const { error } = await ctx.sb.rpc("set_course_code", { p_course: ctx.course.id, p_code: String(body.code ?? "") });
    if (error) return Response.json({ error: error.message }, { status: 400 });
    return Response.json({ ok: true });
  }
  if (body.step === "plan") return Response.json({ files: await organizePlan(ctx.sb, ctx.course.id, Boolean(body.fresh)) });
  // Staff get a larger allowance, but the demo staff account is public too.
  const day = await checkDailyLimit(ctx.sb, { perDay: 400, demoPerDay: 60 });
  if (!day.allowed) return Response.json({ error: dailyLimitMessage(day) }, { status: 429 });
  try {
    if (body.step === "digest") {
      if (typeof body.materialId !== "string") return Response.json({ error: "Pick a file." }, { status: 400 });
      const digest = await digestMaterial(ctx.sb, ctx.course, body.materialId);
      return Response.json({ ok: true, digest });
    }
    const brain = body.step === "merge" ? await mergeBrain(ctx.sb, ctx.course) : await buildBrain(ctx.sb, ctx.course);
    return Response.json({ ok: true, brain });
  } catch (err) {
    return Response.json({ error: errorMessage(err, "MoeAI could not organize this course.") }, { status: 500 });
  }
}
