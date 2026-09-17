import type { Metadata } from "next";
import Client from "./Client";

export const metadata: Metadata = {
  title: 'Courses',
  description: 'First-year Computer Science at FUE: lectures, notes and videos in one place.',
  alternates: { canonical: "/courses" },
};

export default function Page() {
  return <Client />;
}
