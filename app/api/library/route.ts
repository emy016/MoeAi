/**
 * /api/library — Library Mode.
 *
 * A student, tutor, or organisation uploads their own material; MoeAI then
 * grounds on it exactly the way it grounds on shared curriculum. This is what
 * makes MoeAI usable before any official course content exists, and it is the
 * whole standalone story: bring your own syllabus.
 *
 * Everything runs as the signed-in user under RLS, so one library can never
 * leak into another.
 */
import { NextRequest } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";
import { chunkText, extractText } from "@/lib/chunk";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_BYTES = 8 * 1024 * 1024;       // 8MB per upload
const MAX_CHARS = 400_000;               // ~200 pages of text
const MAX_DOCS = 60;                     // per user, so one account cannot flood

function bad(status: number, message: string) {
  return Response.json({ error: message }, { status });
}

/** List the caller's documents. */
export async function GET() {
  const sb = await supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return bad(401, "Not signed in.");

  const { data, error } = await sb
    .from("documents")
    .select("id, title, source_kind, source_url, char_count, created_at")
    .order("created_at", { ascending: false });

  if (error) return bad(500, "Could not load your library.");
  return Response.json({ documents: data ?? [] });
}

/**
 * Add material. Accepts either JSON (pasted text) or multipart (a file).
 * Both paths converge on the same chunk-and-index step.
 */
export async function POST(req: NextRequest) {
  const sb = await supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return bad(401, "Not signed in.");

  const { count } = await sb
    .from("documents")
    .select("id", { count: "exact", head: true });
  if ((count ?? 0) >= MAX_DOCS) {
    return bad(413, `You have reached the ${MAX_DOCS}-document limit. Delete something first.`);
  }

  let title = "";
  let body = "";
  let sourceKind: "text" | "pdf" = "text";

  const contentType = req.headers.get("content-type") ?? "";

  if (contentType.includes("multipart/form-data")) {
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return bad(400, "No file was uploaded.");
    if (file.size > MAX_BYTES) return bad(413, "That file is larger than 8MB.");

    const text = await extractText(file).catch(() => null);
    if (text === null) {
      return bad(415, "Unsupported file. Use PDF, .txt, .md, or a subtitle file.");
    }
    body = text;
    title = String(form.get("title") || file.name).slice(0, 200);
    sourceKind = file.name.toLowerCase().endsWith(".pdf") ? "pdf" : "text";
  } else {
    let json: { title?: string; content?: string };
    try {
      json = await req.json();
    } catch {
      return bad(400, "Malformed request.");
    }
    body = (json.content ?? "").trim();
    title = (json.title ?? "").trim().slice(0, 200) || "Untitled note";
  }

  if (!body.trim()) return bad(422, "No readable text was found in that.");
  if (body.length > MAX_CHARS) return bad(413, "That document is too long. Split it up.");

  const chunks = chunkText(body);
  if (chunks.length === 0) return bad(422, "That produced no indexable text.");

  // Every user gets a default library at signup; fall back to creating one so a
  // pre-existing account is never stuck.
  let { data: library } = await sb
    .from("libraries")
    .select("id")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!library) {
    const { data } = await sb
      .from("libraries")
      .insert({ owner_id: user.id, name: "My library" })
      .select("id")
      .single();
    library = data;
  }
  if (!library) return bad(500, "Could not open your library.");

  const { data: doc, error: docError } = await sb
    .from("documents")
    .insert({
      library_id: library.id,
      owner_id: user.id,
      title,
      source_kind: sourceKind,
      char_count: body.length,
    })
    .select("id, title, source_kind, char_count, created_at")
    .single();

  if (docError || !doc) return bad(500, "Could not save that document.");

  const { error: chunkError } = await sb.from("chunks").insert(
    chunks.map((content, idx) => ({
      document_id: doc.id,
      owner_id: user.id,
      idx,
      content,
    })),
  );

  if (chunkError) {
    // Do not leave a document with no retrievable text behind.
    await sb.from("documents").delete().eq("id", doc.id);
    return bad(500, "Could not index that document.");
  }

  return Response.json({ document: doc, chunks: chunks.length });
}

/** Delete a document. Its chunks cascade. */
export async function DELETE(req: NextRequest) {
  const sb = await supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return bad(401, "Not signed in.");

  const id = new URL(req.url).searchParams.get("id");
  if (!id) return bad(400, "id is required.");

  const { error } = await sb.from("documents").delete().eq("id", id);
  if (error) return bad(500, "Could not delete that.");
  return Response.json({ ok: true });
}
