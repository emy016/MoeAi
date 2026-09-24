// Server-only Supabase clients. Never import this from a client component.
import "server-only";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

import { SUPABASE_URL, SUPABASE_ANON, isConfigured, PLACEHOLDER_URL, PLACEHOLDER_KEY } from "./env";

const URL = isConfigured ? SUPABASE_URL : PLACEHOLDER_URL;
const ANON = isConfigured ? SUPABASE_ANON : PLACEHOLDER_KEY;

/**
 * Bound to the caller's session cookie and subject to RLS. Use this for
 * anything acting *as* the student.
 */
export async function supabaseServer() {
  const store = await cookies();
  return createServerClient(URL, ANON, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list: { name: string; value: string; options: CookieOptions }[]) => {
        try {
          list.forEach(({ name, value, options }) => store.set(name, value, options));
        } catch {
          // Called from a Server Component; the proxy refreshes the session.
        }
      },
    },
  });
}

/**
 * Service-role client. BYPASSES RLS. Only the daily cron (/api/cron) and room
 * joins still use it; rate limits, AI logs, memory and embeddings run as the
 * student through SECURITY DEFINER functions that check auth.uid().
 */
export function supabaseAdmin() {
  return createClient(URL, process.env.SUPABASE_SERVICE_ROLE_KEY ?? PLACEHOLDER_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
