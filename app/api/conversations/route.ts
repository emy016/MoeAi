/**
 * /api/conversations — the chat sidebar's data.
 * All RLS-scoped, so the caller only ever sees their own threads.
 */
import { NextRequest } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const sb = await supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return Response.json({ error: "Not signed in." }, { status: 401 });

  const id = new URL(req.url).searchParams.get("id");

  // One thread: return its messages so a conversation can be reopened.
  if (id) {
    const { data, error } = await sb
      .from("messages")
      .select("role, content, language, sources, created_at")
      .eq("conversation_id", id)
      .order("created_at", { ascending: true })
      .limit(200);
    if (error) return Response.json({ error: "Could not load that chat." }, { status: 500 });
    return Response.json({ messages: data ?? [] });
  }

  const { data, error } = await sb
    .from("conversations")
    .select("id, title, updated_at")
    .order("updated_at", { ascending: false })
    .limit(50);
  if (error) return Response.json({ error: "Could not load your chats." }, { status: 500 });
  return Response.json({ conversations: data ?? [] });
}

export async function DELETE(req: NextRequest) {
  const sb = await supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return Response.json({ error: "Not signed in." }, { status: 401 });

  const id = new URL(req.url).searchParams.get("id");
  if (!id) return Response.json({ error: "id is required." }, { status: 400 });

  const { error } = await sb.from("conversations").delete().eq("id", id);
  if (error) return Response.json({ error: "Could not delete that chat." }, { status: 500 });
  return Response.json({ ok: true });
}
