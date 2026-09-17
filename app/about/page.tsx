import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "About",
  description: "Who builds EduMoe and why it exists.",
  alternates: { canonical: "/about" },
};

export default function Page() {
  return (
    <section className="card">
      <h1>About</h1>
      <p>EduMoe started as a Telegram channel serving around 230 first-year Computer Science students at FUE. This is what it grew into.</p>
      <Link className="btn" href="/moeai">Ask MoeAI in the meantime</Link>
    </section>
  );
}
