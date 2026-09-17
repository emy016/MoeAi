// Homepage. One H1, one clear call to action, no filler.
// The rotating 3D book replaces this hero block later — deliberately last,
// because it is the only thing here that cannot break the pitch if it is cut.
import Link from "next/link";

const PILLARS = [
  {
    title: "Knows your syllabus",
    body: "MoeAI answers from your actual lectures. When your instructor's method differs from the textbook, it teaches your instructor's.",
  },
  {
    title: "Speaks how you speak",
    body: "Egyptian Arabic, Franco-Arabic, or English — detected per message, never forced. Technical terms stay readable.",
  },
  {
    title: "Remembers you",
    body: "What you struggled with last week shapes how it explains this week. Your memory is yours, and you can delete it.",
  },
];

export default function Home() {
  return (
    <>
      <section className="hero card">
        <h1>
          The AI that actually knows{" "}
          <span className="gradient-text">what you&rsquo;re studying</span>
        </h1>
        <p>
          EduMoe is a free platform for Egyptian university students. MoeAI, its tutor,
          is built on your curriculum instead of the open internet — and it answers in
          your language, not a translated one.
        </p>
        <div className="cta">
          <Link className="btn btn-primary" href="/moeai">Ask MoeAI</Link>
          <Link className="btn" href="/courses">Browse courses</Link>
        </div>
      </section>

      <section className="grid" style={{ marginTop: 24 }} aria-label="What makes MoeAI different">
        {PILLARS.map((p) => (
          <article className="card" key={p.title}>
            <h2>{p.title}</h2>
            <p>{p.body}</p>
          </article>
        ))}
      </section>
    </>
  );
}
