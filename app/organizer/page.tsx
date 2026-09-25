import type { Metadata } from "next";
import Client from "./Client";
import "katex/dist/katex.min.css";
import "@/components/brand/logo.css";
import "../org.css";

export const metadata: Metadata = {
  title: "MoeAI Tutor page",
  description: "Tutor mode for course staff: upload a course once and MoeAI organizes it into the knowledge its students learn from.",
  robots: { index: false },
};

export default function Page() {
  return <Client />;
}
