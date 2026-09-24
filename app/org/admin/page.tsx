import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase-server";
import Client from "./Client";
import "@/components/brand/logo.css";
import "../../org.css";
import "../../start/start.css";

export const metadata: Metadata = { title: "Organization admin", robots: { index: false } };

export default async function Page() {
  const sb = await supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) redirect("/start/signin?next=/org/admin");
  return <Client />;
}
