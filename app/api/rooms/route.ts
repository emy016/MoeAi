/**
 * /api/rooms — course rooms.
 *
 * A room is one course's material plus the people allowed to study it. The
 * same object serves all three products: an organisation's course, a private
 * tutor's class, and a solo student's own shelf. Only the join policy and
 * whether it hangs off an organisation differ.
 *
 * Every read here is RLS-scoped, so a room the caller is not in simply does
 * not exist as far as this endpoint is concerned.
 */
import { NextRequest } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";
import { makeJoinCode, ROOM_LIMITS } from "@/lib/rooms";

export const runtime = "nodejs";

function fail(status: number, error: string) {
  return Response.json({ error }, { status });
}

/** Rooms the caller can study in, plus the organisations they belong to. */
export async function GET() {
  const sb = await supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return Response.json({ rooms: [], organizations: [], signedIn: false });

  const [{ data: rooms }, { data: orgs }] = await Promise.all([
    sb.rpc("my_rooms"),
    sb.from("organizations").select("id, name, slug, verified").eq("verified", true).limit(50),
  ]);

  return Response.json({
    signedIn: true,
    rooms: rooms ?? [],
    organizations: orgs ?? [],
  });
}

/** Create a room. The caller becomes its teacher. */
export async function POST(req: NextRequest) {
  const sb = await supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return fail(401, "Sign in to create a room.");

  let body: { title?: string; subject?: string; description?: string; orgId?: string; joinPolicy?: string };
  try {
    body = await req.json();
  } catch {
    return fail(400, "Malformed request.");
  }

  const title = (body.title ?? "").trim().slice(0, ROOM_LIMITS.titleChars);
  if (!title) return fail(422, "Give the room a title — usually the course name.");

  const { count } = await sb
    .from("rooms")
    .select("id", { count: "exact", head: true })
    .eq("owner_id", user.id)
    .eq("archived", false);
  if ((count ?? 0) >= ROOM_LIMITS.perTeacher) {
    return fail(413, `You already have ${ROOM_LIMITS.perTeacher} rooms. Archive one first.`);
  }

  const policy = ["open", "code", "invite"].includes(body.joinPolicy ?? "")
    ? (body.joinPolicy as "open" | "code" | "invite")
    : "code";

  // Only let a room hang off an organisation the caller actually belongs to,
  // otherwise anyone could plant a room under a verified university's name.
  let orgId: string | null = null;
  if (body.orgId) {
    const { data: membership } = await sb
      .from("org_members")
      .select("org_id")
      .eq("org_id", body.orgId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (!membership) return fail(403, "You are not a member of that organisation.");
    orgId = body.orgId;
  }

  const { data: room, error } = await sb
    .from("rooms")
    .insert({
      owner_id: user.id,
      org_id: orgId,
      title,
      subject: (body.subject ?? "").trim().slice(0, 60) || null,
      description: (body.description ?? "").trim().slice(0, 500) || null,
      join_policy: policy,
      join_code: policy === "invite" ? null : makeJoinCode(),
    })
    .select("id, title, subject, join_policy, join_code")
    .single();

  if (error || !room) return fail(500, "Could not create that room.");

  await sb.from("room_members").insert({ room_id: room.id, user_id: user.id, role: "teacher" });

  return Response.json({ room });
}

/** Archive a room. Rows are kept so students keep their history. */
export async function DELETE(req: NextRequest) {
  const sb = await supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return fail(401, "Not signed in.");

  const id = new URL(req.url).searchParams.get("id");
  if (!id) return fail(400, "id is required.");

  const { error } = await sb.from("rooms").update({ archived: true }).eq("id", id);
  if (error) return fail(500, "Could not archive that room.");
  return Response.json({ ok: true });
}
