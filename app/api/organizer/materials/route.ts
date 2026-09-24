/**
 * /api/organizer/materials — a course's files, as its staff manage them.
 *
 * GET lists every file with its processing state; POST registers a new one
 * and returns the storage path the browser uploads it to (straight to
 * Supabase Storage, so a 40 MB lecture PDF never passes through a function);
 * PATCH approves or rejects a note MoeAI wrote; DELETE removes a file and its
 * chunks.
 */
import { NextRequest } from "next/server";
import { sameOrigin, staffFor } from "@/lib/rag/staff";

export const runtime = "nodejs";

const KINDS = new Set(["pdf", "slides", "text", "notes"]);

export async function GET(req: NextRequest) {
  const ctx = await staffFor(new URL(req.url).searchParams.get("course"));
  if (ctx instanceof Response) return ctx;
  const { data, error } = await ctx.sb
    .from("course_materials")
    .select("id, title, kind, week, status, error, pages, char_count, chunk_count, summary, storage_path, created_at, updated_at")
    .eq("course_id", ctx.course.id)
    .order("created_at", { ascending: false });
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ course: ctx.course, materials: data ?? [] }, { headers: { "cache-control": "no-store" } });
}

export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return Response.json({ error: "Request origin not allowed." }, { status: 403 });
  const body = await req.json().catch(() => ({}));
  const ctx = await staffFor(body.courseId);
  if (ctx instanceof Response) return ctx;
  const fileName = String(body.fileName ?? "").slice(0, 200);
  if (!/\.(pdf|pptx|docx|txt|md|markdown|csv|srt|vtt)$/i.test(fileName)) {
    return Response.json({ error: "Upload a PDF, PowerPoint (.pptx), Word (.docx) or text file." }, { status: 400 });
  }
  const kind = KINDS.has(body.kind) ? body.kind : /\.pptx$/i.test(fileName) ? "slides" : /\.pdf$/i.test(fileName) ? "pdf" : "text";
  const week = Number.isInteger(body.week) && body.week > 0 && body.week < 30 ? body.week : null;
  const title = String(body.title || fileName.replace(/\.[^.]+$/, "")).trim().slice(0, 160);

  const { data, error } = await ctx.sb
    .from("course_materials")
    .insert({ course_id: ctx.course.id, title, kind, week, status: "queued", uploaded_by: ctx.userId, storage_path: "pending" })
    .select("id")
    .single();
  if (error || !data) return Response.json({ error: error?.message ?? "Could not register the file." }, { status: 500 });
  const safe = fileName.replace(/[^\w.-]+/g, "_");
  const path = `${ctx.course.id}/${data.id}/${safe}`;
  await ctx.sb.from("course_materials").update({ storage_path: path }).eq("id", data.id);
  return Response.json({ id: data.id, path });
}

export async function PATCH(req: NextRequest) {
  if (!sameOrigin(req)) return Response.json({ error: "Request origin not allowed." }, { status: 403 });
  const body = await req.json().catch(() => ({}));
  const ctx = await staffFor(body.courseId);
  if (ctx instanceof Response) return ctx;
  if (body.action === "approve") {
    const { error } = await ctx.sb.from("course_materials").update({ status: "ready", updated_at: new Date().toISOString() })
      .eq("id", body.id).eq("course_id", ctx.course.id).eq("status", "pending_review");
    if (error) return Response.json({ error: error.message }, { status: 500 });
    return Response.json({ ok: true });
  }
  if (body.action === "reject") return remove(ctx, body.id);
  return Response.json({ error: "Unknown action." }, { status: 400 });
}

export async function DELETE(req: NextRequest) {
  if (!sameOrigin(req)) return Response.json({ error: "Request origin not allowed." }, { status: 403 });
  const body = await req.json().catch(() => ({}));
  const ctx = await staffFor(body.courseId);
  if (ctx instanceof Response) return ctx;
  return remove(ctx, body.id);
}

async function remove(ctx: Exclude<Awaited<ReturnType<typeof staffFor>>, Response>, id: unknown) {
  if (typeof id !== "string") return Response.json({ error: "id is required." }, { status: 400 });
  const { data: material } = await ctx.sb.from("course_materials").select("id, storage_path").eq("id", id).eq("course_id", ctx.course.id).maybeSingle();
  if (!material) return Response.json({ error: "File not found." }, { status: 404 });
  await ctx.sb.from("course_chunks").delete().eq("material_id", id);
  if (material.storage_path?.startsWith(`${ctx.course.id}/`)) await ctx.sb.storage.from("course-files").remove([material.storage_path]);
  const { error } = await ctx.sb.from("course_materials").delete().eq("id", id);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true });
}
