import type { Metadata } from "next";
import Quizzes from "./Quizzes";

export const metadata: Metadata = {
  title: "Quizzes",
  description: "Practice questions drawn from your own lecture material.",
  alternates: { canonical: "/quizzes" },
};

export default function Page() {
  return <Quizzes />;
}
