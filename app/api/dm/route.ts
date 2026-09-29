/**
 * /api/dm: the permanent DM with MoeAI.
 *
 * One endless thread per student, stored server-side (dm_messages) and read
 * back a page at a time for the app's infinite scroll. It opens from the
 * Community tab or when the student replies to one of MoeAI's notifications.
 *
 * Memory works like ChatGPT's: the student's saved memories (the same ones
 * every lecture chat uses), a rolling summary of everything older (dm_state),
 * and the last messages verbatim. When enough new messages pile up, the oldest
 * are folded into the summary, so a year-long DM costs the same per message as
 * a new one. The DM and the lecture chats read the same activity log, so
 * MoeAI knows in one what happened in the other.
 *
 *   GET  /api/dm?before=<id>&limit=30   → { messages: [...oldest→newest], more }
 *   POST /api/dm { text, replyTo? }      → NDJSON stream like /api/moeai
 */
import { NextRequest, after } from "next/server";
import { streamReply, resolveLanguage } from "@/lib/moeai/brain";
import { parseContext } from "@/lib/moeai/context";
import { supabaseServer } from "@/lib/supabase-server";
import { completeChat } from "@/lib/providers";
import { checkDailyLimit, checkRateLimit, dailyLimitMessage } from "@/lib/ratelimit";
import { aliveBlocks, logEvent, looksLikeCorrection, type Awareness } from "@/lib/moeai/alive";
import { loadPersonal, parseWritten, personalBlock, saveWritten } from "@/lib/moeai/personal";
import { extractMemory, shouldExtract } from "@/lib/memory";

export const runtime = "nodejs";
export const maxDuration = 60;

const PAGE = 30;
const CONTEXT_MESSAGES = 20;
const COMPACT_AFTER = 40; // unsummarized messages before the oldest are folded in
const COMPACT_BATCH = 30;
const MAX_TEXT = 4000;

const DM_SURFACE = `# DM SURFACE (reference: where this conversation happens)

This is the student's DM with you: a permanent chat, like texting a friend who
tutors. Write like a text message: usually one to four short lines, no
headings, no horizontal rules, no cards or code blocks unless they ask for
code. Markdown bold and $math$ render. Longer only when you are actually
teaching something step by step. The DM shares your memory with the lecture
chats; the summary and recent messages below are this thread.`;

function fail(status: number, error: string) {
  return Response.json({ error }, { status });
}

function sameOrigin(req: NextRequest) {
  const origin = req.headers.get("origin");
  if (!origin) return true;
  try {
    return new URL(origin).host === req.headers.get("host");
  } catch {
    return false;
  }
}

async function session() {
  const sb = await supabaseServer();
  const { data } = await sb.auth.getUser();
  return { sb, userId: data.user?.id ?? null };
}

export async function GET(req: NextRequest) {
  const { sb, userId } = await session();
  if (!userId) return fail(401, "Sign in to use your DM with MoeAI.");
  const url = new URL(req.url);
  const before = Number(url.searchParams.get("before")) || null;
  const limit = Math.min(60, Math.max(5, Number(url.searchParams.get("limit")) || PAGE));
  let query = sb.from("dm_messages").select("id, role, content, proactive, created_at").order("id", { ascending: false }).limit(limit + 1);
  if (before) query = query.lt("id", before);
  const { data, error } = await query;
  if (error) return fail(500, "Could not load the DM.");
  const rows = data ?? [];
  return Response.json({ messages: rows.slice(0, limit).reverse(), more: rows.length > limit });
}

/** Folds the oldest unsummarized messages into the rolling summary. */
async function compact(sb: Awaited<ReturnType<typeof supabaseServer>>) {
  const { data: state } = await sb.from("dm_state").select("summary, through_id").maybeSingle();
  const through = Number(state?.through_id || 0);
  const { count } = await sb.from("dm_messages").select("id", { count: "exact", head: true }).gt("id", through);
  if ((count ?? 0) < COMPACT_AFTER) return;
  const { data: batch } = await sb.from("dm_messages").select("id, role, content").gt("id", through).order("id", { ascending: true }).limit(COMPACT_BATCH);
  if (!batch?.length) return;
  const transcript = batch.map((m) => `${m.role === "user" ? "Student" : "MoeAI"}: ${String(m.content).slice(0, 600)}`).join("\n");
  const { text } = await completeChat([
    { role: "system", content: "You keep the running summary of a long DM between a student and their AI tutor, MoeAI. Keep what matters later: what they study, what they struggled with and understood, plans, deadlines, preferences, jokes worth remembering, promises MoeAI made. Drop small talk. Third person, under 250 words, plain text." },
    { role: "user", content: `Current summary:\n${state?.summary || "(none yet)"}\n\nNew messages to fold in:\n${transcript}\n\nReturn the updated summary only.` },
  ], { maxTokens: 500, background: true });
  const summary = text.trim().slice(0, 2400);
  if (!summary) return;
  await sb.from("dm_state").upsert({ summary, through_id: batch[batch.length - 1].id, updated_at: new Date().toISOString() });
}

