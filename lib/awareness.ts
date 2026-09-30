import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * What is happening in a student's courses and when: the awareness system.
 *
 * Course staff add dated events in tutor mode (lectures, labs, quizzes,
 * assignments, exams, holidays). MoeAI gets a short block with today's date,
 * what is on today and this week, and what is due soon, so it can say "your
 * Logic Design quiz is on Sunday, want to revise flip-flops?" instead of
 * guessing. The app shows the same events on Home and in Assignments/Quizzes.
 */

export type CourseEvent = {
  id: string;
  org_id: string;
  course_id: string | null;
  kind: string;
  title: string;
  details: string | null;
  starts_at: string;
  ends_at: string | null;
  all_day: boolean;
  location: string | null;
  repeat_weekly_until: string | null;
  weight: string | null;
  material_id: string | null;
  course?: { code: string | null; title: string; code_verified?: boolean | null } | null;
};

/** One dated occurrence (a weekly lecture becomes one per week). */
export type Occurrence = CourseEvent & { at: string; end: string | null; occurrence: number };

export const EVENT_COLUMNS = "id, org_id, course_id, kind, title, details, starts_at, ends_at, all_day, location, repeat_weekly_until, weight, material_id, course:courses(code, title, code_verified)";

const WEEK = 7 * 24 * 3600 * 1000;

export function expand(events: CourseEvent[], from: Date, to: Date): Occurrence[] {
  const out: Occurrence[] = [];
  for (const e of events) {
    const start = new Date(e.starts_at).getTime();
    const length = e.ends_at ? new Date(e.ends_at).getTime() - start : null;
    const until = e.repeat_weekly_until ? new Date(`${e.repeat_weekly_until}T23:59:59Z`).getTime() : start;
    // Jump straight to the first week inside the window.
    let n = until > start && start < from.getTime() ? Math.max(0, Math.floor((from.getTime() - start) / WEEK)) : 0;
    for (let t = start + n * WEEK; t <= until && t <= to.getTime(); t += WEEK, n++) {
      const end = length != null ? t + length : null;
      if ((end ?? t) < from.getTime()) continue;
      out.push({ ...e, at: new Date(t).toISOString(), end: end != null ? new Date(end).toISOString() : null, occurrence: n });
      if (out.length > 2000) break;
    }
  }
  return out.sort((a, b) => a.at.localeCompare(b.at));
}

const courseLabel = (e: CourseEvent) => {
  const c = Array.isArray(e.course) ? e.course[0] : e.course;
  if (!c) return "";
  return c.code_verified && c.code ? `${c.code} ${c.title}` : c.title;
};

const KIND_WORD: Record<string, string> = {
  lecture: "Lecture", lab: "Lab", tutorial: "Tutorial", assignment: "Assignment due", quiz: "Quiz", midterm: "Midterm",
  final: "Final exam", project: "Project due", deadline: "Deadline", holiday: "Holiday", announcement: "Announcement", other: "",
};

/** The events of every course this account can read, with their courses. */
export async function readableEvents(sb: SupabaseClient, from: Date, to: Date): Promise<CourseEvent[]> {
  // RLS decides which rows come back: enrolled courses, the whole university's events, or everything for staff.
  const { data } = await sb
    .from("course_events")
    .select(EVENT_COLUMNS)
    .lte("starts_at", to.toISOString())
    .or(`starts_at.gte.${from.toISOString()},repeat_weekly_until.gte.${from.toISOString().slice(0, 10)},ends_at.gte.${from.toISOString()}`)
    .order("starts_at")
    .limit(1000);
  return (data ?? []) as unknown as CourseEvent[];
}

function localParts(iso: string, tzOffsetMinutes: number) {
  // tzOffsetMinutes is the browser's getTimezoneOffset(): minutes BEHIND UTC (Cairo = -180).
  const d = new Date(new Date(iso).getTime() - tzOffsetMinutes * 60000);
  return d;
}

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

function when(iso: string, allDay: boolean, tz: number, now: Date): string {
  const d = localParts(iso, tz);
  const today = localParts(now.toISOString(), tz);
  const dayDiff = Math.round((Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) - Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate())) / 86400000);
  const rel = dayDiff === 0 ? "today" : dayDiff === 1 ? "tomorrow" : dayDiff === -1 ? "yesterday" : dayDiff > 1 ? `in ${dayDiff} days` : `${-dayDiff} days ago`;
  const date = `${DAYS[d.getUTCDay()]} ${d.getUTCDate()} ${MONTHS[d.getUTCMonth()].slice(0, 3)}`;
  const time = allDay ? "" : ` ${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`;
  return `${date}${time} (${rel})`;
}

/**
 * The prompt block. Null when the student has no dated events, so a course
 * without a calendar costs nothing.
 */
export async function awarenessBlock(sb: SupabaseClient, tzOffsetMinutes = -180, now = new Date()): Promise<string | null> {
  const from = new Date(now.getTime() - 3 * 86400000);
  const to = new Date(now.getTime() + 28 * 86400000);
  const occ = expand(await readableEvents(sb, from, to), from, to);
  const local = localParts(now.toISOString(), tzOffsetMinutes);
  const header = `# RIGHT NOW\nToday is ${DAYS[local.getUTCDay()]} ${local.getUTCDate()} ${MONTHS[local.getUTCMonth()]} ${local.getUTCFullYear()}, ${String(local.getUTCHours()).padStart(2, "0")}:${String(local.getUTCMinutes()).padStart(2, "0")} the student's time.`;
  if (!occ.length) return header;

  const line = (o: Occurrence) => {
    const bits = [
      `- ${KIND_WORD[o.kind] ?? o.kind}${KIND_WORD[o.kind] ? ": " : ""}${o.title}`,
      courseLabel(o) ? `[${courseLabel(o)}]` : "",
      when(o.at, o.all_day, tzOffsetMinutes, now),
      o.location ? `at ${o.location}` : "",
      o.weight ? `(${o.weight})` : "",
    ].filter(Boolean).join(" ");
    return o.details ? `${bits}\n  ${o.details.replace(/\s+/g, " ").slice(0, 240)}` : bits;
  };
  const nowMs = now.getTime();
  const past = occ.filter((o) => new Date(o.end ?? o.at).getTime() < nowMs && !["lecture", "lab", "tutorial"].includes(o.kind)).slice(-4);
  const soon = occ.filter((o) => new Date(o.end ?? o.at).getTime() >= nowMs);
  const assessments = soon.filter((o) => !["lecture", "lab", "tutorial"].includes(o.kind)).slice(0, 14);
  const classes = soon.filter((o) => ["lecture", "lab", "tutorial"].includes(o.kind) && new Date(o.at).getTime() < nowMs + 7 * 86400000).slice(0, 14);

  return [
    header,
    "The course staff's calendar is below: use it. Mention a deadline or quiz when it is relevant or close (within about 3 days), offer to help prepare, and never invent dates that are not listed. If the student asks what is due, answer from this list.",
    assessments.length ? `\n## Coming up (quizzes, assignments, exams)\n${assessments.map(line).join("\n")}` : "\n## Coming up\nNothing scheduled in the next four weeks.",
    classes.length ? `\n## Classes in the next 7 days\n${classes.map(line).join("\n")}` : "",
    past.length ? `\n## Just happened\n${past.map(line).join("\n")}` : "",
  ].filter(Boolean).join("\n");
}
