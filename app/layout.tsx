import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://edu-moe-ai.vercel.app"),
  title: {
    default: "EduMoe — Computer Science, made clear",
    template: "%s | EduMoe",
  },
  description:
    "A focused learning home for FUE Computer Science students, powered by curriculum-aware AI.",
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
