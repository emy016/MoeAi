// Browser-side Supabase client. Subject to RLS, so it only ever sees the
// signed-in student's own rows. Safe to import from client components.
//
// Kept in its own module because anything importing `next/headers` cannot be
// bundled for the browser.
import { createBrowserClient } from "@supabase/ssr";
import { SUPABASE_URL, SUPABASE_ANON, isConfigured, PLACEHOLDER_URL, PLACEHOLDER_KEY } from "./env";

export function supabaseBrowser() {
  return createBrowserClient(
    isConfigured ? SUPABASE_URL : PLACEHOLDER_URL,
    isConfigured ? SUPABASE_ANON : PLACEHOLDER_KEY,
  );
}
