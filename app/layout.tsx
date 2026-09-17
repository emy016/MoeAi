/**
 * Root layout.
 *
 * Deliberately thin. The ported pages in app/(site) are conversions of
 * standalone HTML documents and bring their own navbar, footer, bottom tab bar
 * and stylesheet, so anything added here would show up on top of theirs.
 * Shared chrome lives in app/(portal)/layout.tsx instead.
 */
import type { Metadata, Viewport } from "next";

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://moe-ai-sable.vercel.app";

// The typefaces the original pages were designed in. Loaded here rather than
// per page so they are requested with the document instead of after hydration.
const FONTS =
  "https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:ital,wght@0,400;0,450;0,500;0,550;0,600;0,650;0,700;0,750;0,800;1,500&family=Space+Grotesk:wght@400;500;600;700&family=Fira+Code:wght@400;500;600&family=Inter:wght@300;400;500;600;700;800;900&display=swap";

/**
 * Applies the saved theme to <html> before first paint.
 *
 * setTheme() in the page scripts writes `edumoe-theme` to localStorage and sets
 * data-theme on documentElement. Without this, every load would paint the
 * default ruby theme and then snap to the chosen one after hydration.
 */
const THEME_BOOTSTRAP = `
try {
  var t = localStorage.getItem('edumoe-theme');
  if (t) document.documentElement.setAttribute('data-theme', t);
  var c = localStorage.getItem('edumoe-custom-color');
  if (c && t === 'custom') document.documentElement.style.setProperty('--accent', c);
} catch (e) {}
`.trim();

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: {
    default: "EDUMOE · Learn Computer Science The Cool Way",
    template: "%s · EduMoe",
  },
  description:
    "EduMoe is a free platform for Egyptian university students, built around MoeAI: a tutor that knows your actual syllabus and answers in Egyptian Arabic, Franco-Arabic, or English.",
  applicationName: "EduMoe",
  keywords: ["AI tutor", "Egypt", "FUE", "Computer Science", "Egyptian Arabic", "Franco-Arabic"],
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: "EduMoe",
    url: SITE,
    title: "EDUMOE · Learn Computer Science The Cool Way",
    description: "MoeAI knows your syllabus, not just the internet.",
  },
  twitter: {
    card: "summary_large_image",
    title: "EDUMOE · Learn Computer Science The Cool Way",
    description: "MoeAI knows your syllabus, not just the internet.",
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#0a0a0f",
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
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link rel="stylesheet" href={FONTS} />
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOTSTRAP }} />
      </head>
      <body>
        <script
          type="application/ld+json"
          // Static object authored here; no user input reaches it.
          dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }}
        />
        {children}
      </body>
    </html>
  );
}
