"use client";
/**
 * MoeAI onboarding: one component, one URL per step.
 *
 * Every step is a real route (/start/signup, /start/find, …), so a refresh, a
 * deep link or the return from Google, Apple or a university's SSO lands on
 * the right screen. Where someone should go next is never decided here: after
 * any step the page asks /api/onboarding, which derives it from the database.
 * Buttons only exist for actions that really work; anything that depends on a
 * decision not made yet (prices, paid plans, a provider not switched on) says
 * so instead of pretending.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Building2, Check, ChevronRight, GraduationCap, KeyRound, LogIn, Mail, Search, ShieldCheck, Sparkles, UserPlus, Users } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { supabaseBrowser } from "@/lib/supabase-browser";
import { safeNext } from "@/lib/auth/next";
import { EMAIL_RE, HANDLE_RE, normalizePhone, passwordProblem, signupProblems, type SignupFields } from "@/lib/auth/validate";

type Query = { next: string; as: string; token: string; error: string; plan: string; org: string; email: string };
type Plan = { id: string; name: string; billing_interval: string; price_minor: number | null; currency: string | null; features: string[]; limits: Record<string, unknown>; seat_limit: number | null; trial_enabled: boolean | null; status: string };
type Onboarding = { signedIn: boolean; email?: string | null; providers?: string[]; step?: string; path?: string; home?: string; facts?: { profile?: { display_name: string | null; handle: string | null; phone: string | null } | null; consent?: boolean } };
type OrgResult = { id: string; slug: string; name: string; type: string | null; sso: string; sso_ref: string | null };

async function post<T = Record<string, unknown>>(url: string, body: unknown): Promise<T & { error?: string; fields?: Record<string, string>; notConfigured?: boolean }> {
  try {
    const res = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body), cache: "no-store" });
    const data = await res.json().catch(() => ({}));
    return res.ok ? data : { ...data, error: data.error || `Something went wrong (${res.status}). Try again.` };
  } catch {
    return { error: "You seem to be offline. Check your connection and try again." } as T & { error: string };
  }
}

const ERRORS: Record<string, string> = {
  cancelled: "Sign-in was cancelled. Choose a way to continue.",
  provider: "That sign-in provider could not finish. Try again, or use email.",
  expired: "That link has expired or was already used. Request a new one.",
  missing_code: "That sign-in link was incomplete. Try again.",
};

const FLOW: Record<string, number> = { "": 0, student: 1, signup: 1, signin: 1, verify: 2, profile: 2, affiliation: 3, find: 3, access: 4, plans: 4, organization: 1, "organization/plans": 2, "organization/new": 3 };

/* ─── Small pieces ─────────────────────────────────────────────────────── */

function GoogleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  );
}
function AppleMark() {
  return (
    <svg width="16" height="18" viewBox="0 0 384 512" aria-hidden="true" fill="currentColor">
      <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z" />
    </svg>
  );
}

function Spinner() { return <span className="st-spinner" aria-hidden="true" />; }

function Field({ id, label, hint, error, children }: { id: string; label: string; hint?: React.ReactNode; error?: string; children: React.ReactNode }) {
  return (
    <label className="st-field" htmlFor={id}>
      {label}
      {children}
      {error ? <span className="st-hint bad" id={`${id}-error`} role="alert">{error}</span> : hint ? <span className="st-hint" id={`${id}-hint`}>{hint}</span> : null}
    </label>
  );
}

function PasswordInput({ id, value, onChange, autoComplete, invalid }: { id: string; value: string; onChange: (v: string) => void; autoComplete: string; invalid?: boolean }) {
  const [shown, setShown] = useState(false);
  return (
    <div className="st-pass">
      <input id={id} className="org-input" type={shown ? "text" : "password"} value={value} onChange={(e) => onChange(e.target.value)} autoComplete={autoComplete}
        aria-invalid={invalid || undefined} aria-describedby={invalid ? `${id}-error` : undefined} style={{ paddingInlineEnd: 64 }} />
      <button type="button" onClick={() => setShown((s) => !s)} aria-label={shown ? "Hide password" : "Show password"}>{shown ? "Hide" : "Show"}</button>
    </div>
  );
}

function strength(pw: string) {
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^a-zA-Z0-9]/.test(pw)) score++;
  return Math.min(4, score);
}

function OAuthButtons({ next, userType, disabled }: { next: string; userType?: string; disabled?: boolean }) {
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const go = async (provider: "google" | "apple") => {
    setBusy(provider); setError("");
    const target = userType ? `/start/continue?as=${userType}&next=${encodeURIComponent(next)}` : `/start/continue?next=${encodeURIComponent(next)}`;
    const r = await post<{ url?: string }>("/api/auth", { action: "oauth", provider, next: target });
    if (r.url) { window.location.assign(r.url); return; }
    setError(r.error || "That sign-in could not start."); setBusy("");
  };
  return (
    <>
      <div className="st-oauth">
        <button type="button" onClick={() => go("google")} disabled={disabled || !!busy} aria-label="Continue with Google">{busy === "google" ? <Spinner /> : <GoogleMark />} Google</button>
        <button type="button" onClick={() => go("apple")} disabled={disabled || !!busy} aria-label="Continue with Apple">{busy === "apple" ? <Spinner /> : <AppleMark />} Apple</button>
      </div>
      {error ? <p className="org-error" role="alert" style={{ marginTop: 8 }}>{error}</p> : null}
    </>
  );
}

/* ─── The page ─────────────────────────────────────────────────────────── */

