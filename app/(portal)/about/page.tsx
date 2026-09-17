import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "About",
  description: "Who builds EduMoe and MoeAI, and why they exist.",
  alternates: { canonical: "/about" },
};

export default function About() {
  return (
    <div className="stack">
      <section className="card">
        <h1>About</h1>
        <p>
          EduMoe began as a study channel for first-year Computer Science students at
          Future University in Egypt. Around 230 students follow it — roughly half the
          cohort. The same questions came back every week, in a mix of Egyptian Arabic,
          Franco-Arabic, and English that no general AI handles well.
        </p>
        <p>
          MoeAI is the answer to that. It is not a wrapper around a chatbot: it
          retrieves the student&rsquo;s own lecture material before it answers, it
          detects and mirrors their language per message instead of defaulting to
          English, and it keeps a model of what each student has got wrong.
        </p>
      </section>

      <section className="card">
        <h2>Two ways to use it</h2>
        <p>
          <strong>Inside EduMoe</strong> — with the shared first-year Computer Science
          curriculum, courses, quizzes and progress tracking.
        </p>
        <p>
          <strong>On its own</strong> — Library Mode. Upload whatever you are studying
          and MoeAI teaches from that instead. Works for a solo student, a tutor, or an
          organisation with its own material.
        </p>
        <Link className="btn btn-primary" href="/library">Try Library Mode</Link>
      </section>

      <section className="card">
        <h2>Team</h2>
        <ul style={{ color: "var(--text-muted)", lineHeight: 1.9, paddingInlineStart: 20 }}>
          <li><strong>Moe</strong> — product and design</li>
          <li><strong>Moemen</strong> — content and curriculum</li>
          <li><strong>Eslam</strong> — AI behaviour and personality</li>
          <li><strong>Youssef</strong> — mobile</li>
        </ul>
      </section>
    </div>
  );
}
