/**
 * POST /api/moeai — the tutor endpoint.
 *
 * This is the only place provider API keys are ever read. Nothing here is
 * importable from the browser.
 *
 * Order of operations:
 *   1. Identify the student from their session cookie (never from the body).
 *   2. Enforce the hourly cap.
 *   3. Detect the reply language from this message.
 *   4. Retrieve curriculum passages via Postgres full-text search.
 *   5. Load the student's durable memory.
 *   6. Assemble the system prompt under a token budget.
 *   7. Stream from the first healthy provider.
 *   8. Persist both turns and log the call when the stream closes.
 */
import { NextRequest } from "next/server";
import { supabaseServer, supabaseAdmin } from "@/lib/supabase-server";
import { detectLanguage, validateOutput, type Target } from "@/lib/language";
import { buildSystemPrompt } from "@/lib/prompt";
import { streamChat, type ChatMessage } from "@/lib/providers";
import { checkRateLimit } from "@/lib/ratelimit";

export const runtime = "nodejs";
export const maxDuration = 60;

const HISTORY_TURNS = 10;
const MAX_MESSAGE_CHARS = 4000;

function fail(status: number, message: string) {
  return Response.json({ error: message }, { status });
}

export async function POST(req: NextRequest) {
  const started = Date.now();

  // 1. Who is asking. The body does not get a vote.
  const sb = await supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return fail(401, "Sign in to talk to MoeAI.");

  let body: { conversationId?: string; message?: string; courseCode?: string };
  try {
    body = await req.json();
  } catch {
    return fail(400, "Malformed request.");
  }

  const message = (body.message ?? "").trim();
  if (!message) return fail(400, "Message is empty.");
  if (message.length > MAX_MESSAGE_CHARS) return fail(413, "Message is too long.");

  // 2. Spending cap.
  const rate = await checkRateLimit(user.id);
  if (!rate.allowed) {
    return Response.json(
      { error: `You have hit this hour's limit. Try again after ${rate.resetAt.toLocaleTimeString()}.` },
      { status: 429, headers: { "retry-after": "600" } },
    );
  }

  // Resolve the conversation, creating one on the first message.
  // RLS already scopes the lookup to the owner, so a forged id simply misses.
  let convId: string | null = null;
  if (body.conversationId) {
    const { data } = await sb
      .from("conversations")
      .select("id")
      .eq("id", body.conversationId)
      .maybeSingle();
    if (data) convId = String(data.id);
  }
  if (!convId) {
    const { data, error } = await sb
      .from("conversations")
      .insert({ user_id: user.id, title: message.slice(0, 60) })
      .select("id")
      .single();
    if (error || !data) return fail(500, "Could not start a conversation.");
    convId = String(data.id);
  }

  // Recent history, oldest-first for the model.
  const { data: historyRows } = await sb
    .from("messages")
    .select("role, content, language")
    .eq("conversation_id", convId)
    .order("created_at", { ascending: false })
    .limit(HISTORY_TURNS);
  const history: { role: string; content: string; language: string | null }[] =
    (historyRows ?? []).reverse();

  // 3. Language. The previous assistant turn is only a tie-breaker.
  const previous = history.findLast((m) => m.role === "assistant")?.language as Target | null;
  const language = detectLanguage(message, previous ?? null);

  // 4. Curriculum retrieval. Failure here is not fatal — the prompt says so.
  let retrieved: { courseCode: string; title: string; content: string }[] = [];
  try {
    const { data } = await sb.rpc("search_lessons", {
      q: message,
      course_code: body.courseCode ?? null,
      max_results: 4,
    });
    retrieved = (data ?? []).map((r: any) => ({
      courseCode: r.course_code,
      title: r.title,
      content: r.content,
    }));
  } catch {
    retrieved = [];
  }

  // 5. Student model.
  const { data: memory } = await sb
    .from("student_memory")
    .select("key, value, kind")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false })
    .limit(25);

  // 6. Prompt.
  const system = buildSystemPrompt({ language, memory: memory ?? [], retrieved });

  const messages: ChatMessage[] = [
    { role: "system", content: system.text },
    ...history.map((m) => ({
      role: m.role === "assistant" ? ("assistant" as const) : ("user" as const),
      content: m.content,
    })),
    { role: "user", content: message },
  ];

  // Persist the student's turn before calling out, so nothing is lost if the
  // provider dies mid-stream.
  await sb.from("messages").insert({
    conversation_id: convId,
    role: "user",
    content: message,
    language: language.target,
  });

  // 7 + 8. Stream, then persist and log on close.
  const admin = supabaseAdmin();
  try {
    const result = await streamChat(messages, {
      onDone: async (full) => {
        const check = validateOutput(full, language.target);
        await admin.from("messages").insert({
          conversation_id: convId,
          role: "assistant",
          content: full,
          language: language.target,
        });
        await admin.from("conversations")
          .update({ updated_at: new Date().toISOString() })
          .eq("id", convId);
        await admin.from("ai_logs").insert({
          user_id: user.id,
          conversation_id: convId,
          provider: result.provider,
          model: result.model,
          prompt_tokens: system.tokens,
          completion_tokens: Math.ceil(full.length / 4),
          latency_ms: Date.now() - started,
          status: check.ok ? "ok" : "language_drift",
          error_message: check.ok ? null : `${check.reason} (target ${language.target})`,
        });
      },
    });

    return new Response(result.stream, {
      headers: {
        "content-type": "text/plain; charset=utf-8",
        "cache-control": "no-store",
        "x-conversation-id": convId,
        "x-provider": result.provider,
        "x-language": language.target,
        "x-ratelimit-remaining": String(rate.remaining),
      },
    });
  } catch (err) {
    // Log the real reason for us; return a plain one to the student.
    await admin.from("ai_logs").insert({
      user_id: user.id,
      conversation_id: convId,
      status: "all_failed",
      latency_ms: Date.now() - started,
      error_message: err instanceof Error ? err.message : String(err),
    });
    return fail(503, "MoeAI is temporarily unavailable. Try again in a moment.");
  }
}