export default function Client({ step, query }: { step: string; query: Query }) {
  const router = useRouter();
  const next = safeNext(query.next, "/moeai");
  const [me, setMe] = useState<Onboarding | null>(null);
  const withNext = useCallback((path: string, extra = "") => {
    const sep = path.includes("?") ? "&" : "?";
    return `${path}${sep}next=${encodeURIComponent(next)}${extra}`;
  }, [next]);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/onboarding", { cache: "no-store" });
      const data = (await res.json()) as Onboarding;
      setMe(data);
      return data;
    } catch {
      const offline = { signedIn: false } as Onboarding;
      setMe(offline);
      return offline;
    }
  }, []);
  useEffect(() => { void load(); }, [load, step]);

  /** After any step: ask the server where to go. Finished → the page they came for. */
  const proceed = useCallback(async (fresh?: Onboarding) => {
    const s = fresh?.path ? fresh : await load();
    if (!s.signedIn) { router.push(withNext("/start/signin")); return; }
    if (s.step === "done") { window.location.assign(next !== "/moeai" ? next : s.home || "/moeai"); return; }
    router.push(withNext(s.path || "/start"));
  }, [load, next, router, withNext]);

  const screen = useMemo(() => {
    const props = { me, query, next, withNext, proceed, reload: load, router };
    switch (step) {
      case "": return <UseScreen {...props} />;
      case "student": return <AccountChoice {...props} />;
      case "signup": return <SignUp {...props} />;
      case "signin": return <SignIn {...props} />;
      case "forgot": return <Forgot {...props} />;
      case "reset": return <Reset {...props} />;
      case "verify": return <Verify {...props} />;
      case "mfa": return <Mfa {...props} />;
      case "continue": return <Continue {...props} />;
      case "profile": return <Profile {...props} />;
      case "affiliation": return <Affiliation {...props} />;
      case "find": return <FindOrg {...props} />;
      case "access": return <Access {...props} />;
      case "plans": return <Plans target="student" {...props} />;
      case "organization": return <OrgChoice {...props} />;
      case "organization/plans": return <Plans target="organization" {...props} />;
      case "organization/new": return <OrgNew {...props} />;
      case "invite": return <Invite {...props} />;
      default: return <NotFound />;
    }
  }, [load, me, next, proceed, query, router, step, withNext]);

  const position = FLOW[step];
  return (
    <main className="org-page">
      <div className="org-wrap">
        {position !== undefined ? (
          <div className="st-steps" aria-hidden="true">{[0, 1, 2, 3, 4].map((i) => <i key={i} className={i === position ? "on" : i < position ? "done" : ""} />)}</div>
        ) : null}
        {screen}
        <p className="org-muted" style={{ textAlign: "center" }}>
          <Link href="/legal#terms" style={{ textDecoration: "underline" }}>Terms</Link> · <Link href="/legal#privacy" style={{ textDecoration: "underline" }}>Privacy</Link> · <Link href="/" style={{ textDecoration: "underline" }}>EduMoe</Link>
        </p>
      </div>
    </main>
  );
}

type ScreenProps = {
  me: Onboarding | null;
  query: Query;
  next: string;
  withNext: (path: string, extra?: string) => string;
  proceed: (fresh?: Onboarding) => Promise<void>;
  reload: () => Promise<Onboarding>;
  router: ReturnType<typeof useRouter>;
};

function Card({ title, subtitle, back, children }: { title: string; subtitle?: React.ReactNode; back?: () => void; children?: React.ReactNode }) {
  return (
    <section className="org-card st-card" aria-labelledby="st-title">
      {back ? <button type="button" className="st-back" onClick={back} style={{ marginBottom: 12 }}><ArrowLeft size={15} aria-hidden="true" /> Back</button> : null}
      <div className="org-head">
        <Logo size={40} />
        <div>
          <h1 id="st-title">{title}</h1>
          {subtitle ? <p>{subtitle}</p> : null}
        </div>
      </div>
      {children}
    </section>
  );
}

function Option({ icon, title, sub, onClick, disabled, busy }: { icon: React.ReactNode; title: string; sub: string; onClick: () => void; disabled?: boolean; busy?: boolean }) {
  return (
    <button type="button" className="st-option" onClick={onClick} disabled={disabled || busy} aria-disabled={disabled || undefined}>
      <span className="st-icon" aria-hidden="true">{icon}</span>
      <span><strong>{title}</strong><span className="st-sub">{sub}</span></span>
      {busy ? <Spinner /> : <ChevronRight className="st-chev" size={18} aria-hidden="true" />}
    </button>
  );
}

function Loading({ label = "Loading your account…" }: { label?: string }) {
  return (
    <Card title={label}>
      <div className="org-row" style={{ marginTop: 16 }} role="status"><Spinner /> <span className="org-muted" style={{ margin: 0 }}>One moment.</span></div>
    </Card>
  );
}

function NotFound() {
  return <Card title="This step does not exist"><p className="org-muted"><Link href="/start" style={{ textDecoration: "underline" }}>Start again</Link></p></Card>;
}

/* ─── Start: how will you use the app? ─────────────────────────────────── */

function UseScreen({ me, withNext, proceed, router }: ScreenProps) {
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const choose = async (value: "student" | "organization") => {
    if (!me?.signedIn) { router.push(withNext(value === "student" ? "/start/student" : "/start/organization")); return; }
    setBusy(value); setError("");
    const r = await post<Onboarding>("/api/onboarding", { action: "use", value });
    if (r.error) { setError(r.error); setBusy(""); return; }
    await proceed(r);
  };
  if (me?.signedIn && me.step === "done") {
    return (
      <Card title="You're all set" subtitle={`Signed in as ${me.email ?? "you"}.`}>
        <div className="org-form">
          <button className="org-btn" onClick={() => proceed()}>Continue to MoeAI</button>
          <Link className="org-btn ghost" href="/account">Account settings</Link>
        </div>
      </Card>
    );
  }
  return (
    <Card title="How will you use MoeAI?" subtitle="Pick one. You can join an organization later.">
      <div className="st-options">
        <Option icon={<GraduationCap size={20} />} title="Student" sub="Learn with MoeAI on your own or through your university." onClick={() => choose("student")} busy={busy === "student"} disabled={!!busy} />
        <Option icon={<Building2 size={20} />} title="Organization" sub="Bring MoeAI to a university, school or institute, or join one." onClick={() => choose("organization")} busy={busy === "organization"} disabled={!!busy} />
      </div>
      {error ? <p className="org-error" role="alert" style={{ marginTop: 12 }}>{error}</p> : null}
      {!me?.signedIn ? (
        <p className="org-muted" style={{ marginTop: 16 }}>Already have an account? <Link href={withNext("/start/signin")} style={{ textDecoration: "underline" }}>Sign in</Link></p>
      ) : null}
    </Card>
  );
}

