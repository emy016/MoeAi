"use client";
/**
 * Account settings: profile, sign-in methods, password, two-step
 * verification, security log, data export and deletion. Every change goes
 * through Supabase Auth or a database function that checks the caller; the
 * page never decides what someone is allowed to do.
 */
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Download, KeyRound, LogOut, ShieldCheck, Trash2 } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { supabaseBrowser } from "@/lib/supabase-browser";
import { normalizePhone, passwordProblem } from "@/lib/auth/validate";

type Me = { signedIn: boolean; email?: string | null; providers?: string[]; facts?: { profile?: { display_name: string | null; handle: string | null; phone: string | null } | null; memberships?: { org: string; role: string; status: string }[]; subscription?: { plan: string; status: string } | null } };
type Event = { kind: string; created_at: string; detail: Record<string, unknown> };

async function post(url: string, body: unknown): Promise<Record<string, unknown> & { error?: string }> {
  try {
    const res = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    const data = await res.json().catch(() => ({}));
    return res.ok ? data : { ...data, error: data.error || "Something went wrong. Try again." };
  } catch {
    return { error: "You seem to be offline." };
  }
}

const EVENT_LABEL: Record<string, string> = {
  sign_in: "Signed in", sign_out: "Signed out", sign_up: "Account created", password_changed: "Password changed",
  password_reset_requested: "Password reset link used", email_change_requested: "Email change requested", phone_change_requested: "Phone change requested",
  oauth_linked: "Sign-in method connected", oauth_unlinked: "Sign-in method removed", mfa_enrolled: "Two-step verification on",
  mfa_removed: "Two-step verification off", org_created: "Organization created", invitation_accepted: "Invitation accepted",
  subscription_changed: "Plan changed", account_export: "Data exported", onboarding_completed: "Setup finished",
};

function Section({ id, title, children }: { id?: string; title: string; children: React.ReactNode }) {
  return <section id={id} className="org-card st-card"><div className="org-section"><h2>{title}</h2>{children}</div></section>;
}

