import type { Metadata } from "next";
import Courses from "./Courses";

export const metadata: Metadata = {
  title: "Courses",
  description: "First-year Computer Science at FUE: lectures, notes and videos in one place.",
  alternates: { canonical: "/courses" },
};

export default function Page() {
  return <Courses />;
}