function AccountChoice({ withNext, router }: ScreenProps) {
  return (
    <Card title="Your MoeAI account" subtitle="New here, or coming back?" back={() => router.push(withNext("/start"))}>
      <div className="st-options">
        <Option icon={<UserPlus size={20} />} title="Sign up" sub="Create an account with email, Google or Apple." onClick={() => router.push(withNext("/start/signup", "&as=student"))} />
        <Option icon={<LogIn size={20} />} title="Sign in" sub="Welcome back." onClick={() => router.push(withNext("/start/signin"))} />
      </div>
      <p className="org-muted" style={{ marginTop: 16 }}>
        Your university set you up? <Link href={`/sso?next=${encodeURIComponent("/moeai")}`} style={{ textDecoration: "underline" }}>Sign in through your university</Link>
      </p>
    </Card>
  );
}

/* ─── Sign up ──────────────────────────────────────────────────────────── */

function SignUp({ query, next, withNext, proceed, router }: ScreenProps) {
  const userType = query.as === "organization" ? "organization" : "student";
  const [f, setF] = useState<SignupFields>({ displayName: "", handle: "", email: query.email || "", phone: "", password: "", confirm: "", consent: false });
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [serverErrors, setServerErrors] = useState<Record<string, string>>({});
  const [handleState, setHandleState] = useState<"idle" | "checking" | "free" | "taken">("idle");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const inFlight = useRef(false);
  const problems = signupProblems(f);
  const set = (k: keyof SignupFields) => (v: string | boolean) => { setF((s) => ({ ...s, [k]: v })); setServerErrors((e) => ({ ...e, [k]: "" })); };
  const show = (k: keyof SignupFields) => serverErrors[k] || (touched[k] ? problems[k] : undefined);

  // Live handle availability, debounced.
  useEffect(() => {
    const h = f.handle.trim().toLowerCase();
    if (!HANDLE_RE.test(h)) { setHandleState("idle"); return undefined; }
    setHandleState("checking");
    const t = setTimeout(async () => {
      const r = await post<{ available?: boolean }>("/api/auth", { action: "handle-check", handle: h });
      setHandleState(r.available ? "free" : "taken");
    }, 400);
    return () => clearTimeout(t);
  }, [f.handle]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched({ displayName: true, handle: true, email: true, phone: true, password: true, confirm: true, consent: true });
    if (Object.keys(problems).length || handleState === "taken" || inFlight.current) return;
    inFlight.current = true; setBusy(true); setError("");
    const r = await post<{ confirmed?: boolean; message?: string }>("/api/auth", {
      action: "signup", ...f, phone: f.phone ? normalizePhone(f.phone) : "", userType, next: `/start/continue?next=${encodeURIComponent(next)}`,
    });
    inFlight.current = false; setBusy(false);
    if (r.error) { setError(r.error); setServerErrors(r.fields || {}); return; }
    if (r.confirmed) { await proceed(); return; }
    router.push(withNext("/start/verify", `&email=${encodeURIComponent(f.email.trim().toLowerCase())}`));
  };

  const meter = strength(f.password);
  return (
    <Card title={userType === "organization" ? "Create your organization account" : "Create your account"} subtitle="Start with Google or Apple, or fill in your details." back={() => router.push(withNext(userType === "organization" ? "/start/organization" : "/start/student"))}>
      <OAuthButtons next={next} userType={userType} disabled={busy} />
      <div className="st-or">or with email</div>
      <form className="org-form" onSubmit={submit} noValidate>
        <div className="st-two">
          <Field id="su-name" label="Display name" error={show("displayName")}>
            <input id="su-name" className="org-input" value={f.displayName} onChange={(e) => set("displayName")(e.target.value)} onBlur={() => setTouched((t) => ({ ...t, displayName: true }))} autoComplete="name" aria-invalid={!!show("displayName") || undefined} />
          </Field>
          <Field id="su-handle" label="Handle" error={show("handle") || (handleState === "taken" ? "That handle is taken." : undefined)}
            hint={handleState === "checking" ? "Checking…" : handleState === "free" ? <span className="st-hint ok">@{f.handle.toLowerCase()} is yours</span> : "Letters, numbers, dots and underscores."}>
            <input id="su-handle" className="org-input" value={f.handle} onChange={(e) => set("handle")(e.target.value.replace(/\s/g, "").toLowerCase())} onBlur={() => setTouched((t) => ({ ...t, handle: true }))} autoComplete="username" autoCapitalize="none" spellCheck={false} aria-invalid={!!show("handle") || handleState === "taken" || undefined} placeholder="mariam.adel" />
          </Field>
        </div>
        <Field id="su-email" label="Email" error={show("email")}>
          <input id="su-email" className="org-input" type="email" inputMode="email" value={f.email} onChange={(e) => set("email")(e.target.value)} onBlur={() => setTouched((t) => ({ ...t, email: true }))} autoComplete="email" aria-invalid={!!show("email") || undefined} />
        </Field>
        <Field id="su-phone" label="Phone number (optional)" error={show("phone")} hint="With country code. Used for sign-in and account recovery.">
          <input id="su-phone" className="org-input" type="tel" inputMode="tel" value={f.phone} onChange={(e) => set("phone")(e.target.value)} onBlur={() => setTouched((t) => ({ ...t, phone: true }))} autoComplete="tel" placeholder="+20 10 1234 5678" aria-invalid={!!show("phone") || undefined} />
        </Field>
        <Field id="su-pass" label="Password" error={show("password")} hint="At least 8 characters, with letters and numbers.">
          <PasswordInput id="su-pass" value={f.password} onChange={set("password")} autoComplete="new-password" invalid={!!show("password")} />
          {f.password ? <div className="st-meter" aria-hidden="true"><i style={{ width: `${(meter / 4) * 100}%`, background: ["#f43f5e", "#f43f5e", "#f59e0b", "#84cc16", "#34d399"][meter] }} /></div> : null}
        </Field>
        <Field id="su-confirm" label="Confirm password" error={show("confirm")}>
          <PasswordInput id="su-confirm" value={f.confirm} onChange={set("confirm")} autoComplete="new-password" invalid={!!show("confirm")} />
        </Field>
        <label className="st-check">
          <input type="checkbox" checked={f.consent} onChange={(e) => set("consent")(e.target.checked)} aria-invalid={!!show("consent") || undefined} />
          <span>I agree to the <Link href="/legal#terms" target="_blank">Terms of Service</Link> and the <Link href="/legal#privacy" target="_blank">Privacy Policy</Link>.</span>
        </label>
        {show("consent") ? <p className="org-error" role="alert">{show("consent")}</p> : null}
        {error ? <p className="org-error" role="alert">{error}</p> : null}
        <button className="org-btn" type="submit" disabled={busy}>{busy ? <><Spinner /> Creating your account…</> : "Create account"}</button>
      </form>
      <p className="org-muted" style={{ marginTop: 14 }}>Already have an account? <Link href={withNext("/start/signin")} style={{ textDecoration: "underline" }}>Sign in</Link></p>
    </Card>
  );
}

