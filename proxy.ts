// Refreshes the Supabase session cookie on every request, so a student who
// leaves a tab open overnight is not silently signed out mid-question.
//
// This runs ahead of EVERY route, so anything that throws here takes the whole
// site down with a 500 — including static pages that never touch Supabase.
// That is exactly what happened when the deployment had no credentials, so the
// unconfigured case is handled first and explicitly.
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { SUPABASE_URL, SUPABASE_ANON, isConfigured } from "@/lib/env";

export async function proxy(req: NextRequest) {
  const res = NextResponse.next({ request: req });

  // No credentials: there is no session to refresh. Pass the request through
  // untouched rather than constructing a client that throws.
  if (!isConfigured) return res;

  try {
    const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON, {
      cookies: {
        getAll: () => req.cookies.getAll(),
        setAll: (list: { name: string; value: string; options: CookieOptions }[]) => {
          list.forEach(({ name, value, options }) => res.cookies.set(name, value, options));
        },
      },
    });

    await supabase.auth.getUser();
  } catch {
    // A refresh failure must never become a 500 on an unrelated page. The
    // request continues signed-out; the route's own auth check handles it.
  }

  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|svg|webp|txt|xml)$).*)"],
};
