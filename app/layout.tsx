import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://moe-ai-sable.vercel.app"),
  icons: { icon: [{ url: "/favicon.svg", type: "image/svg+xml" }, { url: "/favicon.ico", sizes: "48x48" }], apple: "/apple-touch-icon.png" },
  manifest: "/manifest.webmanifest",
  openGraph: { images: ["/brand/moeai-logo.jpg"] },
  title: {
    default: "EduMoe — Computer Science, made clear",
    template: "%s | EduMoe",
  },
  description:
    "A focused learning home for Computer Science students, powered by curriculum-aware AI.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#08080d",
  colorScheme: "dark",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body>{children}</body>
    </html>
  );
}
