"use client";
/**
 * Quizzes generated from the student's own material.
 *
 * The generation step is what makes this different from a question bank: the
 * questions come from the lectures in your library, so revising them is
 * revising your actual syllabus.
 */
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { supabaseBrowser } from "@/lib/supabase-browser";

interface QuizRow { id: string; title: string; topic: string; created_at: string }
interface Question { id: string; idx: number; stem: string; options: string[] }
interface Result {
  id: string; correct: boolean; chosen: number | null; answer_idx: number; explanation: string | null;
}

export default function Client() {
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [quizzes, setQuizzes] = useState<QuizRow[]>([]);
  const [topic, setTopic] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [active, setActive] = useState<{ title: string; questions: Question[] } | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [results, setResults] = useState<Result[] | null>(null);
  const [score, setScore] = useState<number | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/quiz");
    if (!res.ok) return;
    const json = await res.json();
    setQuizzes(json.quizzes ?? []);
  }, []);

  useEffect(() => {
    supabaseBrowser().auth.getUser().then(({ data }) => {
      setSignedIn(!!data.user);
      if (data.user) load();
    });
  }, [load]);

  async function generate(e: React.FormEvent) {
    e.preventDefault();
    if (!topic.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/quiz", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ topic }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Could not generate a quiz.");
      setTopic("");
      await load();
      await open(json.quizId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not generate a quiz.");
    } finally {
      setBusy(false);
    }
  }

  async function open(id: string) {
    setError(null);
    setResults(null);
    setScore(null);
    setAnswers({});
    const res = await fetch(`/api/quiz/attempt?id=${id}`);
    if (!res.ok) { setError("Could not open that quiz."); return; }
    const json = await res.json();
    setActiveId(id);
    setActive({ title: json.quiz.title, questions: json.questions });
  }

  async function submit() {
    if (!activeId || !active) return;
    setBusy(true);
    try {
      const res = await fetch("/api/quiz/attempt", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ quizId: activeId, answers }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Could not submit.");
      setResults(json.results);
      setScore(json.score);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not submit.");
    } finally {
      setBusy(false);
    }
  }

  if (signedIn === false) {
    return (
      <section className="card" style={{ textAlign: "center", padding: "48px 24px" }}>
        <h1>Quizzes</h1>
        <p>Sign in to generate practice questions from your own material.</p>
        <Link className="btn btn-primary" href="/login">Sign in</Link>
      </section>
    );
  }

  const resultFor = (id: string) => results?.find((r) => r.id === id);
  const answered = active ? Object.keys(answers).length : 0;

  return (
    <div className="stack">
      <section className="card">
        <h1>Quizzes</h1>
        <p>
          Questions written from the lectures in your library — not from a generic bank.
          Name a topic and MoeAI builds five questions out of the material you have.
        </p>
        <form onSubmit={generate} className="row">
          <input
            value={topic}
            dir="auto"
            onChange={(e) => setTopic(e.target.value)}
            placeholder="Topic — e.g. pointers, Kirchhoff's laws, truth tables"
          />
          <button className="btn btn-primary" disabled={busy || !topic.trim()}>
            {busy ? "Writing…" : "Generate"}
          </button>
        </form>
        {error && <p className="err" role="alert">{error}</p>}
        <p className="muted small">
          Nothing in your library yet? <Link href="/library">Add a lecture first.</Link>
        </p>
      </section>

      {active && (
        <section className="card">
          <h2 dir="auto">{active.title}</h2>

          {score !== null && (
            <p className={score >= 60 ? "ok big" : "err big"} role="status">
              {score}% — {results?.filter((r) => r.correct).length} of {results?.length} correct
            </p>
          )}

          <ol className="qs">
            {active.questions.map((q) => {
              const r = resultFor(q.id);
              return (
                <li key={q.id}>
                  <p dir="auto" className="stem">{q.stem}</p>
                  <div className="opts">
                    {q.options.map((opt, i) => {
                      const chosen = answers[q.id] === i;
                      let cls = "opt";
                      if (r) {
                        if (i === r.answer_idx) cls += " right";
                        else if (chosen) cls += " wrong";
                      } else if (chosen) cls += " chosen";
                      return (
                        <button
                          key={i}
                          type="button"
                          className={cls}
                          dir="auto"
                          disabled={!!results}
                          onClick={() => setAnswers((a) => ({ ...a, [q.id]: i }))}
                        >
                          {opt}
                        </button>
                      );
                    })}
                  </div>
                  {r?.explanation && <p className="muted small expl" dir="auto">{r.explanation}</p>}
                </li>
              );
            })}
          </ol>

          {!results ? (
            <button
              className="btn btn-primary"
              onClick={submit}
              disabled={busy || answered < active.questions.length}
            >
              {answered < active.questions.length
                ? `Answer all ${active.questions.length} to submit`
                : "Submit"}
            </button>
          ) : (
            <div className="row">
              <button className="btn" onClick={() => open(activeId!)}>Try again</button>
              <Link className="btn btn-primary" href="/moeai">Ask MoeAI about what you missed</Link>
            </div>
          )}
        </section>
      )}

      <section className="card">
        <h2>Your quizzes</h2>
        {quizzes.length === 0 && <p>None yet. Generate one above.</p>}
        <ul className="list">
          {quizzes.map((q) => (
            <li key={q.id}>
              <span dir="auto">{q.title}</span>
              <button className="btn" onClick={() => open(q.id)}>Take it</button>
            </li>
          ))}
        </ul>
      </section>

      <style jsx>{`
        .row { display: flex; gap: 10px; flex-wrap: wrap; align-items: center; }
        input {
          flex: 1; min-width: 220px; padding: 12px 14px;
          border-radius: var(--radius-sm); border: 1px solid var(--border);
          background: var(--surface);
        }
        .err { color: #fda4af; }
        .ok { color: #86efac; }
        .big { font-size: 1.15rem; font-weight: 600; }
        .small { font-size: 0.82rem; }

        .qs { display: grid; gap: 22px; padding-inline-start: 20px; margin: 16px 0 20px; }
        .stem { color: var(--text); margin-bottom: 10px; font-weight: 500; }
        .opts { display: grid; gap: 8px; }
        .opt {
          text-align: start; padding: 11px 14px;
          border: 1px solid var(--border); border-radius: var(--radius-sm);
          background: var(--surface); cursor: pointer;
          transition: background 0.15s ease, border-color 0.15s ease;
        }
        .opt:hover:not(:disabled) { background: var(--surface-2); }
        .opt.chosen { border-color: var(--accent-2); background: var(--surface-2); }
        .opt.right { border-color: #4ade80; background: rgba(74, 222, 128, 0.12); }
        .opt.wrong { border-color: #f43f5e; background: rgba(244, 63, 94, 0.12); }
        .opt:disabled { cursor: default; }
        .expl { margin: 8px 0 0; }

        .list { list-style: none; margin: 0; padding: 0; display: grid; gap: 8px; }
        .list li {
          display: flex; align-items: center; justify-content: space-between; gap: 12px;
          padding: 11px 14px; border: 1px solid var(--border);
          border-radius: var(--radius-sm); background: var(--surface);
        }
      `}</style>
    </div>
  );
}
