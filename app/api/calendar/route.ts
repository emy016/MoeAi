/**
 * /api/calendar — the course staff's calendar, for students and staff alike.
 *
 * GET returns dated occurrences (a weekly lecture becomes one per week) for
 * every course the account can read; `?raw=1` returns the stored events for
 * editing. POST creates, updates or deletes an event, or reads a pasted
 * schedule ("Quiz 2 LD Sunday 5 Oct 10am, Assignment 3 due Thursday...") into
 * draft events the staff member confirms. Who may write is RLS's call:
 * can_teach_course for a course, the university's owner for a university-wide
 * event.
 */
import { NextRequest } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";
import { sameOrigin } from "@/lib/rag/staff";
import { EVENT_COLUMNS, expand, readableEvents } from "@/lib/awareness";
import { completeChat, parseJsonBlock } from "@/lib/providers";

export const runtime = "nodejs";
export const maxDuration = 60;

const KINDS = ["lecture", "lab", "tutorial", "assignment", "quiz", "midterm", "final", "project", "deadline", "holiday", "announcement", "other"];
const UUID = /^[0-9a-f-]{36}$/i;
const fail = (status: number, error: string) => Response.json({ error }, { status });

type Draft = {
  course_id?: string | null; kind?: string; title?: string; details?: string | null; starts_at?: string; ends_at?: string | null;
  all_day?: boolean; location?: string | null; repeat_weekly_until?: string | null; weight?: string | null;
};

function clean(d: Draft): Draft | string {
  const out: Draft = {};
  if (d.kind !== undefined) { if (!KINDS.includes(String(d.kind))) return "Pick what kind of event this is."; out.kind = String(d.kind); }
  if (d.title !== undefined) { const t = String(d.title).trim(); if (!t || t.length > 200) return "Give the event a title."; out.title = t; }
  if (d.starts_at !== undefined) { const t = new Date(String(d.starts_at)); if (Number.isNaN(t.getTime())) return "Pick a date and time."; out.starts_at = t.toISOString(); }
  if (d.ends_at !== undefined) {
    if (d.ends_at === null || d.ends_at === "") out.ends_at = null;
    else { const t = new Date(String(d.ends_at)); if (Number.isNaN(t.getTime())) return "The end time is not a valid date."; out.ends_at = t.toISOString(); }
  }
  if (d.repeat_weekly_until !== undefined) out.repeat_weekly_until = d.repeat_weekly_until ? String(d.repeat_weekly_until).slice(0, 10) : null;
  if (d.details !== undefined) out.details = d.details ? String(d.details).slice(0, 4000) : null;
  if (d.location !== undefined) out.location = d.location ? String(d.location).slice(0, 200) : null;
  if (d.weight !== undefined) out.weight = d.weight ? String(d.weight).slice(0, 60) : null;
  if (d.all_day !== undefined) out.all_day = Boolean(d.all_day);
  if (d.course_id !== undefined) { if (d.course_id !== null && !UUID.test(String(d.course_id))) return "Pick a course."; out.course_id = d.course_id; }
  return out;
}

async function context() {
  const sb = await supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return null;
  const { data: member } = await sb.from("org_members").select("org_id, role").eq("user_id", user.id).eq("status", "active").limit(1).maybeSingle();
  return { sb, user, orgId: (member?.org_id as string | undefined) ?? null, role: (member?.role as string | undefined) ?? null };
}

export async function GET(req: NextRequest) {
  const ctx = await context();
  if (!ctx) return fail(401, "Sign in to see your calendar.");
  const params = req.nextUrl.searchParams;
  if (params.get("raw")) {
    let query = ctx.sb.from("course_events").select(EVENT_COLUMNS).order("starts_at", { ascending: true }).limit(1000);
    const course = params.get("course");
    if (course && UUID.test(course)) query = query.eq("course_id", course);
    const { data, error } = await query;
    if (error) return fail(500, error.message);
    return Response.json({ events: data ?? [] }, { headers: { "cache-control": "no-store" } });
  }
  const from = new Date(params.get("from") || Date.now() - 7 * 86400000);
  const to = new Date(params.get("to") || Date.now() + 90 * 86400000);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || to.getTime() - from.getTime() > 400 * 86400000) return fail(400, "Pick a shorter date range.");
  const occurrences = expand(await readableEvents(ctx.sb, from, to), from, to);
  return Response.json({ occurrences }, { headers: { "cache-control": "no-store" } });
}

