/**
 * POST /api/sso — university sign-in (demo).
 *
 * The student signs in with the ID and password their university gave them;
 * that becomes a normal MoeAI session cookie. In production this is the
 * university's own SSO (SAML or OIDC) and MoeAI never sees the password; the
 * demo keeps the same shape, an org slug plus an external ID, so swapping the
 * password check for a real identity provider changes only this file.
 */
import { NextRequest } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";
import { orgEmail, orgIdentity } from "@/lib/org";
import { orgBySlug } from "@/lib/orgs";

export const runtime = "nodejs";

const attempts = new Map<string, { count: number; reset: number }>();
const LIMIT = 8;
const WINDOW = 10 * 60_000;

function allowed(ip: string) {
  const now = Date.now();
  for (const [k, v] of attempts) if (v.reset < now) attempts.delete(k);
  const bucket = attempts.get(ip) ?? { count: 0, reset: now + WINDOW };
  bucket.count += 1;
  attempts.set(ip, bucket);
  return bucket.count <= LIMIT;
}

export async function POST(req: NextRequest) {
  const origin = req.headers.get("origin");
  if (origin && new URL(origin).host !== req.headers.get("host")) {
    return Response.json({ error: "Request origin not allowed." }, { status: 403 });
  }
  const ip = (req.headers.get("x-forwarded-for") ?? "local").split(",")[0].trim();
  if (!allowed(ip)) return Response.json({ error: "Too many attempts. Wait a few minutes and try again." }, { status: 429 });

  let body: { org?: string; id?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Malformed request." }, { status: 400 });
  }
  // The page sends the public path; accounts live under the internal key.
  const requested = String(body.org ?? "").toLowerCase();
  const org = orgBySlug(requested)?.slug ?? requested;
  const id = String(body.id ?? "").trim();
  const password = String(body.password ?? "");
  if (!/^[a-z0-9-]{2,20}$/.test(org) || !id || !password) {
    return Response.json({ error: "Enter your university ID and password." }, { status: 400 });
  }

  const sb = await supabaseServer();
  const { data, error } = await sb.auth.signInWithPassword({ email: orgEmail(org, id), password });
  if (error || !data.user) {
    return Response.json({ error: "That ID and password do not match." }, { status: 401 });
  }
  const identity = await orgIdentity(sb, data.user.id);
  if (!identity || identity.orgSlug !== org) {
    await sb.auth.signOut();
    return Response.json({ error: "This account is not registered with this university." }, { status: 403 });
  }
  return Response.json({ ok: true, role: identity.role });
}
