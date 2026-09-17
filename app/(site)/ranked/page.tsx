import type { Metadata } from "next";
import Ranked from "./Ranked";

export const metadata: Metadata = {
  title: "Ranked",
  description: "Live competitive quiz matches against other students on your own syllabus.",
  alternates: { canonical: "/ranked" },
};

export default function Page() {
  return <Ranked />;
}