/* ─── Sign in ──────────────────────────────────────────────────────────── */

function SignIn({ query, next, withNext, proceed, router }: ScreenProps) {
  const [identifier, setIdentifier] = useState(query.email || "");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(ERRORS[query.error] || "");
  const [unverified, setUnverified] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    if (!identifier.trim() || !password) { setError("Enter your email or phone number and your password."); return; }
    setBusy(true); setError(""); setUnverified(false);
    const r = await post<{ mfa?: boolean; unverified?: boolean }>("/api/auth", { action: "login", identifier, password });
    setBusy(false);
    if (r.error) { setError(r.error); setUnverified(Boolean(r.unverified)); return; }
    if (r.mfa) { router.push(withNext("/start/mfa")); return; }
    await proceed();
  };
  return (
    <Card title="Welcome back" subtitle="Sign in to MoeAI." back={() => router.push(withNext("/start"))}>
      <OAuthButtons next={next} disabled={busy} />
      <div className="st-or">or</div>
      <form className="org-form" onSubmit={submit} noValidate>
        <Field id="si-id" label="Email or phone number">
          <input id="si-id" className="org-input" value={identifier} onChange={(e) => setIdentifier(e.target.value)} autoComplete="username" autoCapitalize="none" spellCheck={false} />
        </Field>
        <Field id="si-pass" label="Password">
          <PasswordInput id="si-pass" value={password} onChange={setPassword} autoComplete="current-password" />
        </Field>
        {error ? <p className="org-error" role="alert">{error}</p> : null}
        {unverified ? <Link className="org-btn ghost small" href={withNext("/start/verify", `&email=${encodeURIComponent(identifier.trim())}`)}>Send the confirmation link again</Link> : null}
        <button className="org-btn" type="submit" disabled={busy}>{busy ? <><Spinner /> Signing in…</> : "Sign in"}</button>
      </form>
      <div className="st-links" style={{ marginTop: 14 }}>
        <Link href={withNext("/start/forgot", identifier.includes("@") ? `&email=${encodeURIComponent(identifier.trim())}` : "")}>Forgot password?</Link>
        <Link href={withNext("/start/signup", "&as=student")}>Create an account</Link>
      </div>
      <p className="org-muted" style={{ marginTop: 12 }}>Through your university? <Link href={`/sso?next=${encodeURIComponent(next)}`} style={{ textDecoration: "underline" }}>University sign-in</Link></p>
    </Card>
  );
}

function Forgot({ query, withNext, router }: ScreenProps) {
  const [email, setEmail] = useState(query.email || "");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState("");
  const [error, setError] = useState(query.error ? "That reset link has expired or was already used. Request a new one below." : "");
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!EMAIL_RE.test(email.trim())) { setError("Enter a valid email address."); return; }
    setBusy(true); setError("");
    const r = await post<{ message?: string }>("/api/auth", { action: "forgot", email });
    setBusy(false);
    if (r.error) setError(r.error); else setDone(r.message || "Check your inbox.");
  };
  return (
    <Card title="Reset your password" subtitle="We'll email you a link to choose a new one." back={() => router.push(withNext("/start/signin"))}>
      {done ? <p className="st-status ok" role="status" style={{ marginTop: 16 }}><Mail size={14} aria-hidden="true" /> {done}</p> : (
        <form className="org-form" onSubmit={submit} noValidate>
          <Field id="fp-email" label="Email">
            <input id="fp-email" className="org-input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
          </Field>
          {error ? <p className="org-error" role="alert">{error}</p> : null}
          <button className="org-btn" type="submit" disabled={busy}>{busy ? <><Spinner /> Sending…</> : "Send reset link"}</button>
        </form>
      )}
    </Card>
  );
}

function Reset({ me, withNext, proceed }: ScreenProps) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  if (!me) return <Loading label="Checking your link…" />;
  if (!me.signedIn) {
    return (
      <Card title="This link has expired" subtitle="Reset links work once and expire within the hour.">
        <div className="org-form"><Link className="org-btn" href={withNext("/start/forgot")}>Request a new link</Link></div>
      </Card>
    );
  }
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const problem = passwordProblem(password, me.email ?? "");
    if (problem) { setError(problem); return; }
    if (password !== confirm) { setError("The passwords do not match."); return; }
    setBusy(true); setError("");
    const r = await post("/api/auth", { action: "reset", password, confirm });
    setBusy(false);
    if (r.error) setError(r.error); else setDone(true);
  };
  return (
    <Card title="Choose a new password" subtitle={me.email ?? undefined}>
      {done ? (
        <div className="org-form">
          <p className="st-status ok" role="status"><Check size={14} aria-hidden="true" /> Your password is changed.</p>
          <button className="org-btn" onClick={() => proceed()}>Continue</button>
        </div>
      ) : (
        <form className="org-form" onSubmit={submit} noValidate>
          <Field id="rs-pass" label="New password" hint="At least 8 characters, with letters and numbers."><PasswordInput id="rs-pass" value={password} onChange={setPassword} autoComplete="new-password" /></Field>
          <Field id="rs-confirm" label="Confirm new password"><PasswordInput id="rs-confirm" value={confirm} onChange={setConfirm} autoComplete="new-password" /></Field>
          {error ? <p className="org-error" role="alert">{error}</p> : null}
          <button className="org-btn" type="submit" disabled={busy}>{busy ? <><Spinner /> Saving…</> : "Save password"}</button>
        </form>
      )}
    </Card>
  );
}

