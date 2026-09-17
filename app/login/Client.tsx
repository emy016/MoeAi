"use client";
// Magic-link sign-in. No passwords to leak, no reset flow to build.
import { useState } from "react";
import { supabaseBrowser } from "@/lib/supabase-browser";

export default function Client() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [message, setMessage] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setState("sending");
    const { error } = await supabaseBrowser().auth.signInWithOtp({
      email: email.trim(),
      // PKCE links carry a code that must be exchanged for a session before any
      // page can see the user; /auth/callback does that, then forwards on.
      options: { emailRedirectTo: `${window.location.origin}/auth/callback?next=/moeai` },
    });
    if (error) {
      setState("error");
      setMessage("Could not send the link. Check the address and try again.");
    } else {
      setState("sent");
      setMessage("Check your inbox. The link signs you straight in.");
    }
  }

  return (
    <section className="card" style={{ maxWidth: 440, margin: "48px auto" }}>
      <h1>Sign in</h1>
      <p>We send a one-time link. No password to forget.</p>

      <form onSubmit={submit} style={{ display: "grid", gap: 12 }}>
        <label htmlFor="email">University or personal email</label>
        <input
          id="email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          style={{
            padding: "12px 14px",
            borderRadius: "var(--radius-sm)",
            border: "1px solid var(--border)",
            background: "var(--surface)",
          }}
        />
        <button className="btn btn-primary" type="submit" disabled={state === "sending"}>
          {state === "sending" ? "Sending…" : "Send me a link"}
        </button>
      </form>

      {message && (
        <p role="status" style={{ marginTop: 14, color: state === "error" ? "#fda4af" : undefined }}>
          {message}
        </p>
      )}
    </section>
  );
}