export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return fail(403, "Request origin not allowed.");
  const ctx = await context();
  if (!ctx) return fail(401, "Your session expired. Sign in again.");
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") return fail(400, "Malformed request.");

  switch (body.action) {
    case "create": {
      if (!ctx.orgId) return fail(403, "Only university staff can add events.");
      const draft = clean(body.event ?? {});
      if (typeof draft === "string") return fail(400, draft);
      if (!draft.kind || !draft.title || !draft.starts_at) return fail(400, "An event needs a kind, a title and a date.");
      const { data, error } = await ctx.sb.from("course_events")
        .insert({ ...draft, org_id: ctx.orgId, course_id: draft.course_id ?? null, created_by: ctx.user.id })
        .select(EVENT_COLUMNS).single();
      if (error) return fail(error.code === "42501" ? 403 : 400, error.code === "42501" ? "Only this course's staff can add events to it." : error.message);
      return Response.json({ ok: true, event: data });
    }
    case "createMany": {
      if (!ctx.orgId) return fail(403, "Only university staff can add events.");
      const list = Array.isArray(body.events) ? body.events.slice(0, 200) : [];
      const rows = [];
      for (const e of list) {
        const d = clean(e);
        if (typeof d === "string") return fail(400, d);
        if (!d.kind || !d.title || !d.starts_at) return fail(400, "Every event needs a kind, a title and a date.");
        rows.push({ ...d, org_id: ctx.orgId, course_id: d.course_id ?? null, created_by: ctx.user.id });
      }
      if (!rows.length) return fail(400, "Nothing to add.");
      const { data, error } = await ctx.sb.from("course_events").insert(rows).select("id");
      if (error) return fail(error.code === "42501" ? 403 : 400, error.code === "42501" ? "Only course staff can add these events." : error.message);
      return Response.json({ ok: true, added: data?.length ?? 0 });
    }
    case "update": {
      if (!UUID.test(String(body.id ?? ""))) return fail(400, "Pick an event.");
      const patch = clean(body.patch ?? {});
      if (typeof patch === "string") return fail(400, patch);
      const { data, error } = await ctx.sb.from("course_events").update({ ...patch, updated_at: new Date().toISOString() }).eq("id", body.id).select(EVENT_COLUMNS).maybeSingle();
      if (error || !data) return fail(403, "Only this course's staff can change this event.");
      return Response.json({ ok: true, event: data });
    }
    case "delete": {
      if (!UUID.test(String(body.id ?? ""))) return fail(400, "Pick an event.");
      const { error, count } = await ctx.sb.from("course_events").delete({ count: "exact" }).eq("id", body.id);
      if (error || !count) return fail(403, "Only this course's staff can delete this event.");
      return Response.json({ ok: true });
    }
    case "parse": {
      // A pasted schedule into draft events. Nothing is saved until staff confirm.
      if (!ctx.orgId || !["teacher", "owner"].includes(ctx.role ?? "")) return fail(403, "Only university staff can import a schedule.");
      const text = String(body.text ?? "").trim().slice(0, 12000);
      if (text.length < 5) return fail(400, "Paste the schedule first.");
      const tz = Number.isFinite(Number(body.tzOffsetMinutes)) ? Number(body.tzOffsetMinutes) : -180;
      const { data: courses } = await ctx.sb.from("courses").select("id, code, title").eq("org_id", ctx.orgId).order("title");
      const now = new Date();
      const offset = -tz; // minutes ahead of UTC
      const sign = offset >= 0 ? "+" : "-";
      const zone = `${sign}${String(Math.floor(Math.abs(offset) / 60)).padStart(2, "0")}:${String(Math.abs(offset) % 60).padStart(2, "0")}`;
      const prompt = [
        `Today is ${now.toISOString().slice(0, 10)} (${["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"][now.getUTCDay()]}). Local time zone offset: ${zone}.`,
        "Courses (use the id of the matching course, or null for something that applies to everyone):",
        ...(courses ?? []).map((c) => `- ${c.id}: ${c.code} ${c.title}`),
        "",
        "Turn the schedule below into calendar events. Return JSON: {\"events\": [{",
        '  "course_id": "id or null", "kind": one of ' + KINDS.join("|") + ',',
        '  "title": "short, e.g. Quiz 2 or Assignment 3: Flip-flops", "details": "topics covered, rules, what to bring, or null",',
        '  "starts_at": "ISO 8601 with the local offset, e.g. 2026-10-05T10:00:00' + zone + '" (for a deadline: the due time; no time given: 23:59 for deadlines, 09:00 otherwise),',
        '  "ends_at": "ISO or null", "all_day": false, "location": "room or null", "weight": "e.g. 10% or null",',
        '  "repeat_weekly_until": "YYYY-MM-DD for a weekly lecture/lab/tutorial, or null"}]}',
        "Resolve relative dates (\"next Sunday\", \"week 5\") from today. Never invent events that are not in the text. Keep the schedule's own wording in titles.",
        "",
        "SCHEDULE:",
        text,
      ].join("\n");
      try {
        const { text: raw } = await completeChat([{ role: "system", content: "You convert university schedules into structured calendar events. Output only JSON." }, { role: "user", content: prompt }], { maxTokens: 6000, order: "gemini,groq,nvidia,openrouter" });
        const parsed = parseJsonBlock<{ events?: Draft[] }>(raw);
        const drafts = (parsed?.events ?? []).map((e) => clean(e)).filter((e): e is Draft => typeof e !== "string" && Boolean(e.kind && e.title && e.starts_at));
        const known = new Set((courses ?? []).map((c) => c.id));
        return Response.json({ drafts: drafts.map((d) => ({ ...d, course_id: d.course_id && known.has(d.course_id) ? d.course_id : null })) });
      } catch {
        return fail(503, "MoeAI could not read the schedule right now. Try again in a minute.");
      }
    }
    default:
      return fail(400, "Unknown action.");
  }
}