function Verify({ me, query, proceed, withNext }: ScreenProps) {
  const [cooldown, setCooldown] = useState(0);
  const [note, setNote] = useState("");
  const email = query.email || me?.email || "";
  useEffect(() => {
    if (!cooldown) return undefined;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);
  // Confirming in another tab signs this one in too: check back periodically.
  useEffect(() => {
    const t = setInterval(async () => {
      const r = await fetch("/api/onboarding", { cache: "no-store" }).then((x) => x.json()).catch(() => null);
      if (r?.signedIn && r.step !== "verify") { clearInterval(t); void proceed(r); }
    }, 5000);
    return () => clearInterval(t);
  }, [proceed]);
  const resend = async () => {
    if (!EMAIL_RE.test(email)) { setNote("Sign up again with a valid email address."); return; }
    setCooldown(60);
    const r = await post<{ message?: string }>("/api/auth", { action: "resend", email, next: "/start/continue" });
    setNote(r.error || r.message || "Sent.");
  };
  return (
    <Card title="Confirm your email" subtitle={email ? <>We sent a link to <strong>{email}</strong>.</> : "We sent you a confirmation link."}>
      <div className="org-form">
        <p className="org-muted" style={{ margin: 0 }}>Open it on this device to continue. The link works once. Check spam if it is not there in a minute.</p>
        {note ? <p className="st-status" role="status">{note}</p> : null}
        <button className="org-btn ghost" type="button" onClick={resend} disabled={cooldown > 0}>{cooldown ? `Send again in ${cooldown}s` : "Send the link again"}</button>
        <button className="org-btn" type="button" onClick={() => proceed()}>I've confirmed it</button>
        <Link className="org-muted" href={withNext("/start/signin")} style={{ textAlign: "center", textDecoration: "underline" }}>Use a different account</Link>
      </div>
    </Card>
  );
}

/* ─── Two-step verification (TOTP), Supabase MFA ───────────────────────── */

function Mfa({ proceed, withNext }: ScreenProps) {
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^[0-9]{6}$/.test(code)) { setError("Enter the 6-digit code from your authenticator app."); return; }
    setBusy(true); setError("");
    try {
      const sb = supabaseBrowser();
      const { data: factors } = await sb.auth.mfa.listFactors();
      const factor = factors?.totp?.find((f) => f.status === "verified");
      if (!factor) { setError("No authenticator is set up on this account."); setBusy(false); return; }
      const { error: err } = await sb.auth.mfa.challengeAndVerify({ factorId: factor.id, code });
      if (err) { setError(/expired/i.test(err.message) ? "That code has expired. Enter the current one." : "That code is not right."); setBusy(false); return; }
      await post("/api/auth", { action: "mfa-verified" }).catch(() => undefined);
      await proceed();
    } catch {
      setError("Verification failed. Try again."); setBusy(false);
    }
  };
  return (
    <Card title="Two-step verification" subtitle="Enter the code from your authenticator app.">
      <form className="org-form" onSubmit={submit} noValidate>
        <Field id="mfa-code" label="6-digit code">
          <input id="mfa-code" className="org-input" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} style={{ letterSpacing: "0.3em", fontSize: 18 }} />
        </Field>
        {error ? <p className="org-error" role="alert">{error}</p> : null}
        <button className="org-btn" type="submit" disabled={busy}>{busy ? <><Spinner /> Verifying…</> : <><ShieldCheck size={16} aria-hidden="true" /> Verify</>}</button>
        <button type="button" className="st-back" style={{ justifySelf: "center" }} onClick={async () => { await post("/api/auth", { action: "logout" }); window.location.assign(withNext("/start/signin")); }}>Cancel and sign out</button>
      </form>
    </Card>
  );
}

/* ─── Continue: the router after OAuth, SSO and email links ────────────── */

function Continue({ me, query, proceed }: ScreenProps) {
  const ran = useRef(false);
  useEffect(() => {
    if (!me || ran.current) return;
    ran.current = true;
    (async () => {
      // "Organization" chosen before a Google/Apple signup: apply it now that there is an account.
      if (me.signedIn && (query.as === "organization" || query.as === "student") && me.step === "use") {
        const r = await post<Onboarding>("/api/onboarding", { action: "use", value: query.as });
        if (!r.error) { await proceed(r); return; }
      }
      await proceed(me.signedIn ? me : undefined);
    })();
  }, [me, proceed, query.as]);
  return <Loading label="Signing you in…" />;
}

/* ─── Profile: what the app still needs (OAuth accounts, older accounts) ─ */

function Profile({ me, proceed }: ScreenProps) {
  const p = me?.facts?.profile;
  const [displayName, setDisplayName] = useState("");
  const [handle, setHandle] = useState("");
  const [phone, setPhone] = useState("");
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<{ field?: string; message: string } | null>(null);
  useEffect(() => {
    if (!p) return;
    setDisplayName((v) => v || p.display_name || "");
    setHandle((v) => v || p.handle || "");
    setPhone((v) => v || p.phone || "");
  }, [p]);
  if (!me) return <Loading />;
  const needsConsent = !me.facts?.consent;
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (needsConsent && !consent) { setError({ field: "consent", message: "You need to accept the Terms and Privacy Policy to continue." }); return; }
    setBusy(true); setError(null);
    const r = await post<Onboarding & { field?: string }>("/api/onboarding", { action: "profile", displayName, handle, phone: phone ? normalizePhone(phone) : "", consent: needsConsent ? consent : undefined });
    setBusy(false);
    if (r.error) { setError({ field: (r as { field?: string }).field, message: r.error }); return; }
    await proceed(r);
  };
  return (
    <Card title="Finish your profile" subtitle="How you'll appear in MoeAI, Rooms and Ranked.">
      <form className="org-form" onSubmit={submit} noValidate>
        <Field id="pf-name" label="Display name" error={error?.field === "displayName" ? error.message : undefined}>
          <input id="pf-name" className="org-input" value={displayName} onChange={(e) => setDisplayName(e.target.value)} autoComplete="name" />
        </Field>
        <Field id="pf-handle" label="Handle" hint="Letters, numbers, dots and underscores." error={error?.field === "handle" ? error.message : undefined}>
          <input id="pf-handle" className="org-input" value={handle} onChange={(e) => setHandle(e.target.value.replace(/\s/g, "").toLowerCase())} autoCapitalize="none" spellCheck={false} placeholder="mariam.adel" />
        </Field>
        <Field id="pf-phone" label="Phone number (optional)" error={error?.field === "phone" ? error.message : undefined}>
          <input id="pf-phone" className="org-input" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="tel" placeholder="+20 10 1234 5678" />
        </Field>
        {needsConsent ? (
          <label className="st-check">
            <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
            <span>I agree to the <Link href="/legal#terms" target="_blank">Terms of Service</Link> and the <Link href="/legal#privacy" target="_blank">Privacy Policy</Link>.</span>
          </label>
        ) : null}
        {error && (!error.field || error.field === "consent") ? <p className="org-error" role="alert">{error.message}</p> : null}
        <button className="org-btn" type="submit" disabled={busy}>{busy ? <><Spinner /> Saving…</> : "Continue"}</button>
      </form>
    </Card>
  );
}

