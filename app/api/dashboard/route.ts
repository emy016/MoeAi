/**
 * /api/dashboard — the numbers behind the dashboard.
 *
 * The ported page ships with plausible-looking placeholders (8 courses, 23
 * lectures, 1,240 XP). Those were fine for a design mock and are indefensible
 * in front of a student who has actually done the work, so this returns what
 * really happened.
 */
import { supabaseServer } from "@/lib/supabase-server";

export const runtime = "nodejs";

/**
 * XP is a presentation of effort, so it should be made of things the student
 * actually did rather than a number that only goes up on its own.
 */
const XP_PER_LECTURE = 20;
const XP_PER_QUIZ_POINT = 1;   // a 100% quiz is 100 XP
const XP_PER_RANKED_MATCH = 10;
const XP_PER_QUESTION_ASKED = 2;

export async function GET() {
  const sb = await supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return Response.json({ signedIn: false });

  const [courses, progress, attempts, ranked, stats, conversations] = await Promise.all([
    sb.from("courses").select("id, code, title, accent, order_index").order("order_index"),
    sb.from("progress").select("course_id, lesson_id, completed"),
    sb.from("quiz_attempts").select("score, created_at").order("created_at", { ascending: false }).limit(50),
    sb.from("ranked_profiles").select("rating, matches, achievements").eq("user_id", user.id).maybeSingle(),
    sb.rpc("dashboard_stats"),
    sb.from("conversations").select("title, updated_at").order("updated_at", { ascending: false }).limit(5),
  ]);

  const courseRows = courses.data ?? [];
  const progressRows = progress.data ?? [];
  const attemptRows = attempts.data ?? [];
  const rankedRow = ranked.data;
  const counts = (stats.data ?? {}) as Record<string, number>;

  const lecturesDone = progressRows.filter((p) => p.completed).length;
  const quizPoints = attemptRows.reduce((sum, a) => sum + (a.score ?? 0), 0);
  const achievements = Array.isArray(rankedRow?.achievements) ? rankedRow.achievements.length : 0;

  const xp =
    lecturesDone * XP_PER_LECTURE +
    Math.round(quizPoints) * XP_PER_QUIZ_POINT +
    (rankedRow?.matches ?? 0) * XP_PER_RANKED_MATCH +
    (counts.messages ?? 0) * XP_PER_QUESTION_ASKED;

  // Lecture counts per course, so each progress bar reflects real completion.
  const { data: lessonCounts } = await sb.from("lessons").select("id, course_id");
  const totalByCourse = new Map<string, number>();
  for (const l of lessonCounts ?? []) {
    totalByCourse.set(l.course_id, (totalByCourse.get(l.course_id) ?? 0) + 1);
  }
  const doneByCourse = new Map<string, number>();
  for (const p of progressRows) {
    if (p.completed && p.course_id) {
      doneByCourse.set(p.course_id, (doneByCourse.get(p.course_id) ?? 0) + 1);
    }
  }

  const courseProgress = courseRows.map((c) => {
    const total = totalByCourse.get(c.id) ?? 0;
    const done = doneByCourse.get(c.id) ?? 0;
    return {
      code: c.code,
      title: c.title,
      accent: c.accent,
      done,
      total,
      percent: total ? Math.round((done / total) * 100) : 0,
    };
  });

  const activity = [
    ...(conversations.data ?? []).map((c) => ({
      kind: "chat" as const,
      text: `Asked MoeAI about “${(c.title ?? "").slice(0, 48)}”`,
      at: c.updated_at,
    })),
    ...attemptRows.slice(0, 5).map((a) => ({
      kind: "quiz" as const,
      text: `Scored ${Math.round(a.score ?? 0)}% on a quiz`,
      at: a.created_at,
    })),
  ]
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
    .slice(0, 6);

  return Response.json({
    signedIn: true,
    stats: {
      courses: courseRows.length,
      lecturesDone,
      xp,
      achievements,
      questionsAsked: counts.messages ?? 0,
      documents: counts.documents ?? 0,
      misconceptions: counts.misconceptions ?? 0,
      rating: rankedRow?.rating ?? null,
    },
    courseProgress,
    activity,
  });
}
