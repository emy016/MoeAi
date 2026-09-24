/**
 * /api/onboarding — every onboarding step, as the signed-in person.
 *
 *   GET                      → { signedIn, facts, step, path, home }
 *   GET ?plans=student|organization → the plan structure (commercial values unset)
 *   POST { action, ... }     → one step; the database functions it calls check
 *                              auth.uid() themselves, so nothing here can grant
 *                              access the database would not.
 */
import { NextRequest } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";
import { STEP_PATH, nextStep, onboardingFacts } from "@/lib/auth/onboarding";
import { HANDLE_RE, PHONE_RE, normalizePhone } from "@/lib/auth/validate";
import { sameOrigin } from "@/lib/rag/staff";

export const runtime = "nodejs";

const NO_STORE = { headers: { "cache-control": "no-store" } };
const fail = (status: number, error: string, extra: Record<string, unknown> = {}) => Response.json({ error, ...extra }, { status });

/** Database errors, translated to what the person can act on. Never raw SQL. */
function friendly(message: string | undefined, fallback: string) {
  const m = message ?? "";
  if (m.includes("handle_taken")) return "That handle is taken. Try another.";
  if (m.includes("phone_taken")) return "That phone number is already on another account.";
  if (m.includes("owners only") || m.includes("only an organization owner")) return "Only an owner of this organization can do that.";
  if (m.includes("another verified email")) return "This invitation was sent to a different email address. Sign in with that address to accept it.";
  if (m.includes("invitation expired")) return "This invitation has expired. Ask the organization for a new one.";
  if (m.includes("invalid invitation") || m.includes("invitation is")) return "This invitation link is not valid any more.";
  if (m.includes("not signed in")) return "Your session expired. Sign in again.";
  return fallback;
}

async function state(sb: Awaited<ReturnType<typeof supabaseServer>>) {
  const facts = await onboardingFacts(sb);
  if (!facts) return null;
  const { step, home } = nextStep(facts);
  return { facts, step, path: step === "done" ? home : STEP_PATH[step], home };
}

export async function GET(req: NextRequest) {
  const sb = await supabaseServer();
  const plansFor = req.nextUrl.searchParams.get("plans");
  if (plansFor === "student" || plansFor === "organization") {
    const { data, error } = await sb
      .from("plans")
      .select("id, name, billing_interval, price_minor, currency, features, limits, entitlements, seat_limit, trial_enabled, trial_days, status")
      .eq("target", plansFor)
      .order("sort");
    if (error) return fail(500, "Plans could not be loaded. Try again.");
    return Response.json({ plans: data ?? [] }, NO_STORE);
  }
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return Response.json({ signedIn: false }, NO_STORE);
  const s = await state(sb);
  if (!s) return fail(500, "Your account could not be loaded. Try again.");
  return Response.json({
    signedIn: true,
    email: user.email ?? null,
    providers: (user.app_metadata?.providers as string[] | undefined) ?? [],
    ...s,
  }, NO_STORE);
}