/* ─── Student: part of an organization? ────────────────────────────────── */

function Affiliation({ proceed, router, withNext }: ScreenProps) {
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const choose = async (value: "member" | "independent") => {
    setBusy(value); setError("");
    const r = await post<Onboarding>("/api/onboarding", { action: "affiliation", value });
    if (r.error) { setError(r.error); setBusy(""); return; }
    await proceed(r);
  };
  return (
    <Card title="Are you part of an organization?" subtitle="A university, school or institute that uses MoeAI." back={() => router.push(withNext("/start"))}>
      <div className="st-options">
        <Option icon={<Building2 size={20} />} title="Yes, I'm part of an organization" sub="Sign in through it and get your courses set up for you." onClick={() => choose("member")} busy={busy === "member"} disabled={!!busy} />
        <Option icon={<Sparkles size={20} />} title="No, I'm using MoeAI independently" sub="Bring your own material. You can join an organization later." onClick={() => choose("independent")} busy={busy === "independent"} disabled={!!busy} />
      </div>
      {error ? <p className="org-error" role="alert" style={{ marginTop: 12 }}>{error}</p> : null}
    </Card>
  );
}

/* ─── Organization identification → SSO ────────────────────────────────── */

function FindOrg({ me, next, withNext, router }: ScreenProps) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<OrgResult[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sso, setSso] = useState("");
  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) { setResults(null); return undefined; }
    setBusy(true);
    const t = setTimeout(async () => {
      const r = await post<{ results?: OrgResult[] }>("/api/onboarding", { action: "find", q: term });
      setBusy(false);
      if (r.error) { setError(r.error); return; }
      setError(""); setResults(r.results ?? []);
    }, 300);
    return () => clearTimeout(t);
  }, [q]);
  const accessPath = (org: OrgResult) => `/start/access?org=${org.id}&next=${encodeURIComponent(next)}`;
  const signIn = async (org: OrgResult) => {
    setError("");
    if (org.sso === "demo") { window.location.assign(`/sso/${org.slug}?next=${encodeURIComponent(accessPath(org))}`); return; }
    if ((org.sso === "saml" || org.sso === "oidc") && org.sso_ref) {
      setSso(org.id);
      const r = await post<{ url?: string }>("/api/auth", { action: "sso", providerId: org.sso_ref, next: accessPath(org) });
      if (r.url) { window.location.assign(r.url); return; }
      setSso(""); setError(r.error || "Single sign-on could not start.");
      return;
    }
    // No SSO connected: membership comes from an invitation, checked on the access step.
    if (me?.signedIn) router.push(accessPath(org));
    else router.push(`/start/signin?next=${encodeURIComponent(accessPath(org))}`);
  };
  return (
    <Card title="Find your organization" subtitle="Search by name or by its email domain (for example fue.edu.eg)." back={() => router.push(withNext(me?.signedIn ? "/start/affiliation" : "/start"))}>
      <div className="org-form">
        <label className="st-field" htmlFor="fo-q">
          <span className="sr-only">Organization</span>
          <div style={{ position: "relative" }}>
            <Search size={16} aria-hidden="true" style={{ position: "absolute", insetInlineStart: 12, top: "50%", transform: "translateY(-50%)", color: "var(--muted)" }} />
            <input id="fo-q" className="org-input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Future University, fue.edu.eg…" autoFocus style={{ paddingInlineStart: 36 }} />
          </div>
        </label>
        <div aria-live="polite">
          {busy ? <div className="org-row"><Spinner /> <span className="org-muted" style={{ margin: 0 }}>Searching…</span></div> : null}
          {!busy && results?.length === 0 ? <p className="st-status">No organization matches. Check the spelling, or ask your organization for an invitation link.</p> : null}
          {!busy && results?.length ? (
            <div className="org-list" style={{ marginTop: 0 }}>
              {results.map((org) => (
                <button key={org.id} type="button" className="org-item" onClick={() => signIn(org)} disabled={!!sso} style={{ cursor: "pointer" }}>
                  <strong>{org.name}</strong>
                  <span className={`org-badge ${org.sso === "none" ? "" : "live"}`}>{sso === org.id ? "Opening…" : org.sso === "demo" ? "Demo sign-in" : org.sso === "none" ? "Invitation" : "Single sign-on"}</span>
                </button>
              ))}
            </div>
          ) : null}
        </div>
        {error ? <p className="org-error" role="alert">{error}</p> : null}
        <p className="org-muted" style={{ margin: 0 }}>Got an invitation email? Open its link: it brings you straight in.</p>
      </div>
    </Card>
  );
}

