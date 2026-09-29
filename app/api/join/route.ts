/**
 * POST /api/join { code }: redeem a class link (see app/join/[code]). The
 * database function does the checks: signed in, code active and not full,
 * membership not suspended. Joining twice is harmless.
 */
import { NextRequest } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";
import { sameOrigin } from "@/lib/rag/staff";

export const runtime = "nodejs";

const attempts = new Map<string, { count: number; reset: number }>();
function allowed(key: string) {
  const now = Date.now();
  for (const [k, v] of attempts) if (v.reset < now) attempts.delete(k);
  const bucket = attempts.get(key) ?? { count: 0, reset: now + 10 * 60_000 };
  bucket.count += 1;
  attempts.set(key, bucket);
  return bucket.count <= 10;
}

export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return Response.json({ error: "Request origin not allowed." }, { status: 403 });
  const sb = await supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return Response.json({ error: "Sign in first." }, { status: 401 });
  if (!allowed(user.id)) return Response.json({ error: "Too many tries. Wait a few minutes." }, { status: 429 });
  const body = await req.json().catch(() => ({}));
  const code = String(body?.code ?? "").toUpperCase().replace(/[^A-Z0-9-]/g, "").slice(0, 32);
  if (code.length < 6) return Response.json({ error: "That class link looks incomplete." }, { status: 400 });
  const { data, error } = await sb.rpc("redeem_join_code", { p_code: code });
  if (error) return Response.json({ error: error.message || "That class link did not work." }, { status: 400 });
  const row = Array.isArray(data) ? data[0] : data;
  return Response.json({ ok: true, org: row?.org_name ?? "Your university", courses: Number(row?.courses ?? 0), already: Boolean(row?.already) });
}
