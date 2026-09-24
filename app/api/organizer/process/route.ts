/**
 * POST /api/organizer/process — read, chunk and embed one uploaded file.
 * Called by the Organizer right after the browser finishes the upload.
 */
import { NextRequest } from "next/server";
import { ingestMaterial } from "@/lib/rag/ingest";
import { errorMessage, sameOrigin, staffFor } from "@/lib/rag/staff";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return Response.json({ error: "Request origin not allowed." }, { status: 403 });
  const body = await req.json().catch(() => ({}));
  const ctx = await staffFor(body.courseId);
  if (ctx instanceof Response) return ctx;
  const { data: material } = await ctx.sb
    .from("course_materials")
    .select("id, course_id, title, storage_path")
    .eq("id", body.id)
    .eq("course_id", ctx.course.id)
    .maybeSingle();
  if (!material) return Response.json({ error: "File not found." }, { status: 404 });
  try {
    const result = await ingestMaterial(ctx.sb, material);
    return Response.json({ ok: true, ...result });
  } catch (err) {
    return Response.json({ error: errorMessage(err, "Processing failed.") }, { status: 500 });
  }
}
