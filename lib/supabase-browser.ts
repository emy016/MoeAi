// Browser-side Supabase client. Subject to RLS, so it only ever sees the
// signed-in student's own rows. Safe to import from client components.
//
// Kept in its own module because anything importing `next/headers` cannot be
// bundled for the browser.
import { createBrowserClient } from "@supabase/ssr";

export function supabaseBrowser() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
