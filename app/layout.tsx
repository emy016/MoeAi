// Root layout. Every page inherits the shell, the metadata defaults, and the
// nav. Per-page metadata overrides the title and description below.
import type { Metadata, Viewport } from "next";
import Nav from "@/components/Nav";
import BottomBar from "@/components/BottomBar";
import "./globals.css";

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://moe-ai.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: {
    default: "EduMoe — curriculum-aware AI tutoring",
    template: "%s · EduMoe",
  },
  description:
    "EduMoe is a free educational platform for Egyptian university students, built around MoeAI: a tutor that knows your actual syllabus and answers in Egyptian Arabic, Franco-Arabic, or English.",
  applicationName: "EduMoe",
  keywords: ["AI tutor", "Egypt", "FUE", "Computer Science", "Egyptian Arabic", "Franco-Arabic"],
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: "EduMoe",
    url: SITE,
    title: "EduMoe — curriculum-aware AI tutoring",
    description:
      "MoeAI knows your syllabus, not just the internet. Egyptian Arabic, Franco, and English.",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "EduMoe — MoeAI tutor" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "EduMoe — curriculum-aware AI tutoring",
    description: "MoeAI knows your syllabus, not just the internet.",
    images: ["/og.png"],
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#07070c",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Nav />
        <main className="container">{children}</main>
        <BottomBar />
      </body>
    </html>
  );
}
