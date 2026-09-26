/**
 * /api/quiz/report — record an attempt at one of the page's own quizzes.
 *
 * The quizzes page ships question banks written for one university syllabus. Those
 * attempts matter as much as the AI-generated ones, and they are the cleanest
 * misconception signal the product ever gets: a student picking the wrong
 * option is a specific, observed gap rather than something inferred from chat.
 *
 * Those gaps land in student_memory, which means MoeAI brings them up later
 * and the daily job can schedule them for revision.
 */
import { NextRequest } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";

export const runtime = "nodejs";

const MAX_MISSED_RECORDED = 5;

interface Missed {
  question?: string;
  correct?: string;
  topic?: string;
}

export async function POST(req: NextRequest) {
  const sb = await supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  // Signed-out students still get their quiz; it just is not remembered.
  if (!user) return Response.json({ ok: true, recorded: false });

  let body: {
    topic?: string;
    score?: number;
    correct?: number;
    total?: number;
    seconds?: number;
    missed?: Missed[];
  };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Malformed request." }, { status: 400 });
  }

  const score = Math.min(Math.max(Number(body.score) || 0, 0), 100);
  const total = Math.min(Math.max(Number(body.total) || 0, 0), 200);
  const correct = Math.min(Math.max(Number(body.correct) || 0, 0), total);

  const { error } = await sb.from("quiz_attempts").insert({
    user_id: user.id,
    quiz_id: null,
    source: "builtin",
    topic: String(body.topic || "").slice(0, 120),
    score,
    correct,
    total,
    seconds: Math.min(Math.max(Number(body.seconds) || 0, 0), 24 * 3600),
    answers: null,
  });
  if (error) return Response.json({ error: "Could not record that attempt." }, { status: 500 });

  // Each wrong answer becomes a durable note. The key is derived from the
  // question so retaking the same quiz updates the note instead of piling up
  // near-duplicates.
  const missed = Array.isArray(body.missed) ? body.missed.slice(0, MAX_MISSED_RECORDED) : [];
  if (missed.length) {
    const rows = missed
      .filter((m) => m && m.question)
      .map((m) => {
        const question = String(m.question).slice(0, 220);
        const slug = question.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 60);
        return {
          user_id: user.id,
          kind: "misconception" as const,
          key: `quiz.${String(m.topic || "general").toLowerCase().slice(0, 30)}.${slug}`,
          value: `Got this wrong in a quiz: "${question}" — the correct answer is "${
            String(m.correct || "").slice(0, 180)
          }".`,
          updated_at: new Date().toISOString(),
        };
      });

    if (rows.length) {
      await sb.from("student_memory").upsert(rows, { onConflict: "user_id,key" });
    }
  }

  return Response.json({ ok: true, recorded: true, missed: missed.length });
}
