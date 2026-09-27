/**
 * /api/push: browser push subscriptions for MoeAI's notifications.
 *   GET    → { publicKey }            (the VAPID key the browser subscribes with)
 *   POST   { subscription }           (save this device)
 *   DELETE { endpoint }               (forget this device)
 */
import { NextRequest } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";
import { vapidPublicKey } from "@/lib/moeai/push";

export const runtime = "nodejs";

export async function GET() {
  return Response.json({ publicKey: vapidPublicKey() || null });
}

async function user() {
  const sb = await supabaseServer();
  const { data } = await sb.auth.getUser();
  return { sb, userId: data.user?.id ?? null };
}

export async function POST(req: NextRequest) {
  const { sb, userId } = await user();
  if (!userId) return Response.json({ error: "Sign in to get notifications." }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const sub = body?.subscription;
  const endpoint = String(sub?.endpoint ?? "");
  const p256dh = String(sub?.keys?.p256dh ?? "");
  const auth = String(sub?.keys?.auth ?? "");
  if (!/^https:\/\//.test(endpoint) || endpoint.length > 1000 || !p256dh || !auth) return Response.json({ error: "Invalid subscription." }, { status: 400 });
  const { error } = await sb.from("push_subscriptions").upsert({ endpoint, p256dh, auth, user_id: userId });
  if (error) return Response.json({ error: "Could not save this device." }, { status: 500 });
  return Response.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const { sb, userId } = await user();
  if (!userId) return Response.json({ ok: true });
  const body = await req.json().catch(() => ({}));
  await sb.from("push_subscriptions").delete().eq("endpoint", String(body?.endpoint ?? ""));
  return Response.json({ ok: true });
}
