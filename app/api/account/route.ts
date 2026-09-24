/**
 * /api/account — the student's own data.
 *
 *   GET                      → everything MoeAI stores about them, as JSON (export)
 *   POST {action:"delete", confirm:"DELETE"} → deletes the account
 *
 * Both run as the student, so RLS limits the export to their own rows and the
 * deletion to their own account. delete_my_account() refuses while they are
 * the only owner of an organization that still has members, so leaving never
 * orphans an organization or deletes what belongs to it.
 */
import { NextRequest } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";
import { sameOrigin } from "@/lib/rag/staff";

export const runtime = "nodejs";

const OWN_TABLES: [string, string][] = [
  ["profiles", "id"], ["user_state", "user_id"], ["conversations", "user_id"], ["student_memory", "user_id"],
  ["quiz_attempts", "user_id"], ["ranked_profiles", "user_id"], ["consents", "user_id"], ["subscriptions", "user_id"],
  ["message_feedback", "user_id"], ["org_members", "user_id"], ["course_enrollments", "user_id"], ["auth_events", "user_id"], ["nudges", "user_id"],
];

export async function GET() {
  const sb = await supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return Response.json({ error: "Sign in to export your data." }, { status: 401 });
  const out: Record<string, unknown> = {
    exported_at: new Date().toISOString(),
    account: { id: user.id, email: user.email, phone: user.phone || null, created_at: user.created_at, providers: user.app_metadata?.providers ?? [] },
  };
  for (const [table, column] of OWN_TABLES) {
    const { data } = await sb.from(table).select("*").eq(column, user.id).limit(5000);
    out[table] = data ?? [];
  }
  const convIds = ((out.conversations as { id: string }[]) ?? []).map((c) => c.id);
  if (convIds.length) {
    const { data } = await sb.from("messages").select("*").in("conversation_id", convIds).limit(20000);
    out.messages = data ?? [];
  }
  await sb.rpc("log_auth_event", { p_kind: "account_export", p_detail: {} });
  return new Response(JSON.stringify(out, null, 2), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "content-disposition": `attachment; filename="moeai-data-${new Date().toISOString().slice(0, 10)}.json"`,
      "cache-control": "no-store",
    },
  });
}

export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return Response.json({ error: "Request origin not allowed." }, { status: 403 });
  const body = await req.json().catch(() => ({}));
  if (body?.action !== "delete" || body?.confirm !== "DELETE") {
    return Response.json({ error: 'Type DELETE to confirm.' }, { status: 400 });
  }
  const sb = await supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return Response.json({ error: "Your session expired. Sign in again to delete your account." }, { status: 401 });
  // Sensitive: the session must be recent, not a week-old cookie.
  const lastSignIn = user.last_sign_in_at ? Date.parse(user.last_sign_in_at) : 0;
  if (Date.now() - lastSignIn > 15 * 60_000) {
    return Response.json({ error: "For your safety, sign in again, then delete your account within 15 minutes.", reauth: true }, { status: 403 });
  }
  const { error } = await sb.rpc("delete_my_account");
  if (error) return Response.json({ error: error.message }, { status: 409 });
  await sb.auth.signOut().catch(() => undefined);
  return Response.json({ ok: true });
}
