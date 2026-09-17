/**
 * /api/state — cross-device mirror of the pages' own working state.
 *
 * The ported pages keep course progress, quiz history, bookmarks and theme
 * choice in localStorage. That is the right place for them to read and write;
 * it is the wrong place for them to *live*, because a student who opens the
 * site on a phone then finds an empty account.
 *
 * This stores the same keys per user so state follows the person. It is
 * deliberately key/value: the pages own their own shapes, and duplicating
 * those shapes here would create a second definition to drift from.
 */
import { NextRequest } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";

export const runtime = "nodejs";

const MAX_KEYS = 40;
const MAX_VALUE_BYTES = 256 * 1024;   // one key's payload
const MAX_TOTAL_BYTES = 1024 * 1024;  // one request

export async function GET() {
  const sb = await supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return Response.json({ state: {} }, { status: 200 });

  const { data, error } = await sb
    .from("user_state")
    .select("key, value")
    .order("updated_at", { ascending: false })
    .limit(MAX_KEYS);

  if (error) return Response.json({ state: {} }, { status: 200 });

  const state: Record<string, unknown> = {};
  for (const row of data ?? []) state[row.key] = row.value;
  return Response.json({ state });
}

export async function POST(req: NextRequest) {
  const sb = await supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  // Signed-out visitors keep working entirely in localStorage. Their writes
  // are accepted and dropped rather than erroring, so the pages never have to
  // care whether anyone is signed in.
  if (!user) return Response.json({ ok: true, stored: 0 });

  let body: { state?: Record<string, unknown> };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Malformed request." }, { status: 400 });
  }

  const entries = Object.entries(body.state ?? {}).slice(0, MAX_KEYS);
  if (entries.length === 0) return Response.json({ ok: true, stored: 0 });

  let total = 0;
  const rows = [];
  for (const [key, value] of entries) {
    const size = JSON.stringify(value ?? null).length;
    if (size > MAX_VALUE_BYTES) continue;      // skip the oversized key, keep the rest
    total += size;
    if (total > MAX_TOTAL_BYTES) break;
    rows.push({
      user_id: user.id,
      key: key.slice(0, 120),
      value: value ?? null,
      updated_at: new Date().toISOString(),
    });
  }

  if (rows.length === 0) return Response.json({ ok: true, stored: 0 });

  const { error } = await sb.from("user_state").upsert(rows, { onConflict: "user_id,key" });
  if (error) return Response.json({ error: "Could not save your progress." }, { status: 500 });

  return Response.json({ ok: true, stored: rows.length });
}
