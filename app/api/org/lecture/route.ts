/**
 * GET /api/org/lecture?id=<material> — one lecture's pages, for the in-app reader.
 *
 * RLS decides: a student only gets pages of published material in a course
 * they are enrolled in; staff also see drafts of what they teach.
 */
import { NextRequest } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id") ?? "";
  if (!/^[0-9a-f-]{36}$/i.test(id)) return Response.json({ error: "Pick a lecture." }, { status: 400 });
  const sb = await supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return Response.json({ error: "Sign in to read your course material." }, { status: 401 });
  const [{ data: material }, { data: pages }] = await Promise.all([
    sb.from("course_materials").select("id, title, kind, week, pages, summary, course_id, courses(code, title)").eq("id", id).maybeSingle(),
    sb.from("course_pages").select("page, content").eq("material_id", id).order("page"),
  ]);
  if (!material) return Response.json({ error: "This lecture is not available to you." }, { status: 404 });
  const course = (Array.isArray(material.courses) ? material.courses[0] : material.courses) as { code: string; title: string } | null;
  return Response.json(
    { id: material.id, title: material.title, week: material.week, summary: material.summary, course, pages: pages ?? [] },
    { headers: { "cache-control": "private, max-age=300" } },
  );
}
