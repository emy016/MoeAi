import "server-only";
/**
 * Web push: MoeAI's notifications reach the student's browser even when the
 * app is closed, the way YouTube's do in Chrome. The browser gives each device
 * a push endpoint (stored in push_subscriptions); the server signs messages
 * with the VAPID key pair from the environment. A gone endpoint (404/410) is
 * deleted so dead devices do not pile up.
 */
import webpush from "web-push";
import type { SupabaseClient } from "@supabase/supabase-js";

let configured: boolean | null = null;

export const vapidPublicKey = () => process.env.VAPID_PUBLIC_KEY || process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "";

function configure(): boolean {
  if (configured !== null) return configured;
  const publicKey = vapidPublicKey();
  const privateKey = process.env.VAPID_PRIVATE_KEY || "";
  if (!publicKey || !privateKey) return (configured = false);
  webpush.setVapidDetails(process.env.VAPID_SUBJECT || "mailto:hello@moeai.app", publicKey, privateKey);
  return (configured = true);
}

export type PushMessage = { title: string; body: string; url?: string; tag?: string };

/** Sends to every device the student subscribed; returns how many accepted it. */
export async function sendPush(admin: SupabaseClient, userId: string, message: PushMessage): Promise<number> {
  if (!configure()) return 0;
  const { data } = await admin.from("push_subscriptions").select("endpoint, p256dh, auth").eq("user_id", userId);
  let sent = 0;
  for (const sub of (data ?? []) as { endpoint: string; p256dh: string; auth: string }[]) {
    try {
      await webpush.sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }, JSON.stringify(message), { TTL: 6 * 3600 });
      sent += 1;
    } catch (err) {
      const status = (err as { statusCode?: number }).statusCode;
      if (status === 404 || status === 410) await admin.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
    }
  }
  return sent;
}
