/**
 * /api/auth — sign-in for the ported pages.
 *
 * The original homepage shipped working login and signup modals whose submit
 * buttons said "connect to Supabase". This is that connection.
 *
 * It runs server-side on purpose: the ported pages are plain scripts with no
 * bundler, so handing them a REST endpoint avoids loading an SDK from a CDN,
 * and the session cookie is written by the server rather than by script.
 */
import { NextRequest } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";

export const runtime = "nodejs";

/** Who is signed in, for swapping the nav buttons. */
export async function GET() {
  const sb = await supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return Response.json({ signedIn: false });

  const { data: profile } = await sb
    .from("profiles")
    .select("display_name")
    .eq("id", user.id)
    .maybeSingle();

  return Response.json({
    signedIn: true,
    email: user.email,
    name: profile?.display_name || user.email?.split("@")[0] || "Student",
  });
}

export async function POST(req: NextRequest) {
  let body: { action?: string; email?: string; password?: string; name?: string; next?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Malformed request." }, { status: 400 });
  }

  const sb = await supabaseServer();
  const email = (body.email ?? "").trim().toLowerCase();
  const password = body.password ?? "";

  switch (body.action) {
    case "login": {
      if (!email || !password) {
        return Response.json({ error: "Email and password are required." }, { status: 400 });
      }
      const { error } = await sb.auth.signInWithPassword({ email, password });
      if (error) {
        // Deliberately vague: saying which half was wrong tells an attacker
        // whether an address has an account here.
        return Response.json({ error: "That email and password do not match." }, { status: 401 });
      }
      return Response.json({ ok: true });
    }

    case "signup": {
      if (!email || password.length < 8) {
        return Response.json(
          { error: "Use a real email and a password of at least 8 characters." },
          { status: 400 },
        );
      }
      const origin = new URL(req.url).origin;
      const { data, error } = await sb.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: (body.name ?? "").trim().slice(0, 60) },
          emailRedirectTo: `${origin}/auth/callback`,
        },
      });
      if (error) {
        return Response.json({ error: error.message }, { status: 400 });
      }
      // With email confirmation on, there is no session yet.
      return Response.json({
        ok: true,
        confirmed: Boolean(data.session),
        message: data.session
          ? "You're in."
          : "Check your inbox to confirm your address, then sign in.",
      });
    }

    case "google": {
      const origin = new URL(req.url).origin;
      const next = body.next && body.next.startsWith("/") ? body.next : "/";
      const { data, error } = await sb.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}` },
      });
      if (error || !data?.url) {
        return Response.json(
          { error: "Google sign-in is not enabled for this project yet." },
          { status: 400 },
        );
      }
      return Response.json({ ok: true, url: data.url });
    }

    case "logout": {
      await sb.auth.signOut();
      return Response.json({ ok: true });
    }

    default:
      return Response.json({ error: "Unknown action." }, { status: 400 });
  }
}
