/**
 * /api/quiz/attempt — fetch a quiz to take, or submit answers.
 *
 * The correct answers are never sent to the browser before submission;
 * a quiz you can read the answer key out of is not a quiz.
 */
import { NextRequest } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const sb = await supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return Response.json({ error: "Not signed in." }, { status: 401 });

  const id = new URL(req.url).searchParams.get("id");
  if (!id) return Response.json({ error: "id is required." }, { status: 400 });

  const { data: quiz } = await sb
    .from("quizzes")
    .select("id, title, topic")
    .eq("id", id)
    .maybeSingle();
  if (!quiz) return Response.json({ error: "Quiz not found." }, { status: 404 });

  const { data: questions } = await sb
    .from("quiz_questions")
    .select("id, idx, stem, options")   // deliberately no answer_idx
    .eq("quiz_id", id)
    .order("idx", { ascending: true });

  return Response.json({ quiz, questions: questions ?? [] });
}

export async function POST(req: NextRequest) {
  const sb = await supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return Response.json({ error: "Not signed in." }, { status: 401 });

  let body: { quizId?: string; answers?: Record<string, number> };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Malformed request." }, { status: 400 });
  }

  const quizId = body.quizId;
  const answers = body.answers ?? {};
  if (!quizId) return Response.json({ error: "quizId is required." }, { status: 400 });

  const { data: questions } = await sb
    .from("quiz_questions")
    .select("id, idx, stem, options, answer_idx, explanation")
    .eq("quiz_id", quizId)
    .order("idx", { ascending: true });

  if (!questions?.length) return Response.json({ error: "Quiz not found." }, { status: 404 });

  const results = questions.map((q) => ({
    id: q.id,
    correct: answers[q.id] === q.answer_idx,
    chosen: answers[q.id] ?? null,
    answer_idx: q.answer_idx,
    explanation: q.explanation,
  }));

  const score = Math.round((results.filter((r) => r.correct).length / results.length) * 100);

  await sb.from("quiz_attempts").insert({
    quiz_id: quizId,
    user_id: user.id,
    score,
    answers,
  });

  // A wrong answer is the clearest misconception signal MoeAI ever gets.
  const wrong = results.filter((r) => !r.correct);
  if (wrong.length) {
    const byId = new Map(questions.map((q) => [q.id, q]));
    await sb.from("student_memory").upsert(
      wrong.slice(0, 3).map((r) => {
        const q = byId.get(r.id)!;
        return {
          user_id: user.id,
          kind: "misconception" as const,
          key: `quiz.${quizId}.${q.idx}`,
          value: `Got this wrong: ${String(q.stem).slice(0, 200)} — correct answer: ${
            String(q.options[q.answer_idx]).slice(0, 150)
          }`,
          updated_at: new Date().toISOString(),
        };
      }),
      { onConflict: "user_id,key" },
    );
  }

  return Response.json({ score, results });
}
