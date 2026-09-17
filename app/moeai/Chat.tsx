"use client";
/**
 * The MoeAI chat client.
 *
 * Streams token by token, shows which material fed each answer, and keeps the
 * student's threads in a sidebar. Every state is handled explicitly, because
 * "it just hangs" is what a prototype looks like: empty, streaming, error,
 * rate-limited, signed-out, no-material.
 *
 * The page heading lives in the server component that renders this, so the
 * route has an H1 and a title without waiting for hydration.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { supabaseBrowser } from "@/lib/supabase-browser";

interface Source { source: string; ref: string; title: string }
interface Turn {
  role: "user" | "assistant";
  content: string;
  provider?: string;
  language?: string;
  sources?: Source[];
}
interface Thread { id: string; title: string; updated_at: string }

const STARTERS = [
  "مش فاهم الـ pointers",
  "msh fahem el recursion",
  "Explain Kirchhoff's laws simply",
  "e5tebrny fel logic gates",
];

const LANGUAGE_LABEL: Record<string, string> = {
  en: "English",
  ar: "عربي",
  ar_en: "عربي + EN",
  franco: "Franco",
  franco_en: "Franco + EN",
};

export default function Chat() {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [threads, setThreads] = useState<Thread[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [sidebar, setSidebar] = useState(false);
  const conversationId = useRef<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  const loadThreads = useCallback(async () => {
    const res = await fetch("/api/conversations");
    if (!res.ok) return;
    const json = await res.json();
    setThreads(json.conversations ?? []);
  }, []);

  useEffect(() => {
    supabaseBrowser().auth.getUser().then(({ data }) => {
      setSignedIn(!!data.user);
      if (data.user) loadThreads();
    });
  }, [loadThreads]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [turns]);

  async function openThread(id: string) {
    setSidebar(false);
    setError(null);
    const res = await fetch(`/api/conversations?id=${id}`);
    if (!res.ok) return;
    const json = await res.json();
    conversationId.current = id;
    setTurns(
      (json.messages ?? []).map((m: any) => ({
        role: m.role,
        content: m.content,
        language: m.language ?? undefined,
        sources: m.sources ?? undefined,
      })),
    );
  }

  function newChat() {
    conversationId.current = null;
    setTurns([]);
    setError(null);
    setSidebar(false);
  }

  async function deleteThread(id: string) {
    await fetch(`/api/conversations?id=${id}`, { method: "DELETE" });
    if (conversationId.current === id) newChat();
    await loadThreads();
  }

  async function send(text: string) {
    const message = text.trim();
    if (!message || busy) return;

    setError(null);
    setInput("");
    setTurns((t) => [...t, { role: "user", content: message }, { role: "assistant", content: "" }]);
    setBusy(true);

    try {
      const res = await fetch("/api/moeai", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ message, conversationId: conversationId.current }),
      });

      if (!res.ok || !res.body) {
        const { error: msg } = await res.json().catch(() => ({ error: null }));
        throw new Error(msg || "MoeAI is temporarily unavailable.");
      }

      const isNew = !conversationId.current;
      conversationId.current = res.headers.get("x-conversation-id") ?? conversationId.current;
      const provider = res.headers.get("x-provider") ?? undefined;
      const language = res.headers.get("x-language") ?? undefined;

      let sources: Source[] = [];
      try {
        sources = JSON.parse(decodeURIComponent(res.headers.get("x-sources") ?? "[]"));
      } catch { /* headers are best-effort; the answer still renders */ }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let acc = "";

      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        setTurns((t) => {
          const next = [...t];
          next[next.length - 1] = { role: "assistant", content: acc, provider, language, sources };
          return next;
        });
      }

      if (isNew) loadThreads();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setTurns((t) => t.slice(0, -1));
    } finally {
      setBusy(false);
    }
  }

  if (signedIn === null) {
    return <div className="skeleton" style={{ height: "60dvh", borderRadius: "var(--radius)" }} />;
  }

  if (signedIn === false) {
    return (
      <section className="card" style={{ textAlign: "center", padding: "40px 24px" }}>
        <p>Sign in so MoeAI can use your material and remember what you struggled with.</p>
        <Link className="btn btn-primary" href="/login">Sign in</Link>
      </section>
    );
  }

  return (
    <section className="wrap">
      <aside className={sidebar ? "side open" : "side"}>
        <button className="btn btn-primary" onClick={newChat}>New chat</button>
        <nav aria-label="Your chats">
          {threads.length === 0 && <p className="muted small">No chats yet.</p>}
          {threads.map((t) => (
            <div key={t.id} className={conversationId.current === t.id ? "thread on" : "thread"}>
              <button onClick={() => openThread(t.id)} dir="auto" title={t.title}>{t.title}</button>
              <button className="x" onClick={() => deleteThread(t.id)} aria-label={`Delete ${t.title}`}>
                ×
              </button>
            </div>
          ))}
        </nav>
        <Link className="btn" href="/library">Manage library</Link>
      </aside>

      <div className="chat">
        <header>
          <button className="btn toggle" onClick={() => setSidebar((v) => !v)}>Chats</button>
        </header>

        <div className="log" role="log" aria-live="polite" aria-busy={busy}>
          {turns.length === 0 && (
            <div className="empty">
              <p>Nothing here yet. Try one of these:</p>
              <div className="starters">
                {STARTERS.map((s) => (
                  <button key={s} className="btn" onClick={() => send(s)} dir="auto">{s}</button>
                ))}
              </div>
              <p className="muted small">
                MoeAI is strongest when it has your material.{" "}
                <Link href="/library">Add a lecture to your library</Link> and it will cite it.
              </p>
            </div>
          )}

          {turns.map((t, i) => (
            <article key={i} className={t.role === "user" ? "turn user" : "turn ai"}>
              <div className="bubble bidi" dir="auto">
                {t.content || <span className="skeleton dots" aria-label="MoeAI is typing" />}
              </div>

              {t.role === "assistant" && t.content && !!t.sources?.length && (
                <div className="sources">
                  <span className="muted small">Grounded in:</span>
                  {t.sources.map((s, j) => (
                    <span key={j} className={`chip ${s.source}`} dir="auto" title={s.title}>
                      {s.source === "library" ? "📕" : "🎓"} {s.title}
                    </span>
                  ))}
                </div>
              )}

              {t.role === "assistant" && t.content && t.provider && (
                <span className="meta">
                  {t.provider}
                  {t.language && ` · ${LANGUAGE_LABEL[t.language] ?? t.language}`}
                </span>
              )}
            </article>
          ))}

          {error && <p className="error" role="alert">{error}</p>}
          <div ref={endRef} />
        </div>

        <form className="composer" onSubmit={(e) => { e.preventDefault(); send(input); }}>
          <label className="sr-only" htmlFor="msg">Your message</label>
          <textarea
            id="msg"
            value={input}
            dir="auto"
            rows={1}
            placeholder="اسأل أي حاجة… / ask anything…"
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); }
            }}
          />
          <button className="btn btn-primary" type="submit" disabled={busy || !input.trim()}>
            {busy ? "…" : "Send"}
          </button>
        </form>
      </div>

      <style jsx>{`
        .wrap { display: grid; grid-template-columns: 1fr; gap: 16px; min-height: 74dvh; }
        @media (min-width: 900px) { .wrap { grid-template-columns: 240px 1fr; } }

        .side {
          display: none;
          flex-direction: column;
          gap: 10px;
          padding: 14px;
          border: 1px solid var(--border);
          border-radius: var(--radius);
          background: var(--surface);
          height: fit-content;
          max-height: 74dvh;
        }
        .side.open { display: flex; }
        @media (min-width: 900px) { .side { display: flex; } .toggle { display: none; } }

        nav { display: grid; gap: 4px; overflow-y: auto; flex: 1; }
        .thread { display: flex; align-items: center; gap: 4px; }
        .thread button:first-child {
          flex: 1; min-width: 0; text-align: left;
          padding: 8px 10px; border: 0; border-radius: var(--radius-sm);
          background: transparent; color: var(--text-muted);
          font-size: 0.85rem; cursor: pointer;
          overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
        }
        .thread button:first-child:hover { background: var(--surface-2); color: var(--text); }
        .thread.on button:first-child { background: var(--surface-2); color: var(--text); }
        .x {
          border: 0; background: transparent; color: var(--text-muted);
          cursor: pointer; padding: 4px 8px; border-radius: 6px; font-size: 1rem;
        }
        .x:hover { color: #fda4af; }

        .chat { display: flex; flex-direction: column; gap: 14px; min-height: 0; }
        header { display: flex; justify-content: flex-end; }
        @media (min-width: 900px) { header { display: none; } }

        .log { flex: 1; display: flex; flex-direction: column; gap: 14px; overflow-y: auto; padding: 4px; }
        .empty { text-align: center; margin: auto 0; display: grid; gap: 12px; }
        .starters { display: flex; flex-wrap: wrap; gap: 8px; justify-content: center; }

        .turn { display: flex; flex-direction: column; gap: 5px; max-width: 82%; }
        .turn.user { align-self: flex-end; align-items: flex-end; }
        .turn.ai { align-self: flex-start; }

        .bubble {
          padding: 12px 16px;
          border-radius: var(--radius);
          border: 1px solid var(--border);
          background: var(--surface);
          line-height: 1.65;
          white-space: pre-wrap;
          word-break: break-word;
        }
        .turn.user .bubble { background: var(--surface-2); border-color: rgba(229, 55, 154, 0.3); }

        .sources { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; padding-inline: 4px; }
        .chip {
          font-size: 0.72rem;
          padding: 3px 9px;
          border-radius: 999px;
          border: 1px solid var(--border);
          background: var(--surface);
          max-width: 260px;
          overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
        }
        .chip.library { border-color: rgba(56, 189, 248, 0.4); }
        .chip.curriculum { border-color: rgba(251, 191, 36, 0.4); }

        .meta { font-size: 0.7rem; color: var(--text-muted); padding-inline: 6px; }
        .dots { display: inline-block; width: 46px; height: 12px; }
        .small { font-size: 0.8rem; }

        .error {
          color: #fda4af;
          background: rgba(244, 63, 94, 0.1);
          border: 1px solid rgba(244, 63, 94, 0.3);
          border-radius: var(--radius-sm);
          padding: 10px 14px; margin: 0;
        }

        .composer {
          position: sticky; bottom: 0;
          display: flex; gap: 10px; align-items: flex-end;
          padding: 10px;
          border: 1px solid var(--border);
          border-radius: var(--radius);
          background: rgba(14, 14, 23, 0.88);
          backdrop-filter: blur(18px);
          -webkit-backdrop-filter: blur(18px);
        }
        textarea {
          flex: 1; resize: none; max-height: 160px;
          background: transparent; border: 0; padding: 10px; line-height: 1.5;
        }
        textarea:focus { outline: none; }

        .sr-only {
          position: absolute; width: 1px; height: 1px;
          padding: 0; margin: -1px; overflow: hidden;
          clip: rect(0 0 0 0); white-space: nowrap; border: 0;
        }
      `}</style>
    </section>
  );
}
