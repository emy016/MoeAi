import type { Metadata } from "next";
import Client from "./Client";

export const metadata: Metadata = {
  title: 'Your library',
  description: 'Upload your own lectures, notes, PDFs or subtitles. MoeAI answers from them and cites the part it used.',
  alternates: { canonical: "/library" },
};

export default function Page() {
  return <Client />;
}
