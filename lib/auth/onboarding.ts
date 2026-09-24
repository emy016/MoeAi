import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * The onboarding state machine.
 *
 * Nothing about where someone is in onboarding is kept in the browser. The
 * next step is derived, every time, from facts in the database (my_onboarding):
 * is the email confirmed, is there a handle and current consent, how is the
 * app used, which memberships and subscription exist. So a refresh, a closed
 * browser, an OAuth or SSO round trip or a half-finished step all resume at
 * exactly the right place, and nothing is created twice.
 *
 *   account ─► verify email ─► profile (+consent) ─► how will you use MoeAI?
 *     student ─► part of an organization?
 *        yes ─► find organization ─► SSO ─► access ─► home
 *        no  ─► plan ─► home
 *     organization ─► start one or join one?
 *        start ─► plan ─► information ─► setup ─► admin dashboard
 *        join  ─► find organization ─► SSO ─► access ─► organization home
 */
export type Membership = { org_id: string; org: string; slug: string; role: string; status: string; verified: boolean };
export type OnboardingFacts = {
  email_confirmed: boolean;
  profile: { display_name: string | null; handle: string | null; phone: string | null; user_type: string | null; org_choice: string | null; completed_at: string | null } | null;
  consent: boolean;
  memberships: Membership[];
  university: { org_id: string; role: string } | null;
  subscription: { plan: string; status: string } | null;
};

export type Step =
  | "verify" | "profile" | "use" | "affiliation" | "find" | "access" | "plans"
  | "org" | "org-plans" | "org-info" | "done";

const LIVE = new Set(["active", "trialing", "past_due"]);

export function nextStep(f: OnboardingFacts): { step: Step; home: string } {
  const owner = f.memberships.find((m) => m.role === "owner" && m.status === "active");
  const staff = f.memberships.find((m) => (m.role === "teacher" || m.role === "owner") && m.status === "active") || (f.university && f.university.role !== "student");
  const home = owner ? "/org/admin" : staff ? "/organizer" : "/moeai";

  // University (demo SSO) accounts were provisioned by their university.
  if (f.university) return { step: "done", home };
  if (!f.email_confirmed) return { step: "verify", home };
  const p = f.profile;
  if (!p?.handle || !f.consent) return { step: "profile", home };
  if (p.completed_at) return { step: "done", home };
  if (!p.user_type) return { step: "use", home };

  const activeMember = f.memberships.some((m) => m.status === "active");
  if (p.user_type === "student") {
    if (!p.org_choice) return { step: "affiliation", home };
    if (p.org_choice === "member") return { step: activeMember ? "done" : f.memberships.length ? "access" : "find", home };
    return { step: f.subscription && LIVE.has(f.subscription.status) ? "done" : "plans", home };
  }
  // Organization accounts.
  if (!p.org_choice || (p.org_choice !== "start" && p.org_choice !== "join")) return { step: "org", home };
  if (p.org_choice === "join") return { step: activeMember ? "done" : f.memberships.length ? "access" : "find", home };
  return { step: owner ? "done" : "org-plans", home };
}

export const STEP_PATH: Record<Step, string> = {
  verify: "/start/verify",
  profile: "/start/profile",
  use: "/start",
  affiliation: "/start/affiliation",
  find: "/start/find",
  access: "/start/access",
  plans: "/start/plans",
  org: "/start/organization",
  "org-plans": "/start/organization/plans",
  "org-info": "/start/organization/new",
  done: "/moeai",
};

export async function onboardingFacts(sb: SupabaseClient): Promise<OnboardingFacts | null> {
  const { data, error } = await sb.rpc("my_onboarding");
  if (error || !data) return null;
  const f = data as OnboardingFacts;
  return { ...f, memberships: Array.isArray(f.memberships) ? f.memberships : [] };
}
