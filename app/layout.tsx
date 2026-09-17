// Root layout. Every page inherits the shell, the metadata defaults, and the
// nav. Per-page metadata overrides the title and description below.
import type { Metadata, Viewport } from "next";
import Nav from "@/components/Nav";
import BottomBar from "@/components/BottomBar";
import SetupNotice from "@/components/SetupNotice";
import Footer from "@/components/Footer";
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
  },
  twitter: {
    card: "summary_large_image",
    title: "EduMoe — curriculum-aware AI tutoring",
    description: "MoeAI knows your syllabus, not just the internet.",
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#07070c",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

const JSON_LD = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "EducationalOrganization",
      "@id": `${SITE}#org`,
      name: "EduMoe",
      url: SITE,
      description:
        "A free educational platform for Egyptian university students, built around MoeAI, a curriculum-aware AI tutor.",
      areaServed: "EG",
    },
    {
      "@type": "WebSite",
      "@id": `${SITE}#site`,
      url: SITE,
      name: "EduMoe",
      inLanguage: ["en", "ar-EG"],
      publisher: { "@id": `${SITE}#org` },
    },
    {
      "@type": "SoftwareApplication",
      name: "MoeAI",
      applicationCategory: "EducationalApplication",
      operatingSystem: "Web",
      url: `${SITE}/moeai`,
      description:
        "A curriculum-aware AI tutor that answers from the student's own lecture material in Egyptian Arabic, Franco-Arabic, or English.",
      offers: { "@type": "Offer", price: "0", priceCurrency: "EGP" },
    },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <script
          type="application/ld+json"
          // Static object we author ourselves — no user input reaches this.
          dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }}
        />
        <SetupNotice />
        <Nav />
        <main className="container">{children}</main>
        <Footer />
        <BottomBar />
      </body>
    </html>
  );
}
