import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { orgBySlug } from "@/lib/orgs";
import Client from "./Client";
import { safeNext } from "@/lib/auth/next";
import "@/components/brand/logo.css";
import "../../org.css";

export const metadata: Metadata = { title: "University sign-in", robots: { index: false } };

export default async function Page({ params, searchParams }: { params: Promise<{ org: string }>; searchParams: Promise<{ next?: string }> }) {
  const [{ org: slug }, { next }] = await Promise.all([params, searchParams]);
  const org = orgBySlug(slug);
  if (!org || !org.live) notFound();
  return <Client org={{ slug: org.slug, name: org.name, short: org.short, idLabel: org.idLabel, programs: org.programs }} next={safeNext(next)} />;
}
