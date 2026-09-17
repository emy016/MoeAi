import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Ranked",
  description: "Live competitive quiz matches against other students on your own syllabus.",
  alternates: { canonical: "/ranked" },
};

export default function Page() {
  return (
    <section className="card">
      <h1>Ranked</h1>
      <p>Timed head-to-head matches on your syllabus, with a live leaderboard.</p>
      <Link className="btn" href="/moeai">Ask MoeAI in the meantime</Link>
    </section>
  );
}
