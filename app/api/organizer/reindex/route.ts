/**
 * POST /api/organizer/reindex — embed a course's passages that have none yet.
 *
 * Bulk-imported material is searchable by text from the moment it lands; this
 * adds the meaning-based half of retrieval. The Organizer calls it on open
 * and keeps calling while `remaining` > 0, each call spending at most ~40s of
 * embedding so it fits a serverless invocation and the free-tier rate limits.
 */
import { NextRequest } from "next/server";
import { backfillEmbeddings } from "@/lib/rag/backfill";
import { errorMessage, sameOrigin, staffFor } from "@/lib/rag/staff";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return Response.json({ error: "Request origin not allowed." }, { status: 403 });
  const body = await req.json().catch(() => ({}));
  const ctx = await staffFor(body.courseId);
  if (ctx instanceof Response) return ctx;
  const started = Date.now();
  let filled = 0;
  try {
    while (Date.now() - started < 40_000) {
      const round = await backfillEmbeddings(ctx.sb, ctx.course.id, 20);
      filled += round.filled;
      if (!round.pending || !round.filled) break;
    }
  } catch (err) {
    if (!filled) return Response.json({ error: errorMessage(err, "Embedding failed. Try again in a minute.") }, { status: 502 });
  }
  const { count } = await ctx.sb.from("course_chunks").select("id", { count: "exact", head: true }).eq("course_id", ctx.course.id).is("embedding", null);
  return Response.json({ ok: true, filled, remaining: count ?? 0 });
}
