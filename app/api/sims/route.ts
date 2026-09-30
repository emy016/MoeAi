/**
 * /api/sims — the simulators MoeAI builds for each course (lib/sims.ts).
 *
 * GET lists them: students see a course's ready ones, staff see every state.
 * POST plans a course's simulators from its course map, builds one planned
 * simulator, or adds one a staff member asks for. PATCH hides, shows or
 * renames one; DELETE removes it. Staff rights are RLS's call
 * (can_teach_course); staffFor turns a refusal into a clear message.
 */
import { NextRequest } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";
import { errorMessage, sameOrigin, staffFor } from "@/lib/rag/staff";
import { buildSimulator, planCourse } from "@/lib/sims";

export const runtime = "nodejs";
export const maxDuration = 60;

const UUID = /^[0-9a-f-]{36}$/i;
const fail = (status: number, error: string) => Response.json({ error }, { status });
const COLUMNS = "id, course_id, title, topic, purpose, builtin_id, code, status, error, source, position, updated_at";

export async function GET(req: NextRequest) {
  const sb = await supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return Response.json({ sims: [] });
  const course = req.nextUrl.searchParams.get("course");
  let query = sb.from("course_simulators").select(COLUMNS).order("position").limit(500);
  if (course && UUID.test(course)) query = query.eq("course_id", course);
  const { data, error } = await query;
  if (error) return fail(500, error.message);
  return Response.json({ sims: data ?? [] }, { headers: { "cache-control": "no-store" } });
}

export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return fail(403, "Request origin not allowed.");
  const body = await req.json().catch(() => ({}));
  switch (body.action) {
    case "plan": {
      const ctx = await staffFor(body.courseId);
      if (ctx instanceof Response) return ctx;
      try {
        const result = await planCourse(ctx.sb, ctx.course, ctx.userId);
        return Response.json({ ok: true, ...result });
      } catch (err) {
        return fail(500, errorMessage(err, "MoeAI could not plan simulators right now."));
      }
    }
    case "build": {
      if (!UUID.test(String(body.id ?? ""))) return fail(400, "Pick a simulator.");
      const sb = await supabaseServer();
      const { data: sim } = await sb.from("course_simulators").select("id, course_id, title, topic, purpose, builtin_id").eq("id", body.id).maybeSingle();
      if (!sim) return fail(404, "Simulator not found.");
      if (sim.builtin_id) return Response.json({ ok: true });
      const ctx = await staffFor(sim.course_id);
      if (ctx instanceof Response) return ctx;
      try {
        await buildSimulator(ctx.sb, sim, ctx.course.title);
        const { data } = await ctx.sb.from("course_simulators").select(COLUMNS).eq("id", sim.id).maybeSingle();
        return Response.json({ ok: true, sim: data });
      } catch (err) {
        return fail(500, errorMessage(err, "The simulator could not be built. Try again."));
      }
    }
    case "request": {
      const ctx = await staffFor(body.courseId);
      if (ctx instanceof Response) return ctx;
      const title = String(body.title ?? "").trim().slice(0, 120);
      const purpose = String(body.purpose ?? "").trim().slice(0, 600);
      if (title.length < 3) return fail(400, "Name the simulator.");
      if (purpose.length < 10) return fail(400, "Say what the student should do with it.");
      const { count } = await ctx.sb.from("course_simulators").select("id", { count: "exact", head: true }).eq("course_id", ctx.course.id);
      const { data, error } = await ctx.sb.from("course_simulators")
        .insert({ course_id: ctx.course.id, title, purpose, topic: String(body.topic ?? "").slice(0, 200) || null, status: "planned", source: "staff", position: count ?? 0, created_by: ctx.userId })
        .select(COLUMNS).single();
      if (error) return fail(400, error.message);
      return Response.json({ ok: true, sim: data });
    }
    default:
      return fail(400, "Unknown action.");
  }
}

export async function PATCH(req: NextRequest) {
  if (!sameOrigin(req)) return fail(403, "Request origin not allowed.");
  const body = await req.json().catch(() => ({}));
  if (!UUID.test(String(body.id ?? ""))) return fail(400, "Pick a simulator.");
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (body.status === "hidden" || body.status === "ready") patch.status = body.status;
  if (typeof body.title === "string" && body.title.trim()) patch.title = body.title.trim().slice(0, 120);
  if (typeof body.purpose === "string") patch.purpose = body.purpose.trim().slice(0, 600);
  const sb = await supabaseServer();
  // "ready" only for something that has a page to show.
  let query = sb.from("course_simulators").update(patch).eq("id", body.id);
  if (patch.status === "ready") query = query.or("code.not.is.null,builtin_id.not.is.null");
  const { data, error } = await query.select(COLUMNS).maybeSingle();
  if (error || !data) return fail(403, "Only this course's staff can change its simulators.");
  return Response.json({ ok: true, sim: data });
}

export async function DELETE(req: NextRequest) {
  if (!sameOrigin(req)) return fail(403, "Request origin not allowed.");
  const body = await req.json().catch(() => ({}));
  if (!UUID.test(String(body.id ?? ""))) return fail(400, "Pick a simulator.");
  const sb = await supabaseServer();
  const { error, count } = await sb.from("course_simulators").delete({ count: "exact" }).eq("id", body.id);
  if (error || !count) return fail(403, "Only this course's staff can delete its simulators.");
  return Response.json({ ok: true });
}
