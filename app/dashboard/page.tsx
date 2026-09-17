import type { Metadata } from "next";
import Client from "./Client";

export const metadata: Metadata = {
  title: 'Your dashboard',
  description: 'Your progress, your weak spots, and everything MoeAI remembers about you.',
  alternates: { canonical: "/dashboard" },
};

export default function Page() {
  return <Client />;
}
