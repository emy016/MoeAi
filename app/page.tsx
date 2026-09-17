/**
 * Homepage. One H1, one clear call to action, no filler.
 * The rotating 3D book replaces the hero visual later — deliberately last,
 * because it is the only thing here whose absence cannot break the pitch.
 */
import Link from "next/link";

const PILLARS = [
  {
    title: "It learns your syllabus",
    body: "Upload your lectures, notes, or slides. MoeAI answers from them and shows you which part it used. When your instructor's method differs from the textbook, it teaches your instructor's.",
    href: "/library",
    cta: "Add your material",
  },
  {
    title: "It speaks how you speak",
    body: "Egyptian Arabic, Franco-Arabic, or English — detected per message, never forced. Ask in Franco, get Franco. Technical terms stay readable either way.",
    href: "/moeai",
    cta: "Try it",
  },
  {
    title: "It remembers you",
    body: "What you got wrong last week shapes how it explains this week. You can read everything it remembers, and delete any of it.",
    href: "/dashboard",
    cta: "See your dashboard",
  },
];

export default function Home() {
  return (
    <>
      <section className="hero card">
        <p className="eyebrow">EduMoe · MoeAI</p>
        <h1>
          The tutor that actually knows{" "}
          <span className="gradient-text">what you&rsquo;re studying</span>
        </h1>
        <p className="lede">
          General AI explains the subject. MoeAI explains <em>your course</em> — from
          your own lecture material, in your own language, and it remembers where you
          got stuck.
        </p>
        <div className="cta">
          <Link className="btn btn-primary" href="/moeai">Ask MoeAI</Link>
          <Link className="btn" href="/library">Upload a lecture</Link>
        </div>
      </section>

      <section className="grid" aria-label="What makes MoeAI different">
        {PILLARS.map((p) => (
          <article className="card pillar" key={p.title}>
            <h2>{p.title}</h2>
            <p>{p.body}</p>
            <Link className="btn" href={p.href}>{p.cta}</Link>
          </article>
        ))}
      </section>

      <section className="card band">
        <p>
          EduMoe started as a study channel for first-year Computer Science students
          at Future University in Egypt — around 230 of them, roughly half the cohort.
          MoeAI is what that channel was always trying to become.
        </p>
        <Link className="btn" href="/about">More about the project</Link>
      </section>
    </>
  );
}
