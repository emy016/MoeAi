"use client";
/**
 * The MoeAI chat surface. Streams token-by-token from /api/moeai.
 *
 * States handled explicitly, because "it just hangs" is what a prototype looks
 * like: empty, loading, streaming, error, rate-limited, signed-out.
 */
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { supabaseBrowser } from "@/lib/supabase-browser";

interface Turn {
  role: "user" | "assistant";
  content: string;
  provider?: string;
  language?: string;
}

const STARTERS = [
  "مش فاهم الـ pointers",
  "msh fahem el recursion",
  "Explain Kirchhoff's laws simply",
  "3amelly quiz 3ala el logic gates",
];

export default function MoeAIPage() {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const conversationId = useRef<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    supabaseBrowser().auth.getUser().then(({ data }) => setSignedIn(!!data.user));
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [turns]);

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

      conversationId.current = res.headers.get("x-conversation-id") ?? conversationId.current;
      const provider = res.headers.get("x-provider") ?? undefined;
      const language = res.headers.get("x-language") ?? undefined;

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let acc = "";

      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        setTurns((t) => {
          const next = [...t];
          next[next.length - 1] = { role: "assistant", content: acc, provider, language };
          return next;
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setTurns((t) => t.slice(0, -1)); // drop the empty assistant bubble
    } finally {
      setBusy(false);
    }
  }

  if (signedIn === false) {
    return (
      <section className="card" style={{ textAlign: "center", padding: "48px 24px" }}>
        <h1>Talk to <span className="gradient-text">MoeAI</span></h1>
        <p>Sign in so MoeAI can remember your course, your level, and what you got wrong last time.</p>
        <Link className="btn btn-primary" href="/login">Sign in</Link>
      </section>
    );
  }

  return (
    <section className="chat">
      <header>
        <h1>MoeAI</h1>
        <p className="muted">
          Ask in Arabic, Franco, or English. It replies in whatever you used.
        </p>
      </header>

      <div className="log" role="log" aria-live="polite" aria-busy={busy}>
        {turns.length === 0 && (
          <div className="empty">
            <p>Nothing here yet. Try one of these:</p>
            <div className="starters">
              {STARTERS.map((s) => (
                <button key={s} className="btn" onClick={() => send(s)} dir="auto">
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {turns.map((t, i) => (
          <article key={i} className={t.role === "user" ? "turn user" : "turn ai"}>
            <div className="bubble bidi" dir="auto">
              {t.content || <span className="skeleton dots" aria-label="MoeAI is typing" />}
            </div>
            {t.role === "assistant" && t.provider && t.content && (
              <span className="meta">{t.provider} · {t.language}</span>
            )}
          </article>
        ))}

        {error && <p className="error" role="alert">{error}</p>}
        <div ref={endRef} />
      </div>

      <form
        className="composer"
        onSubmit={(e) => { e.preventDefault(); send(input); }}
      >
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

      <style jsx>{`
        .chat { display: flex; flex-direction: column; gap: 16px; min-height: 70dvh; }
        header h1 { margin-bottom: 4px; }

        .log {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 14px;
          overflow-y: auto;
          padding: 4px;
        }

        .empty { text-align: center; margin: auto 0; }
        .starters { display: flex; flex-wrap: wrap; gap: 8px; justify-content: center; }

        .turn { display: flex; flex-direction: column; gap: 4px; max-width: 78%; }
        .turn.user { align-self: flex-end; align-items: flex-end; }
        .turn.ai { align-self: flex-start; }

        .bubble {
          padding: 12px 16px;
          border-radius: var(--radius);
          border: 1px solid var(--border);
          background: var(--surface);
          line-height: 1.6;
          white-space: pre-wrap;
          word-break: break-word;
        }
        .turn.user .bubble { background: var(--surface-2); border-color: rgba(229, 55, 154, 0.3); }

        .meta { font-size: 0.7rem; color: var(--text-muted); padding-inline: 6px; }

        .dots { display: inline-block; width: 46px; height: 12px; }

        .error {
          color: #fda4af;
          background: rgba(244, 63, 94, 0.1);
          border: 1px solid rgba(244, 63, 94, 0.3);
          border-radius: var(--radius-sm);
          padding: 10px 14px;
          margin: 0;
        }

        .composer {
          position: sticky;
          bottom: 0;
          display: flex;
          gap: 10px;
          align-items: flex-end;
          padding: 10px;
          border: 1px solid var(--border);
          border-radius: var(--radius);
          background: rgba(14, 14, 23, 0.86);
          backdrop-filter: blur(18px);
          -webkit-backdrop-filter: blur(18px);
        }
        textarea {
          flex: 1;
          resize: none;
          max-height: 160px;
          background: transparent;
          border: 0;
          padding: 10px;
          line-height: 1.5;
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
