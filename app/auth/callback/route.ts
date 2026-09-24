/**
 * /auth/callback — completes every link-based sign-in.
 *
 * Email confirmation, magic links, password-recovery links, Google, Apple,
 * SAML SSO and identity linking all come back here with a PKCE `code` that is
 * exchanged for a session before any page can see the user. Then:
 *   - consent given at signup is recorded against the current documents,
 *   - the sign-in is written to the security log (never the code or token),
 *   - the person continues to `next`, which can only be a path on this site.
 */
import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";
import { safeNext } from "@/lib/auth/next";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const destination = safeNext(url.searchParams.get("next"), "/start/continue");
  const recovering = destination.startsWith("/start/reset");

  // Provider-side failures (the person cancelled at Google or Apple, a
  // misconfigured provider) arrive as error parameters instead of a code.
  const providerError = url.searchParams.get("error_description") || url.searchParams.get("error");
  if (!code) {
    const reason = providerError ? (/cancel|denied/i.test(providerError) ? "cancelled" : "provider") : "missing_code";
    return NextResponse.redirect(new URL(`${recovering ? "/start/forgot" : "/start/signin"}?error=${reason}`, url.origin));
  }

  const sb = await supabaseServer();
  const { data, error } = await sb.auth.exchangeCodeForSession(code);
  if (error || !data.user) {
    return NextResponse.redirect(new URL(`${recovering ? "/start/forgot" : "/start/signin"}?error=expired`, url.origin));
  }

  if (data.user.user_metadata?.consent === true) {
    const { data: has } = await sb.rpc("has_current_consent");
    if (!has) await sb.rpc("accept_current_legal");
  }
  const method = (data.user.app_metadata?.provider as string | undefined) ?? "email";
  await sb.rpc("log_auth_event", { p_kind: recovering ? "password_reset_requested" : "sign_in", p_detail: { method } }).then(() => undefined, () => undefined);

  return NextResponse.redirect(new URL(destination, url.origin));
}
