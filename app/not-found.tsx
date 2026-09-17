// Custom 404. A default framework 404 is the fastest way to look unfinished.
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Page not found",
  robots: { index: false, follow: true },
};

export default function NotFound() {
  return (
    <section className="card" style={{ textAlign: "center", padding: "56px 24px" }}>
      <h1 className="gradient-text">404</h1>
      <h2>This page does not exist.</h2>
      <p>The link may be old, or the page may not be built yet.</p>
      <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
        <Link className="btn btn-primary" href="/">Back to home</Link>
        <Link className="btn" href="/moeai">Ask MoeAI instead</Link>
      </div>
    </section>
  );
}
