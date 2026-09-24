/**
 * /api/auth — every account action, server-side.
 *
 * Supabase Auth does the real work (password hashing, email confirmation,
 * OAuth with PKCE, recovery links, SAML SSO, rate limits); this route is the
 * one place the site, the EduMoe pages and the MoeAI app talk to it, so the
 * session cookie is always written by the server and no page needs an SDK.
 *
 * Passwords pass through to Supabase and nowhere else: never logged, never
 * stored, never echoed. Error messages are deliberately vague wherever a
 * precise one would reveal whether an address has an account.
 */
import { NextRequest } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";
import { orgIdentity } from "@/lib/org";
import { safeNext } from "@/lib/auth/next";
import { EMAIL_RE, HANDLE_RE, PHONE_RE, normalizePhone, passwordProblem, signupProblems } from "@/lib/auth/validate";
import { sameOrigin } from "@/lib/rag/staff";

export const runtime = "nodejs";

/** Who is signed in, for the nav buttons, the app's profile pill and the onboarding pages. */
export async function GET() {
  const sb = await supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return Response.json({ signedIn: false }, { headers: { "cache-control": "no-store" } });

  const [{ data: profile }, org] = await Promise.all([
    sb.from("profiles").select("display_name, handle, user_type, onboarding_completed_at").eq("id", user.id).maybeSingle(),
    orgIdentity(sb, user.id).catch(() => null),
  ]);

  return Response.json({
    signedIn: true,
    // A university account's address is internal; show the university ID instead.
    email: org ? `${org.externalId} · ${org.orgName}` : user.email,
    name: profile?.display_name || org?.displayName || user.email?.split("@")[0] || "Student",
    handle: profile?.handle ?? null,
    onboarded: Boolean(org || profile?.onboarding_completed_at),
    org,
  }, { headers: { "cache-control": "no-store" } });
}

// ── Abuse protection ────────────────────────────────────────────────────
// Supabase Auth rate-limits sign-ins, signups and emails per project. This
// adds a per-IP, per-action ceiling in front, so one client cannot burn the
// project's shared email quota or hammer password checks.
const buckets = new Map<string, { count: number; reset: number }>();
const LIMITS: Record<string, [number, number]> = {
  login: [10, 10 * 60_000], signup: [5, 60 * 60_000], forgot: [5, 60 * 60_000], resend: [5, 60 * 60_000],
  oauth: [20, 10 * 60_000], sso: [20, 10 * 60_000], password: [8, 10 * 60_000], email: [5, 60 * 60_000],
  phone: [5, 60 * 60_000], "phone-verify": [10, 10 * 60_000], reset: [8, 10 * 60_000],
};
function allow(ip: string, action: string) {
  const [limit, window] = LIMITS[action] ?? [30, 10 * 60_000];
  const now = Date.now();
  if (buckets.size > 5000) for (const [k, v] of buckets) if (v.reset < now) buckets.delete(k);
  const key = `${action}:${ip}`;
  const bucket = buckets.get(key) ?? { count: 0, reset: now + window };
  if (bucket.reset < now) { bucket.count = 0; bucket.reset = now + window; }
  bucket.count += 1;
  buckets.set(key, bucket);
  return bucket.count <= limit;
}

const fail = (status: number, error: string, extra: Record<string, unknown> = {}) => Response.json({ error, ...extra }, { status });
const OAUTH = new Set(["google", "apple"]);

