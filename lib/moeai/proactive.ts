import "server-only";
/**
 * MoeAI messaging first.
 *
 * For each recently active student the server decides whether there is a
 * reason to reach out (deadline soon, first lecture never started, a fun fact
 * after a quiet day), writes one short line in MoeAI's voice and in the
 * language the student uses with it, and delivers it three ways: as a DM
 * message, as an in-app notification (nudge), and as a web push. Replying to
 * the notification opens the DM with that message as context.
 *
 * Limits: at most three a day per student, none between 1am and 9am in the
 * student's local time, and never the same deadline twice.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { conversationLanguage, describe, EN, type Target } from "../emy/language";
import { voiceCalibration } from "../emy/voice";
import { sendPush } from "./push";

const DAY = 86_400_000;
const MAX_PER_DAY = 3;
const DEFAULT_TZ_OFFSET = -180; // UTC+3, the pilot's timezone, when the device never reported one

type Trigger = { kind: "deadline" | "start" | "fun" | "dormant"; facts: string; key: string };

type Complete = (system: string, prompt: string) => Promise<string>;

async function localHour(admin: SupabaseClient, userId: string): Promise<number> {
  const { data } = await admin.from("student_events").select("data").eq("user_id", userId).not("data->tz", "is", null).order("created_at", { ascending: false }).limit(1);
  const tz = Number((data?.[0]?.data as { tz?: number } | undefined)?.tz);
  const offset = Number.isFinite(tz) ? tz : DEFAULT_TZ_OFFSET;
  return new Date(Date.now() - offset * 60_000).getUTCHours();
}

async function languageOf(admin: SupabaseClient, userId: string): Promise<Target> {
  const [{ data: dms }, { data: chats }] = await Promise.all([
    admin.from("dm_messages").select("content").eq("user_id", userId).eq("role", "user").order("id", { ascending: false }).limit(6),
    admin.from("student_events").select("summary").eq("user_id", userId).eq("kind", "chat").order("created_at", { ascending: false }).limit(6),
  ]);
  const texts = [
    ...(chats ?? []).map((c: { summary: string }) => c.summary.replace(/^Asked[^:]*:\s*/, "")),
    ...(dms ?? []).map((d: { content: string }) => d.content),
  ].reverse();
  return conversationLanguage(texts) ?? EN;
}

async function deadlinesFor(admin: SupabaseClient, userId: string) {
  const { data } = await admin.from("user_state").select("value").eq("user_id", userId).like("key", "%user-calendar-events-v1%").limit(1);
  try {
    const raw = data?.[0]?.value;
    const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
    const list: Record<string, unknown>[] = Array.isArray(parsed) ? parsed : Array.isArray(parsed?.events) ? parsed.events : [];
    const now = Date.now();
    return list
      .filter((e) => !e.completed && !e.done)
      .map((e) => ({ title: String(e.title || e.name || "").slice(0, 80), at: Date.parse(String(e.due || e.end || e.start || e.date || "")) }))
      .filter((e) => e.title && Number.isFinite(e.at) && e.at > now && e.at < now + 6 * 3_600_000)
      .sort((a, b) => a.at - b.at);
  } catch {
    return [];
  }
}

