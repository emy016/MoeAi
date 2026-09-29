import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase-server";
import Client from "./Client";
import "@/components/brand/logo.css";
import "../../org.css";

export const metadata: Metadata = { title: "Join your class on MoeAI", robots: { index: false } };

/**
 * /join/<code>: the class link. Posted once (say, in the Telegram channel), it
 * puts every student who opens it in the organization and all of its courses,
 * so MoeAI answers from their lecturers' material. Signed-out visitors sign up
 * or sign in first and come straight back here.
 */
export default async function Page({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const clean = code.toUpperCase().replace(/[^A-Z0-9-]/g, "").slice(0, 32);
  const sb = await supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) redirect(`/start?next=${encodeURIComponent(`/join/${clean}`)}`);
  return <Client code={clean} />;
}