export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return fail(403, "Request origin not allowed.");
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return fail(400, "Malformed request.");
  }
  const action = String(body.action ?? "");
  const ip = (req.headers.get("x-forwarded-for") ?? "local").split(",")[0].trim();
  const bucket = action === "google" || action === "apple" || action === "oauth" || action === "link" ? "oauth" : action;
  if (!allow(ip, bucket)) return fail(429, "Too many attempts. Wait a few minutes and try again.");

  const sb = await supabaseServer();
  const origin = new URL(req.url).origin;
  const next = safeNext(body.next, "/start/continue");
  const callback = (to: string) => `${origin}/auth/callback?next=${encodeURIComponent(to)}`;
  const email = String(body.email ?? "").trim().toLowerCase();
  const password = String(body.password ?? "");

  switch (action) {
    // ── Sign in ─────────────────────────────────────────────────────────
    case "login": {
      const identifier = String(body.identifier ?? body.email ?? "").trim();
      if (!identifier || !password) return fail(400, "Enter your email or phone number and your password.");
      const byPhone = !identifier.includes("@");
      const phone = byPhone ? normalizePhone(identifier) : "";
      if (byPhone && !PHONE_RE.test(phone)) return fail(400, "Enter a valid email, or a phone number with its country code.");
      const { data, error } = byPhone
        ? await sb.auth.signInWithPassword({ phone, password })
        : await sb.auth.signInWithPassword({ email: identifier.toLowerCase(), password });
      if (error) {
        if (/not confirmed/i.test(error.message)) return fail(403, "Confirm your email first. We can send the link again.", { unverified: true });
        if (/banned|disabled/i.test(error.message)) return fail(403, "This account is disabled. Contact support if you think that is a mistake.");
        // Vague on purpose: which half was wrong would tell an attacker whether the account exists.
        return fail(401, byPhone ? "That phone number and password do not match." : "That email and password do not match.");
      }
      // Two-step verification: the session exists but is not trusted until the second factor.
      const { data: aal } = await sb.auth.mfa.getAuthenticatorAssuranceLevel();
      const mfa = aal?.nextLevel === "aal2" && aal.currentLevel !== "aal2";
      if (!mfa) await sb.rpc("log_auth_event", { p_kind: "sign_in", p_detail: { method: byPhone ? "phone" : "email" } });
      return Response.json({ ok: true, mfa, signedIn: Boolean(data.user) });
    }

    // ── Create an account ───────────────────────────────────────────────
    case "signup": {
      const fields = {
        displayName: String(body.displayName ?? body.name ?? "").trim(),
        handle: String(body.handle ?? "").trim().toLowerCase(),
        email,
        phone: String(body.phone ?? "").trim(),
        password,
        confirm: String(body.confirm ?? password),
        consent: body.consent === true,
      };
      const problems = signupProblems(fields);
      if (Object.keys(problems).length) return fail(400, Object.values(problems)[0]!, { fields: problems });
      const phone = fields.phone ? normalizePhone(fields.phone) : "";
      const [{ data: handleFree }, phoneCheck] = await Promise.all([
        sb.rpc("handle_available", { p_handle: fields.handle }),
        phone ? sb.rpc("phone_available", { p_phone: phone }) : Promise.resolve({ data: true }),
      ]);
      if (!handleFree) return fail(409, "That handle is taken. Try another.", { fields: { handle: "That handle is taken. Try another." } });
      if (!phoneCheck.data) return fail(409, "That phone number is already on another account.", { fields: { phone: "That phone number is already on another account." } });
      const userType = body.userType === "organization" ? "organization" : "student";
      const { data, error } = await sb.auth.signUp({
        email,
        password,
        options: {
          // Read by the handle_new_user trigger; the consent flag is honoured
          // (recorded against the CURRENT document versions) on first sign-in.
          data: { full_name: fields.displayName.slice(0, 60), handle: fields.handle, phone: phone || null, user_type: userType, consent: true },
          emailRedirectTo: callback(next),
        },
      });
      if (error) {
        if (/password/i.test(error.message)) return fail(400, error.message, { fields: { password: error.message } });
        if (/rate|too many/i.test(error.message)) return fail(429, "Too many signups from here right now. Try again later.");
        return fail(400, "The account could not be created. Check your details and try again.");
      }
      // An address that already has an account comes back with no identities.
      // Answer exactly as for a new one, so signup cannot probe for accounts.
      if (data.session) {
        await sb.rpc("accept_current_legal");
        await sb.rpc("log_auth_event", { p_kind: "sign_up", p_detail: { method: "email" } });
      }
      return Response.json({
        ok: true,
        confirmed: Boolean(data.session),
        message: data.session ? "You're in." : "Check your inbox. Open the link we sent to confirm your email.",
      });
    }

    case "resend": {
      if (!EMAIL_RE.test(email)) return fail(400, "Enter a valid email address.");
      await sb.auth.resend({ type: "signup", email, options: { emailRedirectTo: callback(next) } });
      return Response.json({ ok: true, message: "If that address is waiting for confirmation, a new link is on its way." });
    }

    // ── Google, Apple (and linking them to an existing account) ────────
    case "google":
    case "apple":
    case "oauth": {
      const provider = action === "oauth" ? String(body.provider ?? "") : action;
      if (!OAUTH.has(provider)) return fail(400, "Unknown provider.");
      const { data, error } = await sb.auth.signInWithOAuth({
        provider: provider as "google" | "apple",
        options: { redirectTo: callback(next), ...(provider === "google" ? { queryParams: { prompt: "select_account" } } : {}) },
      });
      if (error || !data?.url) {
        return fail(503, `${provider === "google" ? "Google" : "Apple"} sign-in is not switched on for MoeAI yet. Use email for now.`, { notConfigured: true });
      }
      return Response.json({ ok: true, url: data.url });
    }

    case "link": {
      const provider = String(body.provider ?? "");
      if (!OAUTH.has(provider)) return fail(400, "Unknown provider.");
      const { data: { user } } = await sb.auth.getUser();
      if (!user) return fail(401, "Sign in first.");
      const { data, error } = await sb.auth.linkIdentity({ provider: provider as "google" | "apple", options: { redirectTo: callback("/account?linked=1") } });
      if (error || !data?.url) return fail(503, "Connecting another sign-in method is not switched on yet.", { notConfigured: true });
      return Response.json({ ok: true, url: data.url });
    }

    case "unlink": {
      const provider = String(body.provider ?? "");
      const { data: ids } = await sb.auth.getUserIdentities();
      const identities = ids?.identities ?? [];
      const target = identities.find((i) => i.provider === provider);
      if (!target) return fail(404, "That sign-in method is not connected.");
      // Never remove the last way in.
      if (identities.length < 2) return fail(409, "This is your only way to sign in. Add another method first.");
      const { error } = await sb.auth.unlinkIdentity(target);
      if (error) return fail(400, "That sign-in method could not be removed.");
      await sb.rpc("log_auth_event", { p_kind: "oauth_unlinked", p_detail: { provider } });
      return Response.json({ ok: true });
    }

    // ── University / organization single sign-on (SAML via Supabase) ───
    case "sso": {
      const domain = String(body.domain ?? "").trim().toLowerCase();
      const providerId = String(body.providerId ?? "").trim();
      if (!domain && !providerId) return fail(400, "Pick your organization.");
      const { data, error } = providerId
        ? await sb.auth.signInWithSSO({ providerId, options: { redirectTo: callback(next) } })
        : await sb.auth.signInWithSSO({ domain, options: { redirectTo: callback(next) } });
      if (error || !data?.url) return fail(503, "This organization's single sign-on is not connected yet. Ask its admin for an invitation instead.", { notConfigured: true });
      return Response.json({ ok: true, url: data.url });
    }

    // ── Passwords ───────────────────────────────────────────────────────
    case "forgot": {
      if (!EMAIL_RE.test(email)) return fail(400, "Enter a valid email address.");
      await sb.auth.resetPasswordForEmail(email, { redirectTo: callback("/start/reset") });
      // Same answer whether or not the address has an account.
      return Response.json({ ok: true, message: "If that address has an account, a reset link is on its way. It works once and expires within the hour." });
    }

    case "reset": {
      const { data: { user } } = await sb.auth.getUser();
      if (!user) return fail(401, "This reset link has expired or was already used. Request a new one.", { expired: true });
      const problem = passwordProblem(password, user.email ?? "");
      if (problem) return fail(400, problem, { fields: { password: problem } });
      if (String(body.confirm ?? "") !== password) return fail(400, "The passwords do not match.", { fields: { confirm: "The passwords do not match." } });
      const { error } = await sb.auth.updateUser({ password });
      if (error) return fail(400, /same/i.test(error.message) ? "Choose a password you have not used here before." : "The password could not be changed. Request a new link.");
      await sb.rpc("log_auth_event", { p_kind: "password_changed", p_detail: { via: "reset" } });
      return Response.json({ ok: true });
    }

    case "password": {
      const { data: { user } } = await sb.auth.getUser();
      if (!user?.email) return fail(401, "Sign in first.");
      const current = String(body.current ?? "");
      const hasPassword = (user.app_metadata?.providers as string[] | undefined)?.includes("email");
      // Re-authenticate before a sensitive change when the account has a password.
      if (hasPassword) {
        const { error } = await sb.auth.signInWithPassword({ email: user.email, password: current });
        if (error) return fail(401, "Your current password is not right.", { fields: { current: "Your current password is not right." } });
      }
      const problem = passwordProblem(password, user.email);
      if (problem) return fail(400, problem, { fields: { password: problem } });
      const { error } = await sb.auth.updateUser({ password });
      if (error) return fail(400, "The password could not be changed.");
      await sb.rpc("log_auth_event", { p_kind: "password_changed", p_detail: { via: "settings" } });
      return Response.json({ ok: true });
    }

    // ── Email and phone changes (each verified by the provider) ────────
    case "email": {
      if (!EMAIL_RE.test(email)) return fail(400, "Enter a valid email address.");
      const { data: { user } } = await sb.auth.getUser();
      if (!user) return fail(401, "Sign in first.");
      const { error } = await sb.auth.updateUser({ email }, { emailRedirectTo: callback("/account?email=1") });
      if (error) return fail(400, "That email could not be used.");
      await sb.rpc("log_auth_event", { p_kind: "email_change_requested", p_detail: {} });
      return Response.json({ ok: true, message: "Confirm the change from the link we sent to the new address." });
    }

    case "phone": {
      const phone = normalizePhone(String(body.phone ?? ""));
      if (!PHONE_RE.test(phone)) return fail(400, "Enter the number with its country code.");
      const { data: { user } } = await sb.auth.getUser();
      if (!user) return fail(401, "Sign in first.");
      const { data: free } = await sb.rpc("phone_available", { p_phone: phone });
      if (!free) return fail(409, "That phone number is already on another account.");
      const { error } = await sb.auth.updateUser({ phone });
      if (error) return fail(503, "Text-message verification is not switched on for MoeAI yet.", { notConfigured: true });
      await sb.rpc("log_auth_event", { p_kind: "phone_change_requested", p_detail: {} });
      return Response.json({ ok: true, message: "We texted you a code." });
    }

    case "phone-verify": {
      const phone = normalizePhone(String(body.phone ?? ""));
      const token = String(body.token ?? "").trim();
      if (!PHONE_RE.test(phone) || !/^[0-9]{6}$/.test(token)) return fail(400, "Enter the 6-digit code.");
      const { error } = await sb.auth.verifyOtp({ phone, token, type: "phone_change" });
      if (error) return fail(400, /expired/i.test(error.message) ? "That code has expired. Send a new one." : "That code is not right.");
      await sb.rpc("update_my_profile", { p_phone: phone });
      return Response.json({ ok: true });
    }

    case "mfa-verified": {
      // Logged only once the session really is at the second factor.
      const { data: aal } = await sb.auth.mfa.getAuthenticatorAssuranceLevel();
      if (aal?.currentLevel !== "aal2") return fail(401, "Two-step verification is not complete.");
      await sb.rpc("log_auth_event", { p_kind: "sign_in", p_detail: { method: "password+totp" } });
      return Response.json({ ok: true });
    }

    case "handle-check": {
      const handle = String(body.handle ?? "").trim().toLowerCase();
      if (!HANDLE_RE.test(handle)) return Response.json({ available: false, reason: "format" });
      const { data } = await sb.rpc("handle_available", { p_handle: handle });
      return Response.json({ available: Boolean(data) });
    }

    // ── Sign out ────────────────────────────────────────────────────────
    case "logout": {
      await sb.rpc("log_auth_event", { p_kind: "sign_out", p_detail: {} }).then(() => undefined, () => undefined);
      // "global" ends every session of this account, on every device.
      await sb.auth.signOut({ scope: body.everywhere === true ? "global" : "local" });
      return Response.json({ ok: true });
    }

    default:
      return fail(400, "Unknown action.");
  }
}
