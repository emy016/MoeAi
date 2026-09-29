"use client";
import { useState } from "react";
import { Logo } from "@/components/brand/Logo";

export default function Client({ code }: { code: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState<{ org: string; courses: number } | null>(null);

  async function join() {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/join", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ code }) });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || "That did not work. Try again.");
      setDone({ org: body.org, courses: body.courses });
    } catch (err) {
      setError(err instanceof Error ? err.message : "That did not work. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="org-page">
      <div className="org-wrap">
        <section className="org-card">
          <div className="org-head">
            <Logo size={40} />
            <div>
              <h1>{done ? "You're in" : "Join your class"}</h1>
              <p>{done ? `${done.org} · ${done.courses} courses` : "MoeAI will answer from your lecturers' material."}</p>
            </div>
          </div>
          {done ? (
            <a className="org-btn" href="/moeai" style={{ display: "block", textAlign: "center", textDecoration: "none" }}>Open MoeAI</a>
          ) : (
            <>
              {error ? <p className="org-error" role="alert">{error}</p> : null}
              <button className="org-btn" type="button" onClick={join} disabled={busy}>{busy ? "Joining…" : "Join"}</button>
            </>
          )}
        </section>
      </div>
    </main>
  );
}