export default function Client() {
  const [me, setMe] = useState<Me | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [factors, setFactors] = useState<{ id: string; status: string; friendly_name?: string }[]>([]);
  const [msg, setMsg] = useState<Record<string, { tone: "ok" | "bad"; text: string }>>({});
  const say = (k: string, tone: "ok" | "bad", text: string) => setMsg((m) => ({ ...m, [k]: { tone, text } }));

  const load = useCallback(async () => {
    const r = await fetch("/api/onboarding", { cache: "no-store" }).then((x) => x.json()).catch(() => ({ signedIn: false }));
    setMe(r);
    const sb = supabaseBrowser();
    const [{ data: ev }, { data: f }] = await Promise.all([
      sb.from("auth_events").select("kind, created_at, detail").order("created_at", { ascending: false }).limit(15),
      sb.auth.mfa.listFactors(),
    ]);
    setEvents((ev as Event[]) ?? []);
    setFactors(((f?.totp ?? []) as { id: string; status: string; friendly_name?: string }[]));
  }, []);
  useEffect(() => { void load(); }, [load]);

  const p = me?.facts?.profile;
  const [profile, setProfile] = useState({ displayName: "", handle: "", phone: "" });
  useEffect(() => { if (p) setProfile({ displayName: p.display_name ?? "", handle: p.handle ?? "", phone: p.phone ?? "" }); }, [p]);
  const [pw, setPw] = useState({ current: "", password: "" });
  const [email, setEmail] = useState("");
  const [phoneCode, setPhoneCode] = useState({ phone: "", token: "", sent: false });
  const [enroll, setEnroll] = useState<{ id: string; qr: string; secret: string; code: string } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState("");

  if (!me) return <main className="org-page"><div className="org-wrap"><section className="org-card"><div className="org-row"><span className="st-spinner" /> Loading…</div></section></div></main>;
  const providers = me.providers ?? [];
  const hasPassword = providers.includes("email");

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    const r = await post("/api/onboarding", { action: "profile", displayName: profile.displayName, handle: profile.handle, phone: profile.phone ? normalizePhone(profile.phone) : "" });
    if (r.error) say("profile", "bad", r.error); else { say("profile", "ok", "Saved."); void load(); }
  };
  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const problem = passwordProblem(pw.password, me.email ?? "");
    if (problem) { say("password", "bad", problem); return; }
    const r = await post("/api/auth", { action: "password", current: pw.current, password: pw.password });
    if (r.error) say("password", "bad", r.error); else { say("password", "ok", "Password changed."); setPw({ current: "", password: "" }); }
  };
  const changeEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    const r = await post("/api/auth", { action: "email", email });
    say("email", r.error ? "bad" : "ok", (r.error || r.message) as string);
  };
  const phoneStep = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneCode.sent) {
      const r = await post("/api/auth", { action: "phone", phone: phoneCode.phone });
      if (r.error) say("phone", "bad", r.error); else { setPhoneCode((s) => ({ ...s, sent: true })); say("phone", "ok", r.message as string); }
    } else {
      const r = await post("/api/auth", { action: "phone-verify", phone: phoneCode.phone, token: phoneCode.token });
      if (r.error) say("phone", "bad", r.error); else { say("phone", "ok", "Phone verified."); setPhoneCode({ phone: "", token: "", sent: false }); void load(); }
    }
  };
  const link = async (provider: string) => {
    const r = await post("/api/auth", { action: "link", provider });
    if (r.url) window.location.assign(r.url as string); else say("methods", "bad", r.error || "Could not connect.");
  };
  const unlink = async (provider: string) => {
    const r = await post("/api/auth", { action: "unlink", provider });
    if (r.error) say("methods", "bad", r.error); else { say("methods", "ok", "Removed."); void load(); }
  };
  const startMfa = async () => {
    const sb = supabaseBrowser();
    const { data, error } = await sb.auth.mfa.enroll({ factorType: "totp", friendlyName: `Authenticator ${new Date().toLocaleDateString()}` });
    if (error || !data) { say("mfa", "bad", "Two-step verification is not switched on for MoeAI yet."); return; }
    setEnroll({ id: data.id, qr: data.totp.qr_code, secret: data.totp.secret, code: "" });
  };
  const verifyMfa = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!enroll) return;
    const sb = supabaseBrowser();
    const { error } = await sb.auth.mfa.challengeAndVerify({ factorId: enroll.id, code: enroll.code });
    if (error) { say("mfa", "bad", "That code is not right. Enter the current one."); return; }
    await sb.rpc("log_auth_event", { p_kind: "mfa_enrolled", p_detail: {} });
    setEnroll(null); say("mfa", "ok", "Two-step verification is on."); void load();
  };
  const removeMfa = async (id: string) => {
    const sb = supabaseBrowser();
    const { error } = await sb.auth.mfa.unenroll({ factorId: id });
    if (error) { say("mfa", "bad", "Verify with your authenticator first (sign out and back in), then remove it."); return; }
    await sb.rpc("log_auth_event", { p_kind: "mfa_removed", p_detail: {} });
    say("mfa", "ok", "Removed."); void load();
  };
  const signOut = async (everywhere: boolean) => {
    await post("/api/auth", { action: "logout", everywhere });
    window.location.assign("/start/signin");
  };
  const deleteAccount = async () => {
    const r = await post("/api/account", { action: "delete", confirm: confirmDelete });
    if (r.error) { say("delete", "bad", r.error); if (r.reauth) setTimeout(() => signOut(false), 2500); return; }
    window.location.assign("/?deleted=1");
  };
  const note = (k: string) => (msg[k] ? <p className={`st-status ${msg[k].tone}`} role={msg[k].tone === "bad" ? "alert" : "status"}>{msg[k].text}</p> : null);

  return (
    <main className="org-page">
      <div className="org-wrap" style={{ width: "min(100%, 620px)" }}>
        <div className="org-head" style={{ justifyContent: "space-between" }}>
          <div className="org-head"><Logo size={36} /><div><h1>Account</h1><p>{me.email}</p></div></div>
          <Link href="/moeai" className="st-back"><ArrowLeft size={15} aria-hidden="true" /> MoeAI</Link>
        </div>

        <Section id="plan" title="Profile and plan">
          <form className="org-form" onSubmit={saveProfile} style={{ marginTop: 8 }}>
            <div className="st-two">
              <label className="st-field">Display name<input className="org-input" value={profile.displayName} onChange={(e) => setProfile((s) => ({ ...s, displayName: e.target.value }))} /></label>
              <label className="st-field">Handle<input className="org-input" value={profile.handle} onChange={(e) => setProfile((s) => ({ ...s, handle: e.target.value.toLowerCase() }))} /></label>
            </div>
            {note("profile")}
            <button className="org-btn small" type="submit" style={{ justifySelf: "start" }}>Save profile</button>
          </form>
          {me.facts?.memberships?.length ? (
            <p className="org-muted" style={{ marginTop: 12 }}>Organizations: {me.facts.memberships.map((m) => `${m.org} (${m.role}${m.status !== "active" ? `, ${m.status}` : ""})`).join(", ")}</p>
          ) : null}
          <p className="org-muted">Plan: {me.facts?.subscription ? `${me.facts.subscription.plan.replace(/^student_/, "")} · ${me.facts.subscription.status}` : "none selected"} <Link href="/start/plans" style={{ textDecoration: "underline" }}>Change</Link></p>
        </Section>

        <Section title="Sign-in methods">
          <div className="org-list" style={{ marginTop: 8 }}>
            {(["google", "apple"] as const).map((prov) => (
              <div key={prov} className="org-item">
                <strong style={{ textTransform: "capitalize" }}>{prov}</strong>
                {providers.includes(prov)
                  ? <button className="org-btn ghost small" style={{ marginInlineStart: "auto" }} onClick={() => unlink(prov)}>Remove</button>
                  : <button className="org-btn ghost small" style={{ marginInlineStart: "auto" }} onClick={() => link(prov)}>Connect</button>}
              </div>
            ))}
            <div className="org-item"><strong>Email & password</strong><span className={`org-badge ${hasPassword ? "live" : ""}`}>{hasPassword ? "On" : "Not set"}</span></div>
          </div>
          {note("methods")}
        </Section>

        <Section title="Password">
          <form className="org-form" onSubmit={changePassword} style={{ marginTop: 8 }}>
            {hasPassword ? <label className="st-field">Current password<input className="org-input" type="password" autoComplete="current-password" value={pw.current} onChange={(e) => setPw((s) => ({ ...s, current: e.target.value }))} /></label> : null}
            <label className="st-field">New password<input className="org-input" type="password" autoComplete="new-password" value={pw.password} onChange={(e) => setPw((s) => ({ ...s, password: e.target.value }))} /></label>
            {note("password")}
            <button className="org-btn small" type="submit" style={{ justifySelf: "start" }}><KeyRound size={14} aria-hidden="true" /> {hasPassword ? "Change password" : "Set a password"}</button>
          </form>
        </Section>

        <Section title="Email and phone">
          <form className="org-form" onSubmit={changeEmail} style={{ marginTop: 8 }}>
            <label className="st-field">New email<input className="org-input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder={me.email ?? ""} /></label>
            {note("email")}
            <button className="org-btn ghost small" type="submit" style={{ justifySelf: "start" }}>Change email</button>
          </form>
          <form className="org-form" onSubmit={phoneStep}>
            <label className="st-field">Phone{p?.phone ? <span className="st-hint">Current: {p.phone}</span> : null}<input className="org-input" type="tel" value={phoneCode.phone} onChange={(e) => setPhoneCode((s) => ({ ...s, phone: e.target.value }))} placeholder="+20 10 1234 5678" disabled={phoneCode.sent} /></label>
            {phoneCode.sent ? <label className="st-field">Code<input className="org-input" inputMode="numeric" maxLength={6} value={phoneCode.token} onChange={(e) => setPhoneCode((s) => ({ ...s, token: e.target.value.replace(/\D/g, "") }))} /></label> : null}
            {note("phone")}
            <button className="org-btn ghost small" type="submit" style={{ justifySelf: "start" }}>{phoneCode.sent ? "Verify code" : "Verify a new number"}</button>
          </form>
        </Section>

        <Section title="Two-step verification">
          {factors.filter((f) => f.status === "verified").map((f) => (
            <div key={f.id} className="org-item" style={{ marginTop: 8 }}><ShieldCheck size={16} aria-hidden="true" /> <strong>{f.friendly_name || "Authenticator app"}</strong><button className="org-btn ghost small" style={{ marginInlineStart: "auto" }} onClick={() => removeMfa(f.id)}>Remove</button></div>
          ))}
          {enroll ? (
            <form className="org-form" onSubmit={verifyMfa}>
              <p className="org-muted" style={{ margin: 0 }}>Scan this with your authenticator app, then enter the 6-digit code.</p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={enroll.qr} alt="Authenticator QR code" width={180} height={180} style={{ background: "#fff", borderRadius: 12, padding: 8 }} />
              <p className="st-hint">Can't scan? Enter this key: <code className="org-mono">{enroll.secret}</code></p>
              <input className="org-input" inputMode="numeric" maxLength={6} value={enroll.code} onChange={(e) => setEnroll((s) => (s ? { ...s, code: e.target.value.replace(/\D/g, "") } : s))} aria-label="6-digit code" />
              <button className="org-btn small" type="submit" style={{ justifySelf: "start" }}>Turn on</button>
            </form>
          ) : !factors.some((f) => f.status === "verified") ? <button className="org-btn ghost small" style={{ marginTop: 8 }} onClick={startMfa}><ShieldCheck size={14} aria-hidden="true" /> Set up an authenticator app</button> : null}
          {note("mfa")}
        </Section>

        <Section title="Recent security activity">
          {events.length ? (
            <div className="org-log" style={{ marginTop: 8, maxHeight: 220 }}>
              {events.map((e, i) => <div key={i}>{new Date(e.created_at).toLocaleString()} · {EVENT_LABEL[e.kind] ?? e.kind}{e.detail?.method ? ` (${String(e.detail.method)})` : ""}</div>)}
            </div>
          ) : <p className="org-muted">Nothing recorded yet.</p>}
          <div className="org-row" style={{ marginTop: 12 }}>
            <button className="org-btn ghost small" onClick={() => signOut(false)}><LogOut size={14} aria-hidden="true" /> Sign out</button>
            <button className="org-btn ghost small" onClick={() => signOut(true)}>Sign out on every device</button>
          </div>
        </Section>

        <Section id="delete" title="Your data">
          <p className="org-muted">Download everything MoeAI stores about you, as JSON.</p>
          <a className="org-btn ghost small" href="/api/account" download style={{ marginTop: 8, display: "inline-flex" }}><Download size={14} aria-hidden="true" /> Export my data</a>
          <div className="org-form" style={{ marginTop: 18 }}>
            <p className="org-muted" style={{ margin: 0 }}>Deleting your account removes your profile, chats, memory, progress and uploads. Organizations you own are kept for their members. This cannot be undone.</p>
            <label className="st-field">Type DELETE to confirm<input className="org-input" value={confirmDelete} onChange={(e) => setConfirmDelete(e.target.value)} autoComplete="off" /></label>
            {note("delete")}
            <button className="org-btn small" style={{ justifySelf: "start", background: "linear-gradient(135deg, #f87171, #b91c1c)" }} disabled={confirmDelete !== "DELETE"} onClick={deleteAccount}><Trash2 size={14} aria-hidden="true" /> Delete my account</button>
          </div>
        </Section>
      </div>
    </main>
  );
}
