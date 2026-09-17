import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Dashboard",
  description: "Your progress, your weak spots, and what MoeAI thinks you should revise next.",
  alternates: { canonical: "/dashboard" },
};

export default function Page() {
  return (
    <section className="card">
      <h1>Dashboard</h1>
      <p>Your progress across courses, the misconceptions MoeAI has spotted, and what to revise next.</p>
      <Link className="btn" href="/moeai">Ask MoeAI in the meantime</Link>
    </section>
  );
}
