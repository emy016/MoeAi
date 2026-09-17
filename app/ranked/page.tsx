import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Ranked",
  description: "Live competitive quiz matches against other students on your own syllabus.",
  alternates: { canonical: "/ranked" },
};

export default function Ranked() {
  return (
    <div className="stack">
      <section className="card">
        <h1>Ranked</h1>
        <p>
          Timed head-to-head matches on your syllabus, with a live leaderboard.
          Ranked needs two things before it is real: enough students online at once,
          and a shared question pool. The question pool is being built every time
          someone generates a quiz.
        </p>
        <div className="cta">
          <Link className="btn btn-primary" href="/quizzes">Practise solo for now</Link>
          <Link className="btn" href="/library">Add material to the pool</Link>
        </div>
      </section>

      <section className="card">
        <h2>How it will work</h2>
        <ol style={{ color: "var(--text-muted)", lineHeight: 1.8, paddingInlineStart: 20 }}>
          <li>Pick a course and join the queue.</li>
          <li>You and one opponent get the same five questions, from real lecture material.</li>
          <li>Speed breaks ties. Wrong answers cost you.</li>
          <li>Whatever you miss goes into your weak spots, so MoeAI brings it back later.</li>
        </ol>
      </section>
    </div>
  );
}
