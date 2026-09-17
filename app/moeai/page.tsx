import type { Metadata } from "next";
import Chat from "./Chat";

export const metadata: Metadata = {
  title: "MoeAI — your tutor",
  description:
    "Ask in Egyptian Arabic, Franco-Arabic, or English. MoeAI answers from your own lecture material and shows you which part it used.",
  alternates: { canonical: "/moeai" },
};

export default function MoeAIPage() {
  return (
    <>
      <div className="page-head">
        <h1>MoeAI</h1>
        <p className="muted">
          Ask in Arabic, Franco, or English. It replies in whatever you used, and
          tells you which of your material it leaned on.
        </p>
      </div>
      <Chat />
    </>
  );
}
