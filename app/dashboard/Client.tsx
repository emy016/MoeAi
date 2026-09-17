"use client";
/**
 * Dashboard — what MoeAI actually knows about this student, and what it
 * suggests doing next. Every number here comes from the database; nothing is
 * decorative.
 */
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { supabaseBrowser } from "@/lib/supabase-browser";

interface Stats {
  conversations: number; messages: number; documents: number; chunks: number;
  memory: number; misconceptions: number; quizzes: number;
  avg_score: number | null; active_days: number;
}
interface MemoryRow { id: string; kind: string; key: string; value: string; updated_at: string }
interface Nudge { id: string; kind: string; body: string; action_url: string | null }

const KIND_LABEL: Record<string, string> = {
  fact: "Fact",
  preference: "Preference",
  misconception: "Weak spot",
  goal: "Goal",
};

export default function Client() {
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [memory, setMemory] = useState<MemoryRow[]>([]);
  const [nudges, setNudges] = useState<Nudge[]>([]);

  const load = useCallback(async () => {
    const sb = supabaseBrowser();
    const [{ data: s }, mem, { data: n }] = await Promise.all([
      sb.rpc("dashboard_stats"),
      fetch("/api/memory").then((r) => (r.ok ? r.json() : { memory: [] })),
      sb.from("nudges").select("id, kind, body, action_url")
        .is("seen_at", null).order("created_at", { ascending: false }).limit(5),
    ]);
    setStats(s as Stats);
    setMemory(mem.memory ?? []);
    setNudges(n ?? []);
  }, []);

  useEffect(() => {
    supabaseBrowser().auth.getUser().then(({ data }) => {
      setSignedIn(!!data.user);
      if (data.user) load();
    });
  }, [load]);

  async function forget(id: string) {
    await fetch(`/api/memory?id=${id}`, { method: "DELETE" });
    setMemory((m) => m.filter((x) => x.id !== id));
  }

  async function dismiss(id: string) {
    await supabaseBrowser().from("nudges")
      .update({ seen_at: new Date().toISOString() }).eq("id", id);
    setNudges((n) => n.filter((x) => x.id !== id));
  }

  if (signedIn === false) {
    return (
      <section className="card" style={{ textAlign: "center", padding: "48px 24px" }}>
        <h1>Dashboard</h1>
        <p>Sign in to see your progress and what MoeAI remembers about you.</p>
        <Link className="btn btn-primary" href="/login">Sign in</Link>
      </section>
    );
  }

  const tiles: [string, string | number][] = stats
    ? [
        ["Questions asked", stats.messages],
        ["Chats", stats.conversations],
        ["Documents indexed", stats.documents],
        ["Searchable parts", stats.chunks],
        ["Quizzes taken", stats.quizzes],
        ["Average score", stats.avg_score !== null ? `${stats.avg_score}%` : "—"],
        ["Active days", stats.active_days],
        ["Weak spots tracked", stats.misconceptions],
      ]
    : [];

  return (
    <div className="stack">
      <section className="card">
        <h1>Your dashboard</h1>
        <p>What MoeAI has seen, and what it thinks you should look at next.</p>
      </section>

      {nudges.length > 0 && (
        <section className="card">
          <h2>Suggested next</h2>
          <ul className="nudges">
            {nudges.map((n) => (
              <li key={n.id}>
                <span dir="auto">{n.body}</span>
                <div className="row">
                  {n.action_url && <Link className="btn" href={n.action_url}>Open</Link>}
                  <button className="btn" onClick={() => dismiss(n.id)}>Dismiss</button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="grid">
        {!stats &&
          Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="skeleton" style={{ height: 92 }} />
          ))}
        {tiles.map(([label, value]) => (
          <article className="card tile" key={label}>
            <span className="value gradient-text">{value}</span>
            <span className="muted small">{label}</span>
          </article>
        ))}
      </section>

      <section className="card">
        <h2>What MoeAI remembers</h2>
        <p>
          This is the whole of it. Delete anything you would rather it forgot — it
          takes effect on your next message.
        </p>

        {memory.length === 0 && (
          <p className="muted">
            Nothing yet. MoeAI starts keeping notes once you have had a few real
            exchanges with it.
          </p>
        )}

        <ul className="mem">
          {memory.map((m) => (
            <li key={m.id}>
              <div>
                <span className={`tag ${m.kind}`}>{KIND_LABEL[m.kind] ?? m.kind}</span>
                <span dir="auto">{m.value}</span>
              </div>
              <button className="btn" onClick={() => forget(m.id)}>Forget</button>
            </li>
          ))}
        </ul>
      </section>

      <style jsx>{`
        .tile { display: grid; gap: 4px; align-content: center; }
        .value { font-size: 2rem; font-weight: 700; line-height: 1.1; }
        .small { font-size: 0.82rem; }
        .row { display: flex; gap: 8px; }

        .nudges, .mem { list-style: none; margin: 0; padding: 0; display: grid; gap: 10px; }
        .nudges li, .mem li {
          display: flex; align-items: center; justify-content: space-between; gap: 12px;
          padding: 12px 14px; border: 1px solid var(--border);
          border-radius: var(--radius-sm); background: var(--surface);
        }
        .mem li div { display: grid; gap: 4px; min-width: 0; }
        .tag {
          justify-self: start;
          font-size: 0.68rem; text-transform: uppercase; letter-spacing: 0.06em;
          padding: 2px 8px; border-radius: 999px;
          border: 1px solid var(--border); color: var(--text-muted);
        }
        .tag.misconception { border-color: rgba(244, 63, 94, 0.45); color: #fda4af; }
        .tag.goal { border-color: rgba(251, 191, 36, 0.45); color: #fcd34d; }
        .tag.preference { border-color: rgba(56, 189, 248, 0.45); color: #7dd3fc; }
      `}</style>
    </div>
  );
}
