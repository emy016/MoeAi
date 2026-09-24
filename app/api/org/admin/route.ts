/**
 * /api/org/admin — the organization admin dashboard's data and actions.
 *
 * Authorization lives in the database: org_roster, invite_member and
 * set_member_status each check that auth.uid() is an ACTIVE OWNER of that
 * organization, and RLS limits the organization, invitation and subscription
 * rows to its owners. This route only shapes requests; it cannot grant.
 */
import { NextRequest } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";
import { sameOrigin } from "@/lib/rag/staff";

export const runtime = "nodejs";

const UUID = /^[0-9a-f-]{36}$/i;
const fail = (status: number, error: string) => Response.json({ error }, { status });

export async function GET(req: NextRequest) {
  const sb = await supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return fail(401, "Sign in to manage your organization.");
  const { data: owned } = await sb.from("org_members").select("org_id, organizations(id, name, slug, type, country, email_domain, verified, status, sso_provider, created_at)")
    .eq("user_id", user.id).eq("role", "owner").eq("status", "active");
  const orgs = (owned ?? []).map((m) => (Array.isArray(m.organizations) ? m.organizations[0] : m.organizations)).filter(Boolean) as { id: string }[];
  if (!orgs.length) return Response.json({ orgs: [], org: null });
  const pick = req.nextUrl.searchParams.get("org");
  const org = orgs.find((o) => o.id === pick) ?? orgs[0];
  const [roster, invitations, subscription, courses] = await Promise.all([
    sb.rpc("org_roster", { p_org: org.id }),
    sb.from("org_invitations").select("id, email, role, status, expires_at, created_at").eq("org_id", org.id).order("created_at", { ascending: false }).limit(50),
    sb.from("subscriptions").select("plan_id, status, current_period_end, created_at, plans(name, billing_interval, price_minor, currency, seat_limit, features, limits, status)")
      .eq("org_id", org.id).order("created_at", { ascending: false }).limit(1).maybeSingle(),
    sb.from("courses").select("id, code, title").eq("org_id", org.id).order("code"),
  ]);
  return Response.json({
    orgs,
    org,
    roster: roster.data ?? [],
    invitations: invitations.data ?? [],
    subscription: subscription.data ?? null,
    courses: courses.data ?? [],
  }, { headers: { "cache-control": "no-store" } });
}

export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return fail(403, "Request origin not allowed.");
  const body = await req.json().catch(() => null);
  const orgId = String(body?.orgId ?? "");
  if (!UUID.test(orgId)) return fail(400, "Pick an organization.");
  const sb = await supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return fail(401, "Your session expired. Sign in again.");

  switch (body.action) {
    case "invite": {
      const email = String(body.email ?? "").trim().toLowerCase();
      const role = body.role === "teacher" ? "teacher" : "student";
      const { data: token, error } = await sb.rpc("invite_member", { p_org: orgId, p_email: email, p_role: role });
      if (error) return fail(error.message.includes("owners") ? 403 : 400, error.message.includes("owners") ? "Only owners can invite." : "Enter a valid email address.");
      // The raw token exists only in this response; the database keeps its hash.
      const link = `${new URL(req.url).origin}/start/invite?token=${token}`;
      return Response.json({ ok: true, link });
    }
    case "revoke": {
      const id = String(body.id ?? "");
      if (!UUID.test(id)) return fail(400, "Pick an invitation.");
      const { data, error } = await sb.rpc("revoke_invitation", { p_id: id });
      if (error) return fail(403, "Only owners can revoke invitations.");
      return Response.json({ ok: true, revoked: Boolean(data) });
    }
    case "status": {
      const userId = String(body.userId ?? "");
      const status = String(body.status ?? "");
      if (!UUID.test(userId) || !["active", "suspended", "removed"].includes(status)) return fail(400, "Malformed request.");
      const { error } = await sb.rpc("set_member_status", { p_org: orgId, p_user: userId, p_status: status });
      if (error) return fail(403, error.message.includes("yourself") ? "You cannot change your own membership." : "Only owners can change memberships.");
      return Response.json({ ok: true });
    }
    case "update": {
      const patch: Record<string, string | null> = {};
      if (typeof body.name === "string") {
        const name = body.name.trim();
        if (name.length < 2 || name.length > 120) return fail(400, "Enter the organization's name.");
        patch.name = name;
      }
      if (typeof body.description === "string") patch.description = body.description.trim().slice(0, 500) || null;
      if (Object.keys(patch).length === 0) return fail(400, "Nothing to change.");
      const { error, count } = await sb.from("organizations").update(patch, { count: "exact" }).eq("id", orgId);
      if (error || !count) return fail(403, "Only owners can edit the organization.");
      return Response.json({ ok: true });
    }
    default:
      return fail(400, "Unknown action.");
  }
}
