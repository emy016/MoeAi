import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
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
  // Old links used the internal key; the public address names no university.
  if (slug.toLowerCase() !== org.path) redirect(`/sso/${org.path}${next ? `?next=${encodeURIComponent(safeNext(next))}` : ""}`);
  return <Client org={{ path: org.path, idLabel: org.idLabel }} next={safeNext(next)} />;
}
