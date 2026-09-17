/**
 * /auth/callback — completes an email link or OAuth sign-in.
 *
 * Supabase's browser client uses PKCE, so the link in a magic-link email and
 * the redirect back from Google both arrive here carrying a `code` that has to
 * be exchanged for a session before any page can see the user. Without this
 * route the link lands on a page that still thinks nobody is signed in.
 */
import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") || "/";

  // Only ever redirect within this site: `next` comes in from a link.
  const destination = next.startsWith("/") && !next.startsWith("//") ? next : "/";

  if (!code) {
    return NextResponse.redirect(new URL("/login?error=missing_code", url.origin));
  }

  const sb = await supabaseServer();
  const { error } = await sb.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(new URL("/login?error=expired", url.origin));
  }

  return NextResponse.redirect(new URL(destination, url.origin));
}
