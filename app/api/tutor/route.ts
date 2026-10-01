/**
 * /api/tutor — tutor mode in the MoeAI app, for course staff and the
 * university's managers.
 *
 * GET ?view=overview: the university, and every course this account teaches
 *   with its material, passages, course map and simulator counts.
 * GET ?view=people: every member with usage, the last two weeks of messages,
 *   and the class join links (owners only).
 * POST: manage people (status, role, courses), join links, the RAG model's
 *   passages (search as MoeAI would, browse, delete), the course map's
 *   overview, and a signed upload URL so a file goes from the phone straight
 *   to storage.
 *
 * Every rule is enforced in Postgres (RLS and owner-checked functions); this
 * route shapes requests and turns refusals into sentences.
 */
import { NextRequest } from "next/server";
import { randomBytes } from "node:crypto";
import { supabaseServer } from "@/lib/supabase-server";
import { errorMessage, sameOrigin, staffFor } from "@/lib/rag/staff";
import { retrieve } from "@/lib/rag/retrieve";

export const runtime = "nodejs";
export const maxDuration = 30;

const UUID = /^[0-9a-f-]{36}$/i;
const fail = (status: number, error: string) => Response.json({ error }, { status });

async function me() {
  const sb = await supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return null;
  const { data: member } = await sb.from("org_members").select("org_id, role, organizations(id, name, slug)").eq("user_id", user.id).eq("status", "active").in("role", ["teacher", "owner"]).limit(1).maybeSingle();
  if (!member) return { sb, user, org: null as null | { id: string; name: string }, role: null as string | null };
  const org = (Array.isArray(member.organizations) ? member.organizations[0] : member.organizations) as { id: string; name: string } | null;
  return { sb, user, org, role: member.role as string };
}

export async function GET(req: NextRequest) {
  const ctx = await me();
  if (!ctx) return fail(401, "Sign in as university staff.");
  if (!ctx.org) return fail(403, "Tutor mode is for university staff.");
  const view = req.nextUrl.searchParams.get("view") || "overview";

  if (view === "overview") {
    const { data: courses } = await ctx.sb.from("courses").select("id, code, code_verified, title, description, year, semester, accent").eq("org_id", ctx.org.id).order("year").order("title");
    const ids = (courses ?? []).map((c) => c.id);
    const [{ data: materials }, { data: chunks }, { data: brains }, { data: sims }, { data: events }] = await Promise.all([
      ctx.sb.from("course_materials").select("course_id, status").in("course_id", ids),
      ctx.sb.rpc("course_chunk_counts", { p_courses: ids }),
      ctx.sb.from("course_brain").select("course_id, updated_at").in("course_id", ids),
      ctx.sb.from("course_simulators").select("course_id, status").in("course_id", ids),
      ctx.sb.from("course_events").select("course_id, kind, starts_at").in("course_id", ids).gte("starts_at", new Date().toISOString()),
    ]);
    const counts = new Map(((chunks ?? []) as { course_id: string; chunks: number }[]).map((r) => [r.course_id, r.chunks]));
    return Response.json({
      org: ctx.org,
      role: ctx.role,
      courses: (courses ?? []).map((c) => {
        const mine = (materials ?? []).filter((m) => m.course_id === c.id);
        const s = (sims ?? []).filter((x) => x.course_id === c.id);
        return {
          ...c,
          files: mine.length,
          ready: mine.filter((m) => m.status === "ready").length,
          working: mine.filter((m) => m.status === "processing" || m.status === "queued").length,
          failed: mine.filter((m) => m.status === "failed").length,
          passages: counts.get(c.id) ?? 0,
          organizedAt: brains?.find((b) => b.course_id === c.id)?.updated_at ?? null,
          sims: s.filter((x) => x.status === "ready").length,
          simsPending: s.filter((x) => x.status === "planned" || x.status === "building" || x.status === "failed").length,
          upcoming: (events ?? []).filter((e) => e.course_id === c.id).length,
        };
      }),
    }, { headers: { "cache-control": "no-store" } });
  }

  if (view === "people") {
    if (ctx.role !== "owner") return fail(403, "Only the university's managers can see its people.");
    const [people, usage, codes, courses] = await Promise.all([
      ctx.sb.rpc("org_people", { p_org: ctx.org.id }),
      ctx.sb.rpc("org_usage", { p_org: ctx.org.id, p_days: 14 }),
      ctx.sb.from("org_join_codes").select("code, role, max_uses, uses, expires_at, active, created_at").eq("org_id", ctx.org.id).order("created_at", { ascending: false }),
      ctx.sb.from("courses").select("id, code, code_verified, title, year").eq("org_id", ctx.org.id).order("year").order("title"),
    ]);
    const origin = new URL(req.url).origin;
    return Response.json({
      org: ctx.org,
      people: people.data ?? [],
      usage: usage.data ?? [],
      courses: courses.data ?? [],
      codes: (codes.data ?? []).map((c) => ({ ...c, link: `${origin}/join/${c.code}` })),
    }, { headers: { "cache-control": "no-store" } });
  }
  if (view === "activity") {
    // What happened and when, never what a student wrote (org_activity hides chat text).
    if (ctx.role !== "owner") return fail(403, "Only the university's managers can see activity.");
    const user = req.nextUrl.searchParams.get("user");
    const [activity, health] = await Promise.all([
      ctx.sb.rpc("org_activity", { p_org: ctx.org.id, p_user: user && UUID.test(user) ? user : null, p_limit: 200 }),
      user ? Promise.resolve({ data: [] }) : ctx.sb.rpc("org_ai_health", { p_org: ctx.org.id }),
    ]);
    if (activity.error) return fail(500, activity.error.message);
    return Response.json({ activity: activity.data ?? [], health: health.data ?? [] }, { headers: { "cache-control": "no-store" } });
  }
  return fail(400, "Unknown view.");
}