async function pickTrigger(admin: SupabaseClient, userId: string, sentToday: string[]): Promise<Trigger | null> {
  const soon = await deadlinesFor(admin, userId);
  for (const d of soon) {
    const key = `deadline:${d.title}`;
    if (sentToday.some((b) => b.includes(key))) continue;
    const hours = Math.max(1, Math.round((d.at - Date.now()) / 3_600_000));
    return { kind: "deadline", key, facts: `"${d.title}" is due in about ${hours} hour${hours > 1 ? "s" : ""}.` };
  }
  const { count: studied } = await admin.from("student_events").select("id", { count: "exact", head: true }).eq("user_id", userId).in("kind", ["chat", "lecture", "practice", "exam", "flashcards"]);
  if (!studied && !sentToday.some((b) => b.includes("start:"))) {
    return { kind: "start", key: "start:first", facts: "They signed in but have not opened a single lecture or chat with you yet." };
  }
  const { data: last } = await admin.from("student_events").select("created_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(1);
  const quietFor = last?.[0] ? Date.now() - Date.parse(last[0].created_at) : Infinity;
  if (quietFor > 3 * DAY && !sentToday.length) return { kind: "dormant", key: "dormant", facts: `They have not studied in ${Math.round(quietFor / DAY)} days.` };
  if (!sentToday.length && Math.random() < 0.35) {
    const { data: recent } = await admin.from("student_events").select("summary").eq("user_id", userId).order("created_at", { ascending: false }).limit(3);
    return { kind: "fun", key: "fun", facts: `Offer a fun fact related to what they study. Recent activity: ${(recent ?? []).map((r: { summary: string }) => r.summary).join(" | ") || "unknown"}. Tease it, do not tell it yet.` };
  }
  return null;
}

async function writeLine(complete: Complete, trigger: Trigger, target: Target): Promise<string> {
  const system = `You are MoeAI, a peer-like AI tutor with a real personality, writing ONE notification you send first to a student. It must sound like a friend texting, not an app: short (under 90 characters), casual, one line, at most one emoji, no quotes around it, no hashtags. Reply with the line only.

${voiceCalibration(target)}
Write it in ${describe(target)}.`;
  const examples = "Examples of the feel: \"Hey wait! are you not gonna start studying with me? your first lecture is waiting\" / \"B2olk eh t7b tsm3 fun fact?\" / \"el assignment due kaman sa3ten, yalla\". No emoji.";
  const text = await complete(system, `Reason to message: ${trigger.kind}. Facts: ${trigger.facts}\n${examples}`);
  return text.replace(/^["'\s]+|["'\s]+$/g, "").split("\n")[0].slice(0, 140);
}

/** One proactive round over recently active students. Service-role client only. */
export async function runProactive(admin: SupabaseClient, complete: Complete, { maxStudents = 25 } = {}): Promise<{ sent: number; considered: number }> {
  const since = new Date(Date.now() - 14 * DAY).toISOString();
  const { data: active } = await admin.from("student_events").select("user_id").gte("created_at", since).order("created_at", { ascending: false }).limit(2000);
  const { data: fresh } = await admin.from("org_identities").select("user_id").eq("role", "student").limit(500);
  const users = [...new Set([...(active ?? []), ...(fresh ?? [])].map((r: { user_id: string }) => r.user_id))].slice(0, maxStudents);
  const startOfDay = new Date(Date.now() - (Date.now() % DAY)).toISOString();
  let sent = 0;
  for (const userId of users) {
    try {
      const hour = await localHour(admin, userId);
      if (hour >= 1 && hour < 9) continue; // quiet hours
      const { data: today } = await admin.from("nudges").select("prompt").eq("user_id", userId).in("kind", ["dm", "deadline", "start", "fun", "dormant", "night"]).gte("created_at", startOfDay);
      const sentToday = (today ?? []).map((n: { prompt: string | null }) => String(n.prompt || ""));
      if (sentToday.length >= MAX_PER_DAY) continue;
      const trigger = await pickTrigger(admin, userId, sentToday);
      if (!trigger) continue;
      const line = await writeLine(complete, trigger, await languageOf(admin, userId));
      if (!line) continue;
      await admin.from("dm_messages").insert({ user_id: userId, role: "assistant", content: line, proactive: true });
      await admin.from("nudges").insert({ user_id: userId, kind: trigger.kind === "dormant" ? "dm" : trigger.kind, body: line, prompt: `[${trigger.key}] ${line}`, action_url: "/moeai?dm=1" });
      await sendPush(admin, userId, { title: "MoeAI", body: line, url: `/moeai?dm=1&reply=${encodeURIComponent(line)}`, tag: "moeai-dm" });
      sent += 1;
    } catch {
      // One student's failure never stops the round.
    }
  }
  return { sent, considered: users.length };
}
