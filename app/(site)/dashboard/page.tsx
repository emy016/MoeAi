import type { Metadata } from "next";
import Dashboard from "./Dashboard";

export const metadata: Metadata = {
  title: "Dashboard",
  description: "Your progress, your weak spots, and what MoeAI suggests revising next.",
  alternates: { canonical: "/dashboard" },
};

export default function Page() {
  return <Dashboard />;
}
