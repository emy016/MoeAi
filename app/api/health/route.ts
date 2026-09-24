/**
 * GET /api/health — is this deployment actually wired up?
 *
 * Every piece of MoeAI degrades quietly when a key is missing: no provider
 * key and it cannot answer, no Supabase and there are no rooms or memory, a
 * personality file that failed to reach the serverless bundle and the tutor
 * answers in a generic assistant voice with nothing to say so.
 *
 * So this reports what is present, never what it is. Booleans and lengths
 * only — no key, no prefix, no suffix, nothing that survives being screenshot.
 */
import { personalityStatus } from "@/lib/moeai/brain";
import { isConfigured } from "@/lib/env";
import { acceptedNames, keyCounts, PROVIDER_NAMES } from "@/lib/keys";
import { readFileSync } from "node:fs";
import { join } from "node:path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function present(name: string) {
  return Boolean((process.env[name] ?? "").trim());
}

export async function GET() {
  const voice = personalityStatus();

  let security = 0;
  try {
    security = readFileSync(join(process.cwd(), "prompts", "SECURITY.md"), "utf8").trim().length;
  } catch {
    security = 0;
  }

  // How many keys each provider has, never what they are. Counts rather than
  // booleans because rotation is the point: one Gemini key and three are very
  // different positions to be in on a free tier.
  const providers = keyCounts();
  const canAnswer = Object.values(providers).some(count => count > 0);

  return Response.json({
    ok: canAnswer && voice.ok,
    // The tutor can hold a conversation.
    canAnswer,
    providers,
    // The tutor sounds like MoeAI rather than like a generic assistant.
    personality: voice,
    securitySpecCharacters: security,
    // The tutor remembers, retrieves, and has rooms.
    supabase: {
      configured: isConfigured,
      serviceRole: present("SUPABASE_SERVICE_ROLE_KEY"),
    },
    cronSecret: present("CRON_SECRET"),
    // What to set, if a provider above reads zero. Every name here is read.
    acceptedKeyNames: Object.fromEntries(PROVIDER_NAMES.map(p => [p, acceptedNames(p)])),
    checkedAt: new Date().toISOString(),
  }, { headers: { "cache-control": "no-store" } });
}
