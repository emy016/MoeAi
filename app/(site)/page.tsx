import type { Metadata } from "next";
import Home from "./Home";

export const metadata: Metadata = {
  title: { absolute: "EDUMOE \u00b7 Learn Computer Science The Cool Way" },
  description: "EduMoe is a free platform for FUE Computer Science students: courses, simulators, quizzes, ranked practice and MoeAI, a curriculum-aware tutor.",
  alternates: { canonical: "/" },
};

export default function Page() {
  return <Home />;
}
