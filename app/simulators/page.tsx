import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Simulators",
  description: "Interactive C++ and logic-design simulators for first-year Computer Science.",
  alternates: { canonical: "/simulators" },
};

const PLANNED = [
  { name: "C++ trace", body: "Step through a program line by line and watch the stack, the heap, and every pointer as it moves." },
  { name: "Logic gates", body: "Wire gates together, toggle inputs, read the truth table as it fills in." },
  { name: "Circuit solver", body: "Build an RLC circuit and watch Kirchhoff's laws resolve it." },
  { name: "Sorting", body: "Race sorting algorithms on the same array and see where the complexity comes from." },
];

export default function Simulators() {
  return (
    <div className="stack">
      <section className="card">
        <h1>Simulators</h1>
        <p>
          Watch the thing run instead of reading about it. These are next on the
          roadmap — the tutor came first, because a simulator you cannot ask
          questions about is just an animation.
        </p>
        <Link className="btn btn-primary" href="/moeai">Ask MoeAI to walk you through it instead</Link>
      </section>

      <section className="grid">
        {PLANNED.map((s) => (
          <article className="card" key={s.name}>
            <h2 style={{ fontSize: "1.05rem" }}>{s.name}</h2>
            <p>{s.body}</p>
            <span className="muted" style={{ fontSize: "0.78rem" }}>Planned</span>
          </article>
        ))}
      </section>
    </div>
  );
}
