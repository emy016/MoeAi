import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/brand/Logo";
import { ORGS } from "@/lib/orgs";
import "@/components/brand/logo.css";
import "../org.css";

export const metadata: Metadata = { title: "Sign in with your university", robots: { index: false } };

/** Step one: which university or school. The rollout shows as "coming soon". */
export default async function Page({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  const q = next && next.startsWith("/") && !next.startsWith("//") ? `?next=${encodeURIComponent(next)}` : "";
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
            {ORGS.map((org) =>
              org.live ? (
                <Link key={org.slug} className="org-item" href={`/sso/${org.slug}${q}`}>
                  <strong>{org.short}</strong>
                  <span className="org-muted" style={{ margin: 0 }}>{org.name}</span>
                  <span className="org-badge live">Live</span>
                </Link>
              ) : (
                <div key={org.slug} className="org-item" aria-disabled="true">
                  <strong>{org.short}</strong>
                  <span className="org-muted" style={{ margin: 0 }}>{org.name}</span>
                  <span className="org-badge">Coming soon</span>
                </div>
              ),
            )}
          </div>
        </section>
        <p className="org-muted" style={{ textAlign: "center" }}>
          Not with a partner university? <Link href="/moeai" style={{ textDecoration: "underline" }}>Use MoeAI on your own</Link>.
        </p>
      </div>
    </main>
  );
}
