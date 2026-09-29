import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { chunkText } from "../chunk";
import { embed, toVector } from "../ai/embed";
import { extractPages, type Page } from "./extract";
import { ocrPages, pageRanges, SPARSE_CHARS } from "./ocr";

/**
 * One uploaded course file into retrievable, cited chunks.
 *
 * Runs as the staff member who uploaded it (their session, so RLS decides
 * whether they may teach this course), not with a service key. Pages stay
 * separate through chunking so every passage keeps the page or slide it came
 * from, and the heading is the first short line of that page, which on slides
 * is almost always the slide title.
 */
export type IngestResult = { pages: number; chars: number; chunks: number };

type Chunk = { page: number; heading: string; content: string };

function heading(text: string): string {
  const first = text.split("\n").map((l) => l.trim()).find((l) => l.length > 2 && l.length < 90);
  return first ?? "";
}

export function chunkPages(pages: Page[]): Chunk[] {
  const out: Chunk[] = [];
  for (const p of pages) {
    const text = p.text.replace(/\u0000/g, "").trim();
    if (text.length < 20) continue;
    const title = heading(text);
    // chunkText drops pieces under 40 characters; a short slide is still a slide.
    const pieces = text.length <= 400 ? [text] : chunkText(text);
    for (const content of pieces) out.push({ page: p.page, heading: title, content });
  }
  // Tiny neighbouring slides are merged so a retrieval hit carries enough to answer from.
  const merged: Chunk[] = [];
  for (const c of out) {
    const last = merged[merged.length - 1];
    if (last && last.content.length < 500 && last.content.length + c.content.length < 1400) {
      last.content += `\n\n[p.${c.page}] ${c.content}`;
    } else merged.push({ ...c });
  }
  return merged;
}

export async function ingestMaterial(
  sb: SupabaseClient,
  material: { id: string; course_id: string; title: string; storage_path: string },
): Promise<IngestResult> {
  await sb.from("course_materials").update({ status: "processing", error: null }).eq("id", material.id);
  try {
    const { data: file, error } = await sb.storage.from("course-files").download(material.storage_path);
    if (error || !file) throw new Error(`Could not read the upload (${error?.message ?? "missing"}).`);
    const bytes = new Uint8Array(await file.arrayBuffer());
    let pages = await extractPages(bytes, material.storage_path, file.type);
    let note: string | null = null;
    const isPdf = material.storage_path.toLowerCase().endsWith(".pdf") || file.type === "application/pdf";
    const sparse = isPdf ? pages.filter((p) => p.text.replace(/\s+/g, "").length < SPARSE_CHARS).map((p) => p.page) : [];
    if (sparse.length) {
      // Scanned or handwritten pages: read them from the images.
      const ocr = await ocrPages(bytes, sparse);
      const read = new Map(ocr.pages.map((p) => [p.page, p.text]));
      pages = pages.map((p) => (read.get(p.page)?.trim() ? { page: p.page, text: read.get(p.page)! } : p));
      if (ocr.failed.length) {
        note = `Pages ${pageRanges(ocr.failed)} could not be read (scanned). Upload them as a separate file to add them.`;
      }
    }
    const chars = pages.reduce((n, p) => n + p.text.length, 0);
    const chunks = chunkPages(pages);
    if (!chunks.length) {
      throw new Error(note ?? "No text found in this file.");
    }

    const vectors = await embed(chunks.map((c) => `${material.title}${c.heading ? ` — ${c.heading}` : ""}\n\n${c.content}`));

    await sb.from("course_chunks").delete().eq("material_id", material.id);
    const rows = chunks.map((c, idx) => ({
      material_id: material.id,
      course_id: material.course_id,
      idx,
      heading: c.heading.slice(0, 200),
      page: c.page,
      content: c.content,
      embedding: toVector(vectors[idx]),
    }));
    for (let i = 0; i < rows.length; i += 200) {
      const { error: insertError } = await sb.from("course_chunks").insert(rows.slice(i, i + 200));
      if (insertError) throw new Error(`Saving chunks failed: ${insertError.message}`);
    }

    const result = { pages: pages.length, chars, chunks: rows.length };
    await sb.from("course_materials").update({
      status: "ready", error: note, pages: result.pages, char_count: chars, chunk_count: result.chunks, updated_at: new Date().toISOString(),
    }).eq("id", material.id);
    return result;
  } catch (err) {
    const message = err instanceof Error ? err.message : "Processing failed.";
    await sb.from("course_materials").update({ status: "failed", error: message.slice(0, 500) }).eq("id", material.id);
    throw err;
  }
}

/** A note MoeAI wrote itself (a gap it filled), stored and embedded like any other material. */
export async function ingestText(
  sb: SupabaseClient,
  material: { id: string; course_id: string; title: string },
  text: string,
): Promise<number> {
  const chunks = chunkPages([{ page: 1, text }]);
  if (!chunks.length) return 0;
  const vectors = await embed(chunks.map((c) => `${material.title}\n\n${c.content}`));
  await sb.from("course_chunks").delete().eq("material_id", material.id);
  const { error } = await sb.from("course_chunks").insert(chunks.map((c, idx) => ({
    material_id: material.id, course_id: material.course_id, idx, heading: c.heading.slice(0, 200), page: c.page, content: c.content, embedding: toVector(vectors[idx]),
  })));
  if (error) throw new Error(error.message);
  return chunks.length;
}
