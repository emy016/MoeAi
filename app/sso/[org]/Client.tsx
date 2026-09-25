"use client";
/**
 * The university sign-in step.
 *
 * A demo stand-in, and it says so: in production the student lands on their
 * university's own identity provider and MoeAI never sees their password. The
 * shape is the same either way, university ID in, MoeAI session out, so the
 * rest of the product does not change when the real SSO is connected.
 */
import { useState } from "react";
import { Logo } from "@/components/brand/Logo";

type Org = { slug: string; name: string; short: string; idLabel: string; programs: { name: string; live: boolean }[] };

export default function Client({ org, next }: { org: Org; next: string }) {
  const [id, setId] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/sso", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ org: org.slug, id, password }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || "Sign-in failed. Try again.");
      // Staff go to the Organizer unless they were sent somewhere specific.
      window.location.href = body.role === "teacher" || body.role === "admin" ? (next === "/moeai" ? "/organizer" : next) : next;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign-in failed. Try again.");
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
              <h1>{org.short} sign-in</h1>
              <p>{org.name} · {org.programs.filter((p) => p.live).map((p) => p.name).join(", ")}</p>
            </div>
          </div>
          <form className="org-form" onSubmit={submit}>
            <label>
              {org.idLabel}
              <input className="org-input" inputMode="text" autoComplete="username" required value={id} onChange={(e) => setId(e.target.value)} placeholder="e.g. 20251938" />
            </label>
            <label>
              Password
              <input className="org-input" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
            </label>
            {error ? <p className="org-error" role="alert">{error}</p> : null}
            <button className="org-btn" type="submit" disabled={busy}>{busy ? "Signing in…" : "Sign in"}</button>
          </form>
        </section>
        <p className="org-demo">
          <strong>MoeAI demo sign-in.</strong> This page is run by MoeAI, not by {org.short}, and only accepts the demo
          accounts MoeAI issued for this pilot. Do not enter your real university password here. When {org.short} connects
          its own single sign-on, this step moves to the university&apos;s login page.
        </p>
      </div>
    </main>
  );
}
