import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { embed, toVector } from "../ai/embed";

/**
 * Completes a course's vector index a few passages at a time.
 *
 * Material imported in bulk lands with full-text search working immediately
 * and embeddings still to come. Whenever someone who can read the course uses
 * it, the server embeds the next few missing passages with its own keys and
 * writes them through fill_chunk_embeddings, which only ever fills NULLs, so
 * the index fills itself in the background without anyone running a job.
 */
export async function backfillEmbeddings(sb: SupabaseClient, courseId: string, max = 16): Promise<{ filled: number; pending: number }> {
  const { data: rows, error } = await sb.rpc("chunks_missing_embeddings", { course: courseId, max_rows: max });
  if (error || !rows?.length) return { filled: 0, pending: 0 };
  const items = rows as { id: string; material_title: string; heading: string | null; content: string }[];
  const vectors = await embed(items.map((r) => `${r.material_title}${r.heading && r.heading !== r.material_title ? ` — ${r.heading}` : ""}\n\n${r.content}`));
  const { data: filled } = await sb.rpc("fill_chunk_embeddings", {
    course: courseId,
    ids: items.map((r) => r.id),
    vectors: vectors.map(toVector),
  });
  return { filled: Number(filled ?? 0), pending: items.length };
}