function Access({ me, query, next, proceed, withNext, router }: ScreenProps) {
  const [state, setState] = useState<{ org_name: string; membership: string; org_status: string; role: string | null } | null>(null);
  const [error, setError] = useState("");
  const orgId = query.org;
  useEffect(() => {
    if (!me?.signedIn || !orgId) return;
    (async () => {
      const r = await post<{ access?: { org_name: string; membership: string; org_status: string; role: string | null } }>("/api/onboarding", { action: "access", orgId });
      if (r.error) setError(r.error); else setState(r.access ?? null);
    })();
  }, [me?.signedIn, orgId]);
  if (!me) return <Loading label="Checking your access…" />;
  if (!me.signedIn) {
    return <Card title="Sign in to continue"><div className="org-form"><Link className="org-btn" href={`/start/signin?next=${encodeURIComponent(`/start/access?org=${orgId}&next=${next}`)}`}>Sign in</Link></div></Card>;
  }
  if (!orgId) return <Card title="Pick your organization"><div className="org-form"><Link className="org-btn" href={withNext("/start/find")}>Find it</Link></div></Card>;
  if (error) return <Card title="We could not check your access" subtitle={error}><div className="org-form"><button className="org-btn" onClick={() => location.reload()}>Try again</button></div></Card>;
  if (!state) return <Loading label="Checking your access…" />;
  const messages: Record<string, [string, string, "ok" | "warn" | "bad"]> = {
    active: ["You're in", `Your ${state.org_name} access is active${state.role ? ` as ${state.role === "owner" ? "an owner" : `a ${state.role}`}` : ""}.`, "ok"],
    pending: ["Waiting for approval", `${state.org_name} still has to approve your membership. We'll let you in as soon as they do.`, "warn"],
    invited: ["You have an invitation", `Open the invitation link ${state.org_name} emailed you to accept it.`, "warn"],
    suspended: ["Access suspended", `Your ${state.org_name} membership is suspended. Contact your organization's admin.`, "bad"],
    removed: ["No longer a member", `You were removed from ${state.org_name}. Contact its admin if that is a mistake.`, "bad"],
    expired: ["Access expired", `Your ${state.org_name} access has expired. Ask its admin to renew it.`, "bad"],
    none: ["Not a member yet", `This account is not a member of ${state.org_name}. Sign in through its university sign-in, or ask its admin for an invitation.`, "warn"],
  };
  const unavailable = state.org_status !== "active";
  const [title, text, tone] = unavailable
    ? ["Organization unavailable", `${state.org_name} is not accepting sign-ins right now.`, "bad" as const]
    : messages[state.membership] ?? messages.none;
  return (
    <Card title={title}>
      <div className="org-form">
        <p className={`st-status ${tone}`} role="status">{text}</p>
        {tone === "ok" ? <button className="org-btn" onClick={() => proceed()}>Continue</button> : (
          <>
            <button className="org-btn ghost" onClick={() => router.push(withNext("/start/find"))}>Choose another organization</button>
            <button className="org-btn ghost" onClick={async () => { const r = await post<Onboarding>("/api/onboarding", { action: "affiliation", value: "independent" }); if (!r.error) await proceed(r); }}>Use MoeAI independently for now</button>
          </>
        )}
      </div>
    </Card>
  );
}

/* ─── Plans: the structure, with nothing commercial invented ───────────── */

