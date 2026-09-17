import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Quizzes",
  description: "Practice questions generated from your own lecture material, not a generic question bank.",
  alternates: { canonical: "/quizzes" },
};

export default function Page() {
  return (
    <section className="card">
      <h1>Quizzes</h1>
      <p>Practice questions drawn from your own lectures, so what you revise is what you are actually examined on.</p>
      <Link className="btn" href="/moeai">Ask MoeAI in the meantime</Link>
    </section>
  );
}
