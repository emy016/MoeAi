import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/brand/Logo";
import { ORGS } from "@/lib/orgs";
import { safeNext } from "@/lib/auth/next";
import { redirect } from "next/navigation";
import "@/components/brand/logo.css";
import "../org.css";

export const metadata: Metadata = { title: "Sign in with your university", robots: { index: false } };

/** Step one: which university. Only live universities are listed; with one live, it opens directly. */
export default async function Page({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  const q = next ? `?next=${encodeURIComponent(safeNext(next))}` : "";
  // No university picker with "coming soon" rows: while one university is live, go straight to its sign-in.
  const live = ORGS.filter((org) => org.live);
  if (live.length === 1) redirect(`/sso/${live[0].slug}${q}`);
  return (
    <main className="org-page">
      <div className="org-wrap">
        <section className="org-card">
          <div className="org-head">
            <Logo size={40} />
            <div>
              <h1>Sign in with your university</h1>
              <p>Your courses, lectures and MoeAI tutor, set up by your faculty. Nothing to upload.</p>
            </div>
          </div>
          <div className="org-list">
            {live.map((org) => (
              <Link key={org.slug} className="org-item" href={`/sso/${org.slug}${q}`}>
                <strong>{org.short}</strong>
                <span className="org-muted" style={{ margin: 0 }}>{org.name}</span>
                <span className="org-badge live">Live</span>
              </Link>
            ))}
          </div>
        </section>
        <p className="org-muted" style={{ textAlign: "center" }}>
          Not with a partner university? <Link href="/start" style={{ textDecoration: "underline" }}>Create a MoeAI account</Link> or <Link href="/moeai" style={{ textDecoration: "underline" }}>try it as a guest</Link>.
        </p>
      </div>
    </main>
  );
}