function Plans({ target, me, next, proceed, router, withNext }: ScreenProps & { target: "student" | "organization" }) {
  const [plans, setPlans] = useState<Plan[] | null>(null);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  useEffect(() => {
    fetch(`/api/onboarding?plans=${target}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => (d.error ? setError(d.error) : setPlans(d.plans)))
      .catch(() => setError("Plans could not be loaded. Check your connection."));
  }, [target]);
  const choose = async (plan: Plan) => {
    if (plan.status !== "available") return;
    if (!me?.signedIn) { router.push(`/start/signup?as=${target}&next=${encodeURIComponent(`/start/${target === "student" ? "plans" : "organization/plans"}?next=${next}`)}`); return; }
    if (target === "organization") { router.push(withNext("/start/organization/new", `&plan=${plan.id}`)); return; }
    setBusy(plan.id); setError("");
    const r = await post<Onboarding>("/api/onboarding", { action: "plan", plan: plan.id });
    setBusy("");
    if (r.error) { setError(r.error); return; }
    await proceed(r);
  };
  const interval = (p: Plan) => (p.billing_interval === "month" ? "Billed monthly" : p.billing_interval === "year" ? "Billed yearly" : "No payment");
  const price = (p: Plan) => (p.price_minor != null && p.currency ? new Intl.NumberFormat(undefined, { style: "currency", currency: p.currency }).format(p.price_minor / 100) : null);
  return (
    <Card title={target === "student" ? "Choose your plan" : "Choose your organization's plan"} subtitle="You can change it later." back={() => router.push(withNext(target === "student" ? "/start/affiliation" : "/start/organization"))}>
      {error ? <p className="org-error" role="alert" style={{ marginTop: 12 }}>{error}</p> : null}
      {!plans && !error ? <div className="org-row" style={{ marginTop: 16 }}><Spinner /> <span className="org-muted" style={{ margin: 0 }}>Loading plans…</span></div> : null}
      <div className="st-plans">
        {(plans ?? []).map((p) => {
          const available = p.status === "available";
          const features = Array.isArray(p.features) ? p.features : [];
          return (
            <article key={p.id} className={`st-plan ${available ? "selectable" : ""}`} aria-label={`${p.name} plan`}>
              <header>
                <strong>{p.name}</strong>
                {/* Price area: only a configured price is ever shown. */}
                <span className="st-price">{price(p) ?? ""}</span>
              </header>
              <span className="st-hint">{interval(p)}</span>
              {features.length ? <ul>{features.map((f) => <li key={String(f)}>{String(f)}</li>)}</ul> : null}
              {target === "organization" && p.seat_limit != null ? <span className="st-hint">{p.seat_limit} seats</span> : null}
              {available ? (
                <button className="org-btn" onClick={() => choose(p)} disabled={!!busy}>{busy === p.id ? <><Spinner /> Setting up…</> : `Continue with ${p.name}`}</button>
              ) : (
                <button className="org-btn ghost" disabled aria-disabled="true">Not available yet</button>
              )}
            </article>
          );
        })}
      </div>
    </Card>
  );
}

/* ─── Organization account ─────────────────────────────────────────────── */

function OrgChoice({ me, next, proceed, router, withNext }: ScreenProps) {
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const choose = async (value: "start" | "join") => {
    if (!me?.signedIn) {
      router.push(value === "start" ? `/start/signup?as=organization&next=${encodeURIComponent(`/start/organization/plans?next=${next}`)}` : withNext("/start/find", "&as=organization"));
      return;
    }
    setBusy(value); setError("");
    const r = await post<Onboarding>("/api/onboarding", { action: "org-choice", value });
    if (r.error) { setError(r.error); setBusy(""); return; }
    await proceed(r);
  };
  return (
    <Card title="Organization account" subtitle="Set one up, or get into one that already uses MoeAI." back={() => router.push(withNext("/start"))}>
      <div className="st-options">
        <Option icon={<Building2 size={20} />} title="Start an organization" sub="Create it, pick a plan, and become its admin." onClick={() => choose("start")} busy={busy === "start"} disabled={!!busy} />
        <Option icon={<Users size={20} />} title="Part of an organization" sub="Sign in through its single sign-on or an invitation." onClick={() => choose("join")} busy={busy === "join"} disabled={!!busy} />
      </div>
      {error ? <p className="org-error" role="alert" style={{ marginTop: 12 }}>{error}</p> : null}
    </Card>
  );
}

const ORG_TYPES = [["university", "University"], ["school", "School"], ["institute", "Institute or academy"], ["company", "Company"], ["other", "Other"]] as const;

function OrgNew({ me, query, next, router, withNext }: ScreenProps) {
  const plan = query.plan || "org_free";
  const [name, setName] = useState("");
  const [type, setType] = useState("");
  const [domain, setDomain] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<{ field?: string; message: string } | null>(null);
  // One id per creation attempt, kept across refreshes and double submits, so
  // the server returns the same organization instead of making a second one.
  const request = useMemo(() => {
    if (typeof window === "undefined") return "";
    const key = "moeai.org-create-request";
    const existing = sessionStorage.getItem(key);
    if (existing) return existing;
    const id = crypto.randomUUID();
    sessionStorage.setItem(key, id);
    return id;
  }, []);
  if (!me) return <Loading />;
  if (!me.signedIn) return <Card title="Sign in first"><div className="org-form"><Link className="org-btn" href={`/start/signin?next=${encodeURIComponent(`/start/organization/new?plan=${plan}&next=${next}`)}`}>Sign in</Link></div></Card>;
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    if (name.trim().length < 2) { setError({ field: "name", message: "Enter the organization's name." }); return; }
    if (!type) { setError({ field: "type", message: "Choose what kind of organization it is." }); return; }
    setBusy(true); setError(null);
    const r = await post<{ path?: string; field?: string }>("/api/onboarding", { action: "org-create", name, type, domain: domain.trim().replace(/^@/, "") || null, plan, request });
    setBusy(false);
    if (r.error) { setError({ field: (r as { field?: string }).field, message: r.error }); return; }
    sessionStorage.removeItem("moeai.org-create-request");
    window.location.assign(r.path || "/org/admin");
  };
  return (
    <Card title="About your organization" subtitle="Only what MoeAI needs to set it up." back={() => router.push(withNext("/start/organization/plans"))}>
      <form className="org-form" onSubmit={submit} noValidate>
        <Field id="on-name" label="Organization name" error={error?.field === "name" ? error.message : undefined}>
          <input id="on-name" className="org-input" value={name} onChange={(e) => setName(e.target.value)} autoComplete="organization" />
        </Field>
        <Field id="on-type" label="Type" error={error?.field === "type" ? error.message : undefined}>
          <select id="on-type" className="org-select" value={type} onChange={(e) => setType(e.target.value)}>
            <option value="">Choose…</option>
            {ORG_TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </Field>
        <Field id="on-domain" label="Email domain (optional)" hint="Like example.edu. It is verified by MoeAI before it lets anyone in automatically." error={error?.field === "domain" ? error.message : undefined}>
          <input id="on-domain" className="org-input" value={domain} onChange={(e) => setDomain(e.target.value.toLowerCase())} autoCapitalize="none" spellCheck={false} placeholder="example.edu" />
        </Field>
        {error && !error.field ? <p className="org-error" role="alert">{error.message}</p> : null}
        <button className="org-btn" type="submit" disabled={busy}>{busy ? <><Spinner /> Setting up your organization…</> : "Create organization"}</button>
        <p className="st-hint" style={{ margin: 0 }}><KeyRound size={12} aria-hidden="true" /> You become its owner. Owners manage members, invitations and the plan.</p>
      </form>
    </Card>
  );
}

/* ─── Invitations ──────────────────────────────────────────────────────── */

function Invite({ me, query, proceed }: ScreenProps) {
  const [state, setState] = useState<"idle" | "busy" | "done">("idle");
  const [error, setError] = useState("");
  const path = `/start/invite?token=${encodeURIComponent(query.token)}`;
  if (!me) return <Loading label="Opening your invitation…" />;
  if (!/^[0-9a-f]{48}$/.test(query.token)) return <Card title="This invitation link is not valid" subtitle="Ask your organization to send it again." />;
  if (!me.signedIn) {
    return (
      <Card title="You've been invited" subtitle="Sign in or create an account with the email address the invitation was sent to.">
        <div className="org-form">
          <Link className="org-btn" href={`/start/signup?next=${encodeURIComponent(path)}`}>Create an account</Link>
          <Link className="org-btn ghost" href={`/start/signin?next=${encodeURIComponent(path)}`}>Sign in</Link>
        </div>
      </Card>
    );
  }
  const accept = async () => {
    setState("busy"); setError("");
    const r = await post("/api/onboarding", { action: "invite-accept", token: query.token });
    if (r.error) { setError(r.error); setState("idle"); return; }
    setState("done");
  };
  return (
    <Card title="Accept your invitation" subtitle={`Signed in as ${me.email ?? "you"}.`}>
      <div className="org-form">
        {state === "done" ? <p className="st-status ok" role="status"><Check size={14} aria-hidden="true" /> You're a member now.</p> : null}
        {error ? <p className="st-status bad" role="alert">{error}</p> : null}
        {state === "done"
          ? <button className="org-btn" onClick={() => proceed()}>Continue</button>
          : <button className="org-btn" onClick={accept} disabled={state === "busy"}>{state === "busy" ? <><Spinner /> Accepting…</> : "Accept invitation"}</button>}
      </div>
    </Card>
  );
}
