import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Simulators",
  description: "Interactive C++ and logic-design simulators for first-year Computer Science.",
  alternates: { canonical: "/simulators" },
};

export default function Page() {
  return (
    <section className="card">
      <h1>Simulators</h1>
      <p>Interactive C++ execution and logic-gate simulators. Watch the thing run instead of reading about it.</p>
      <Link className="btn" href="/moeai">Ask MoeAI in the meantime</Link>
    </section>
  );
}
