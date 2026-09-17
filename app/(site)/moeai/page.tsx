import type { Metadata } from "next";
import MoeAI from "./MoeAI";

export const metadata: Metadata = {
  title: "MoeAI \u2014 your tutor",
  description: "Ask in Egyptian Arabic, Franco-Arabic or English. MoeAI answers from your own lecture material.",
  alternates: { canonical: "/moeai" },
};

export default function Page() {
  return <MoeAI />;
}