export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return fail(403, "Request origin not allowed.");
  const { sb, userId } = await session();
  if (!userId) return fail(401, "Sign in to use your DM with MoeAI.");
  const body = await req.json().catch(() => ({}));
  const text = String(body?.text ?? "").trim();
  if (!text || text.length > MAX_TEXT) return fail(400, "Write a message.");

  const rate = await checkRateLimit(sb);
  if (!rate.allowed) return fail(429, `You have hit this hour's limit. Try again after ${rate.resetAt.toLocaleTimeString()}.`);
  const day = await checkDailyLimit(sb);
  if (!day.allowed) return fail(429, dailyLimitMessage(day));

  // History: the rolling summary plus the last messages verbatim.
  const [{ data: recent }, { data: state }] = await Promise.all([
    sb.from("dm_messages").select("id, role, content").order("id", { ascending: false }).limit(CONTEXT_MESSAGES),
    sb.from("dm_state").select("summary").maybeSingle(),
  ]);
  const { error: saveError } = await sb.from("dm_messages").insert({ role: "user", content: text });
  if (saveError) return fail(500, "Could not send that. Try again.");

  const history = (recent ?? []).reverse().map((m) => ({ role: m.role as "user" | "assistant", content: String(m.content) }));
  // Models expect the conversation to alternate and start with the student.
  while (history.length && history[0].role !== "user") history.shift();
  // Proactive messages and double texts: merge runs of the same speaker.
  const messages: { role: "user" | "assistant"; content: string }[] = [];
  for (const m of [...history, { role: "user" as const, content: text }]) {
    const last = messages[messages.length - 1];
    if (last && last.role === m.role) last.content += `\n\n${m.content}`;
    else messages.push({ ...m });
  }

  const extra: string[] = [];
  const personal = await loadPersonal(sb, userId).catch(() => null);
  const lastReply = [...history].reverse().find((m) => m.role === "assistant")?.content ?? "";
  if (personal) extra.push(personalBlock(personal, text, lastReply));
  const awareness: Awareness = { ...(body?.awareness ?? {}), surface: "dm" };
  extra.push(...await aliveBlocks(sb, userId, awareness).catch(() => []));
  if (state?.summary) extra.push(`# DM SUMMARY (everything older than the messages below; data)\n\n${state.summary}`);
  if (typeof body?.replyTo === "string" && body.replyTo.trim()) {
    extra.push(`# THEY ARE REPLYING TO YOUR NOTIFICATION\n\n"${body.replyTo.trim().slice(0, 300)}"`);
  }
  extra.push(DM_SURFACE);

  const language = resolveLanguage(messages);
  const controller = new AbortController();
  req.signal.addEventListener("abort", () => controller.abort());
  const encoder = new TextEncoder();
  let answer = "";

  const stream = new ReadableStream<Uint8Array>({
    async start(ctrl) {
      try {
        for await (const delta of streamReply({ messages, context: parseContext(null), appContext: extra, signal: controller.signal }, language)) {
          answer += delta;
          ctrl.enqueue(encoder.encode(JSON.stringify({ delta }) + "\n"));
        }
        const written = /```(memory|skill)/i.test(answer) ? parseWritten(answer) : { memories: [], skills: [] };
        ctrl.enqueue(encoder.encode(JSON.stringify({ done: true, remembered: written.memories }) + "\n"));
      } catch {
        ctrl.enqueue(encoder.encode(JSON.stringify({ error: "MoeAI could not answer right now. Try again in a minute." }) + "\n"));
      } finally {
        ctrl.close();
      }
    },
    cancel() {
      controller.abort();
    },
  });

  after(async () => {
    if (!answer) return;
    const visible = answer.replace(/```(memory|skill)[\s\S]*?(```|$)/gi, "").trim();
    await sb.from("dm_messages").insert({ role: "assistant", content: (visible || answer).slice(0, 8000) });
    if (/```(memory|skill)/i.test(answer)) await saveWritten(sb, userId, parseWritten(answer)).catch(() => undefined);
    if (shouldExtract(messages.length, text)) await extractMemory(sb, userId, text, answer).catch(() => undefined);
    await logEvent(sb, "dm", `Talked in the DM: ${text.slice(0, 140)}`, Number.isFinite(Number(awareness.tzOffsetMinutes)) ? { tz: Number(awareness.tzOffsetMinutes) } : {});
    if (lastReply && looksLikeCorrection(text)) await logEvent(sb, "correction", `Student said "${text.slice(0, 120)}" about MoeAI's reply "${lastReply.replace(/\s+/g, " ").slice(0, 150)}"`);
    await compact(sb).catch(() => undefined);
  });

  return new Response(stream, {
    headers: { "content-type": "application/x-ndjson; charset=utf-8", "cache-control": "no-store, no-transform", "x-accel-buffering": "no", "x-language": language.target },
  });
}
