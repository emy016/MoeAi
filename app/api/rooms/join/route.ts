/**
 * POST /api/rooms/join — a student joining a course.
 *
 * Looking a room up by its code has to run with elevated rights: the whole
 * point is that the student cannot see the room yet. So the lookup uses the
 * service role, and then only the minimum is revealed — title, subject,
 * teacher — and only for an exact code match. Nothing here lets anyone
 * enumerate rooms.
 */
import { NextRequest } from "next/server";
import { supabaseServer, supabaseAdmin } from "@/lib/supabase-server";
import { normaliseJoinCode, ROOM_LIMITS } from "@/lib/rooms";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const sb = await supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return Response.json({ error: "Sign in to join a room." }, { status: 401 });

  let body: { code?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Malformed request." }, { status: 400 });
  }

  const code = normaliseJoinCode(body.code ?? "");
  if (code.length !== 7) {
    return Response.json({ error: "That code doesn't look right. It's 6 characters." }, { status: 400 });
  }

  const admin = supabaseAdmin();
  const { data: room } = await admin
    .from("rooms")
    .select("id, title, subject, join_policy, archived, org_id")
    .eq("join_code", code)
    .maybeSingle();

  // Same answer for "no such code" and "archived", so the endpoint cannot be
  // used to discover which codes exist.
  if (!room || room.archived || room.join_policy === "invite") {
    return Response.json({ error: "No room with that code." }, { status: 404 });
  }

  const { count } = await admin
    .from("room_members")
    .select("user_id", { count: "exact", head: true })
    .eq("room_id", room.id);
  if ((count ?? 0) >= ROOM_LIMITS.membersPerRoom) {
    return Response.json({ error: "That room is full." }, { status: 413 });
  }

  const { error } = await admin
    .from("room_members")
    .upsert({ room_id: room.id, user_id: user.id, role: "student" }, { onConflict: "room_id,user_id" });
  if (error) return Response.json({ error: "Could not join that room." }, { status: 500 });

  // If the room belongs to an organisation, joining the room joins the org as
  // a student too, so the student sees its other rooms.
  if (room.org_id) {
    await admin
      .from("org_members")
      .upsert({ org_id: room.org_id, user_id: user.id, role: "student" }, { onConflict: "org_id,user_id" });
  }

  return Response.json({ ok: true, room: { id: room.id, title: room.title, subject: room.subject } });
}