export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return fail(403, "Request origin not allowed.");
  const body = await req.json().catch(() => null);
  if (!body || typeof body.action !== "string") return fail(400, "Malformed request.");
  const sb = await supabaseServer();

  // Organization lookup works before sign-in: the first step of "part of an organization".
  if (body.action === "find") {
    const q = String(body.q ?? "").trim().slice(0, 80);
    if (q.length < 2) return Response.json({ results: [] });
    const { data, error } = await sb.rpc("find_organizations", { q });
    if (error) return fail(500, "Search is unavailable right now. Try again.");
    return Response.json({ results: data ?? [] });
  }

  const { data: { user } } = await sb.auth.getUser();
  if (!user) return fail(401, "Your session expired. Sign in again.", { signIn: true });

  switch (body.action) {
    case "use": {
      if (body.value !== "student" && body.value !== "organization") return fail(400, "Choose student or organization.");
      const { error } = await sb.rpc("update_my_profile", { p_user_type: body.value });
      if (error) return fail(500, friendly(error.message, "That could not be saved. Try again."));
      break;
    }
    case "profile": {
      const handle = String(body.handle ?? "").trim().toLowerCase();
      const displayName = String(body.displayName ?? "").trim();
      const phone = body.phone ? normalizePhone(String(body.phone)) : "";
      if (displayName.length < 2 || displayName.length > 60) return fail(400, "Tell us what to call you (2–60 characters).", { field: "displayName" });
      if (!HANDLE_RE.test(handle)) return fail(400, "Handles are 3–24 characters: letters, numbers, dots and underscores.", { field: "handle" });
      if (phone && !PHONE_RE.test(phone)) return fail(400, "Enter the number with its country code.", { field: "phone" });
      if (body.consent !== true) {
        const { data: ok } = await sb.rpc("has_current_consent");
        if (!ok) return fail(400, "You need to accept the Terms and Privacy Policy to continue.", { field: "consent" });
      }
      const { error } = await sb.rpc("update_my_profile", { p_display_name: displayName, p_handle: handle, p_phone: phone || null });
      if (error) return fail(409, friendly(error.message, "That could not be saved. Try again."), { field: error.message.includes("phone") ? "phone" : "handle" });
      if (body.consent === true) {
        const { error: consentError } = await sb.rpc("accept_current_legal");
        if (consentError) return fail(500, "Your consent could not be recorded. Try again.");
      }
      break;
    }
    case "affiliation": {
      if (body.value !== "member" && body.value !== "independent") return fail(400, "Choose one.");
      const { error } = await sb.rpc("update_my_profile", { p_org_choice: body.value });
      if (error) return fail(500, friendly(error.message, "That could not be saved. Try again."));
      break;
    }
    case "org-choice": {
      if (body.value !== "start" && body.value !== "join") return fail(400, "Choose one.");
      const { error } = await sb.rpc("update_my_profile", { p_user_type: "organization", p_org_choice: body.value });
      if (error) return fail(500, friendly(error.message, "That could not be saved. Try again."));
      break;
    }
    case "plan": {
      const plan = String(body.plan ?? "");
      const { data, error } = await sb.rpc("choose_plan", { p_plan: plan, p_org: null });
      if (error) return fail(400, friendly(error.message, "That plan could not be selected."));
      const status = (Array.isArray(data) ? data[0] : data)?.status;
      if (status !== "active") return fail(409, "This plan is not available yet.", { notConfigured: true });
      await sb.rpc("complete_onboarding");
      break;
    }
    case "org-create": {
      const name = String(body.name ?? "").trim();
      const type = String(body.type ?? "");
      const domain = body.domain ? String(body.domain).trim().toLowerCase() : null;
      const country = body.country ? String(body.country).trim().toUpperCase().slice(0, 2) : null;
      const request = String(body.request ?? "");
      const plan = String(body.plan ?? "org_free");
      if (name.length < 2 || name.length > 120) return fail(400, "Enter the organization's name.", { field: "name" });
      if (!["university", "school", "institute", "company", "other"].includes(type)) return fail(400, "Choose what kind of organization it is.", { field: "type" });
      if (domain && !/^[a-z0-9.-]+\.[a-z]{2,}$/.test(domain)) return fail(400, "Enter a domain like example.edu, without http or @.", { field: "domain" });
      if (!/^[0-9a-f-]{36}$/i.test(request)) return fail(400, "Malformed request.");
      // Check the plan before creating anything, so a paid plan that is not
      // configured never leaves a half-made organization behind.
      const { data: planRow } = await sb.from("plans").select("status, billing_interval, target").eq("id", plan).maybeSingle();
      if (!planRow || planRow.target !== "organization") return fail(400, "Choose a plan.");
      if (planRow.status !== "available" || planRow.billing_interval !== "none") return fail(409, "This plan is not available yet.", { notConfigured: true });
      const { data, error } = await sb.rpc("create_organization", { p_name: name, p_type: type, p_request: request, p_domain: domain, p_country: country });
      if (error) return fail(400, friendly(error.message, "The organization could not be created. Try again."));
      const org = Array.isArray(data) ? data[0] : data;
      const { error: planError } = await sb.rpc("choose_plan", { p_plan: plan, p_org: org.id });
      if (planError) return fail(500, "The organization was created, but its plan could not be set. Open the admin dashboard to finish.", { orgId: org.id });
      await sb.rpc("complete_onboarding");
      return Response.json({ ok: true, orgId: org.id, slug: org.slug, created: org.created, path: "/org/admin" });
    }
    case "access": {
      const orgId = String(body.orgId ?? "");
      if (!/^[0-9a-f-]{36}$/i.test(orgId)) return fail(400, "Pick an organization.");
      const { data, error } = await sb.rpc("my_org_access", { p_org: orgId });
      const row = Array.isArray(data) ? data[0] : data;
      if (error || !row) return fail(404, "That organization was not found.");
      if (row.membership === "active" && row.org_status === "active") await sb.rpc("complete_onboarding");
      return Response.json({ access: row });
    }
    case "invite-accept": {
      const token = String(body.token ?? "");
      if (!/^[0-9a-f]{48}$/.test(token)) return fail(400, "This invitation link is not valid.");
      const { data, error } = await sb.rpc("accept_invitation", { p_token: token });
      if (error) return fail(403, friendly(error.message, "The invitation could not be accepted."));
      await sb.rpc("update_my_profile", { p_org_choice: "member" });
      await sb.rpc("complete_onboarding");
      return Response.json({ ok: true, membership: Array.isArray(data) ? data[0] : data });
    }
    default:
      return fail(400, "Unknown action.");
  }
  const s = await state(sb);
  return Response.json({ ok: true, ...s }, NO_STORE);
}
