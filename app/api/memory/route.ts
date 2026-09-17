/**
 * /api/memory — read and write the student model.
 *
 * Everything here runs as the signed-in student under RLS, so one student can
 * never touch another's memory even if they forge the request body.
 */
import { NextRequest } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";

export const runtime = "nodejs";

const KINDS = ["fact", "preference", "misconception", "goal"] as const;
type Kind = (typeof KINDS)[number];

export async function GET() {
  const sb = await supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return Response.json({ error: "Not signed in." }, { status: 401 });

  const { data, error } = await sb
    .from("student_memory")
    .select("id, kind, key, value, confidence, updated_at")
    .order("updated_at", { ascending: false })
    .limit(100);

  if (error) return Response.json({ error: "Could not read memory." }, { status: 500 });
  return Response.json({ memory: data ?? [] });
}

export async function POST(req: NextRequest) {
  const sb = await supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return Response.json({ error: "Not signed in." }, { status: 401 });

  let body: { key?: string; value?: string; kind?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Malformed request." }, { status: 400 });
  }

  const key = (body.key ?? "").trim().slice(0, 120);
  const value = (body.value ?? "").trim().slice(0, 600);
  const kind = (KINDS as readonly string[]).includes(body.kind ?? "")
    ? (body.kind as Kind)
    : "fact";

  if (!key || !value) return Response.json({ error: "key and value are required." }, { status: 400 });

  const { error } = await sb.from("student_memory").upsert(
    { user_id: user.id, key, value, kind, updated_at: new Date().toISOString() },
    { onConflict: "user_id,key" },
  );
  if (error) return Response.json({ error: "Could not save memory." }, { status: 500 });

  return Response.json({ ok: true });
}

/** A student can always delete what MoeAI remembers about them. */
export async function DELETE(req: NextRequest) {
  const sb = await supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return Response.json({ error: "Not signed in." }, { status: 401 });

  const id = new URL(req.url).searchParams.get("id");
  if (!id) return Response.json({ error: "id is required." }, { status: 400 });

  const { error } = await sb.from("student_memory").delete().eq("id", id);
  if (error) return Response.json({ error: "Could not delete." }, { status: 500 });
  return Response.json({ ok: true });
}
