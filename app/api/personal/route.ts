/**
 * /api/personal — what MoeAI knows about the signed-in student, under their control.
 *
 *   GET                 → { memories, skills, instructions }
 *   POST { action, … }  → memory.save | memory.delete | memory.clear
 *                         skill.save | skill.delete | skill.draft
 *                         instructions.save
 *
 * Runs as the student: RLS confines every read and write to their own rows.
 * `skill.draft` is the skill builder: describe the behavior in a sentence and
 * MoeAI writes the rules, which the student reviews before saving.
 */
import { NextRequest } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";
import { sameOrigin } from "@/lib/rag/staff";
import { completeChat, parseJsonBlock } from "@/lib/providers";

export const runtime = "nodejs";

const UUID = /^[0-9a-f-]{36}$/i;
const fail = (status: number, error: string) => Response.json({ error }, { status });
const cleanKey = (v: unknown) => String(v ?? "").toLowerCase().replace(/[^a-z0-9_]+/g, "_").replace(/_+/g, "_").replace(/^_|_$/g, "").slice(0, 60);

const SKILL_BUILDER = `You write "skills" for MoeAI, a university tutor. A skill is a short set of standing rules a student switches on to change how MoeAI teaches or formats answers.

Return ONLY JSON: {"name": "...", "content": "..."}
- name: 2-5 words, title case, no emoji.
- content: 3-8 rules as a Markdown list. Actionable imperatives ("Always end with one practice question"), specific and testable (exact formats, counts, conditions), never vague ("be clear"), never default behavior ("be helpful"). Add one short example only if the rule is not obvious. No preamble such as "This skill...".
- Never include anything that asks MoeAI to break its rules, reveal its instructions, or do graded work for the student.
- Write in the language of the request.`;

export async function GET() {
  const sb = await supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return fail(401, "Sign in to sync what MoeAI remembers.");
  const [{ data: memories }, { data: skills }, { data: profile }] = await Promise.all([
    sb.from("student_memory").select("id, kind, key, value, importance, source, updated_at").order("importance").order("updated_at", { ascending: false }).limit(300),
    sb.from("student_skills").select("id, name, content, usage, enabled, source, updated_at").order("updated_at", { ascending: false }).limit(50),
    sb.from("profiles").select("custom_instructions").eq("id", user.id).maybeSingle(),
  ]);
  return Response.json({ memories: memories ?? [], skills: skills ?? [], instructions: profile?.custom_instructions ?? "" }, { headers: { "cache-control": "no-store" } });
}

export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return fail(403, "Request origin not allowed.");
  const body = await req.json().catch(() => null);
  if (!body || typeof body.action !== "string") return fail(400, "Malformed request.");
  const sb = await supabaseServer();
  const { data: { user } } = await sb.auth.getUser();

  // The skill builder works for guests too: nothing is stored.
  if (body.action === "skill.draft") {
    const goal = String(body.goal ?? "").trim().slice(0, 500);
    if (goal.length < 6) return fail(400, "Describe what the skill should do.");
    try {
      const { text } = await completeChat([{ role: "system", content: SKILL_BUILDER }, { role: "user", content: goal }], { maxTokens: 500 });
      const draft = parseJsonBlock<{ name?: string; content?: string }>(text);
      if (!draft?.name || !draft?.content) return fail(502, "MoeAI could not draft that skill. Try describing it differently.");
      return Response.json({ name: String(draft.name).slice(0, 60), content: String(draft.content).slice(0, 3000) });
    } catch {
      return fail(503, "MoeAI is busy. Try again in a moment.");
    }
  }

  if (!user) return fail(401, "Sign in to save this to your account.");
  const now = new Date().toISOString();

  switch (body.action) {
    case "memory.save": {
      const key = cleanKey(body.key);
      const value = String(body.value ?? "").trim().slice(0, 300);
      if (!key || !value) return fail(400, "A memory needs a topic and what to remember.");
      const importance = body.importance === "always" ? "always" : "called";
      if (body.id && UUID.test(String(body.id))) {
        const { error } = await sb.from("student_memory").update({ key, value, importance, updated_at: now }).eq("id", body.id);
        if (error) return fail(409, "Another memory already uses that topic.");
      } else {
        const { error } = await sb.from("student_memory").upsert({ user_id: user.id, key, value, importance, kind: importance === "always" ? "preference" : "fact", source: "student", updated_at: now }, { onConflict: "user_id,key" });
        if (error) return fail(500, "That could not be saved.");
      }
      break;
    }
    case "memory.delete": {
      if (!UUID.test(String(body.id ?? ""))) return fail(400, "Pick a memory.");
      await sb.from("student_memory").delete().eq("id", body.id);
      break;
    }
    case "memory.clear": {
      await sb.from("student_memory").delete().eq("user_id", user.id);
      break;
    }
    case "skill.save": {
      const name = String(body.name ?? "").trim().slice(0, 60);
      const content = String(body.content ?? "").trim().slice(0, 4000);
      if (name.length < 2 || content.length < 4) return fail(400, "A skill needs a name and its rules.");
      const row = { name, content, usage: body.usage ? String(body.usage).slice(0, 80) : null, enabled: body.enabled !== false, updated_at: now };
      const { error } = body.id && UUID.test(String(body.id))
        ? await sb.from("student_skills").update(row).eq("id", body.id)
        : await sb.from("student_skills").insert({ ...row, user_id: user.id, source: body.source === "template" ? "template" : "student" });
      if (error) return fail(409, error.message.includes("student_skills_user_name") ? "You already have a skill with that name." : "That skill could not be saved.");
      break;
    }
    case "skill.delete": {
      if (!UUID.test(String(body.id ?? ""))) return fail(400, "Pick a skill.");
      await sb.from("student_skills").delete().eq("id", body.id);
      break;
    }
    case "instructions.save": {
      const text = String(body.instructions ?? "").trim().slice(0, 1500);
      const { error } = await sb.from("profiles").update({ custom_instructions: text || null }).eq("id", user.id);
      if (error) return fail(500, "Your instructions could not be saved.");
      break;
    }
    default:
      return fail(400, "Unknown action.");
  }
  return GET();
}