export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return fail(403, "Request origin not allowed.");
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") return fail(400, "Malformed request.");
  const ctx = await me();
  if (!ctx) return fail(401, "Your session expired. Sign in again.");
  if (!ctx.org) return fail(403, "Tutor mode is for university staff.");
  const orgId = ctx.org.id;
  const owner = ctx.role === "owner";
  const needOwner = () => (owner ? null : fail(403, "Only the university's managers can do that."));

  switch (body.action) {
    case "status": {
      const denied = needOwner(); if (denied) return denied;
      if (!UUID.test(String(body.userId)) || !["active", "suspended", "removed"].includes(String(body.status))) return fail(400, "Malformed request.");
      const { error } = await ctx.sb.rpc("set_member_status", { p_org: orgId, p_user: body.userId, p_status: body.status });
      if (error) return fail(403, error.message.includes("yourself") ? "You cannot change your own account." : "That member could not be changed.");
      return Response.json({ ok: true });
    }
    case "role": {
      const denied = needOwner(); if (denied) return denied;
      if (!UUID.test(String(body.userId)) || !["student", "teacher"].includes(String(body.role))) return fail(400, "Malformed request.");
      const { error } = await ctx.sb.rpc("set_member_role", { p_org: orgId, p_user: body.userId, p_role: body.role });
      if (error) return fail(403, error.message.includes("yourself") ? "You cannot change your own role." : "That role could not be changed.");
      return Response.json({ ok: true });
    }
    case "courses": {
      const denied = needOwner(); if (denied) return denied;
      const courses = Array.isArray(body.courses) ? body.courses.filter((c: unknown) => UUID.test(String(c))) : null;
      if (!UUID.test(String(body.userId)) || !courses) return fail(400, "Malformed request.");
      const { error } = await ctx.sb.rpc("set_member_courses", { p_org: orgId, p_user: body.userId, p_courses: courses });
      if (error) return fail(403, "Those courses could not be saved.");
      return Response.json({ ok: true });
    }
    case "joinCreate": {
      const denied = needOwner(); if (denied) return denied;
      const role = body.role === "teacher" ? "teacher" : "student";
      const maxUses = Math.min(Math.max(Number(body.maxUses) || 300, 1), 5000);
      const days = Math.min(Math.max(Number(body.days) || 120, 1), 400);
      // Readable over a phone call, unguessable in practice: 30 bits from a 32-letter alphabet.
      const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
      const bytes = randomBytes(6);
      const code = `${role === "teacher" ? "ST" : "CS"}-${Array.from(bytes, (b) => alphabet[b % 32]).join("")}`;
      const { error } = await ctx.sb.from("org_join_codes").insert({ code, org_id: orgId, role, max_uses: maxUses, expires_at: new Date(Date.now() + days * 86400000).toISOString(), active: true });
      if (error) return fail(400, "The join link could not be created.");
      return Response.json({ ok: true, code, link: `${new URL(req.url).origin}/join/${code}` });
    }
    case "joinToggle": {
      const denied = needOwner(); if (denied) return denied;
      const { error, count } = await ctx.sb.from("org_join_codes").update({ active: Boolean(body.active) }, { count: "exact" }).eq("org_id", orgId).eq("code", String(body.code ?? ""));
      if (error || !count) return fail(400, "That join link could not be changed.");
      return Response.json({ ok: true });
    }
    case "passagesSearch": {
      const staff = await staffFor(body.courseId);
      if (staff instanceof Response) return staff;
      const q = String(body.q ?? "").trim().slice(0, 500);
      if (!q) return fail(400, "Type what a student would ask.");
      try {
        const passages = await retrieve(staff.sb, staff.course.id, q, Math.min(Number(body.count) || 8, 20));
        return Response.json({ passages });
      } catch (err) {
        return fail(500, errorMessage(err, "The search failed."));
      }
    }
    case "passagesList": {
      const staff = await staffFor(body.courseId);
      if (staff instanceof Response) return staff;
      if (!UUID.test(String(body.materialId))) return fail(400, "Pick a file.");
      const { data, error } = await staff.sb.from("course_chunks").select("id, idx, page, heading, content").eq("course_id", staff.course.id).eq("material_id", body.materialId).order("idx").limit(400);
      if (error) return fail(500, error.message);
      return Response.json({ passages: data ?? [] });
    }
    case "passageDelete": {
      const staff = await staffFor(body.courseId);
      if (staff instanceof Response) return staff;
      if (!UUID.test(String(body.id))) return fail(400, "Pick a passage.");
      const { error, count } = await staff.sb.from("course_chunks").delete({ count: "exact" }).eq("course_id", staff.course.id).eq("id", String(body.id));
      if (error || !count) return fail(403, "That passage could not be deleted.");
      return Response.json({ ok: true });
    }
    case "brainSave": {
      const staff = await staffFor(body.courseId);
      if (staff instanceof Response) return staff;
      const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
      if (typeof body.overview === "string") patch.overview = body.overview.slice(0, 8000);
      for (const key of ["outline", "formulas", "glossary", "mistakes", "practice"]) if (Array.isArray(body[key])) patch[key] = body[key].slice(0, 200);
      const { error, count } = await staff.sb.from("course_brain").update(patch, { count: "exact" }).eq("course_id", staff.course.id);
      if (error || !count) return fail(400, "Organize the course once before editing its map.");
      return Response.json({ ok: true });
    }
    case "uploadUrl": {
      const staff = await staffFor(body.courseId);
      if (staff instanceof Response) return staff;
      const path = String(body.path ?? "");
      if (!path.startsWith(`${staff.course.id}/`) || path.includes("..")) return fail(400, "Upload path does not belong to this course.");
      const { data, error } = await staff.sb.storage.from("course-files").createSignedUploadUrl(path, { upsert: true });
      if (error || !data) return fail(403, "Only this course's staff can upload to it.");
      return Response.json({ url: data.signedUrl, token: data.token, path: data.path });
    }
    default:
      return fail(400, "Unknown action.");
  }
}
