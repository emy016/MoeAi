import type { Metadata } from "next";
import Client from "./Client";

export const metadata: Metadata = {
  title: 'Quizzes',
  description: 'Practice questions written from your own lecture material, not a generic question bank.',
  alternates: { canonical: "/quizzes" },
};

export default function Page() {
  return <Client />;
}
