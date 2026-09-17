import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Courses",
  description: "First-year Computer Science courses at FUE: lectures, notes, and videos in one place.",
  alternates: { canonical: "/courses" },
};

export default function Page() {
  return (
    <section className="card">
      <h1>Courses</h1>
      <p>Lectures, notes and videos for FUE first-year Computer Science. Content is being migrated from the Telegram archive to YouTube and indexed here.</p>
      <Link className="btn" href="/moeai">Ask MoeAI in the meantime</Link>
    </section>
  );
}
