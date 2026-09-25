import { readdirSync } from "node:fs";
import path from "node:path";
import type { NextConfig } from "next";

/**
 * The EduMoe pages are plain HTML in public/ — no React, no hydration, which is
 * why they feel instant and the glass blur stays smooth.
 *
 * Next serves them at their literal path (/courses.html) and has no route for
 * /courses, so the clean URLs are declared here rather than left to Vercel's
 * `cleanUrls`. Two reasons: this works identically in `next start`, so it can
 * be tested before deploying, and `/` needs an explicit mapping either way
 * since there is no app/page.tsx.
 *
 * Generated from what is actually in public/, so adding a page is just adding
 * the file.
 */
function htmlPages(): string[] {
  try {
    return readdirSync(path.join(process.cwd(), "public"))
      .filter((file) => file.endsWith(".html"))
      .map((file) => file.replace(/\.html$/, ""));
  } catch {
    return [];
  }
}

const pages = htmlPages();

const nextConfig: NextConfig = {
  poweredByHeader: false,
  devIndicators: false,
  // Source maps are a "this was vibecoded" giveaway and leak your logic.
  productionBrowserSourceMaps: false,
  // Read at runtime by the MoeAI route, so it has to be traced into the
  // serverless bundle rather than left behind at build time.
  outputFileTracingIncludes: {
    "/api/moeai": ["./prompts/**"],
    "/api/health": ["./prompts/**"],
  },

  // The app shell and its version file must never be served from a cache:
  // a stale copy is how a student ends up on last week's MoeAI.
  async headers() {
    const fresh = [{ key: "Cache-Control", value: "no-cache, no-store, must-revalidate" }];
    return ["/moeai", "/moeai-app.html", "/app-version.json"].map((source) => ({ source, headers: fresh }));
  },

  async rewrites() {
    return [
      { source: "/", destination: "/index.html" },
      // /moeai is Youssef's app, exported to static web by Expo. Its bundle
      // references /_expo absolutely, so the files sit at the public root and
      // only its entry page is rewritten — the URL stays /moeai.
      { source: "/moeai", destination: "/moeai-app.html" },
      ...pages
        .filter((page) => page !== "index")
        .map((page) => ({ source: `/${page}`, destination: `/${page}.html` })),
    ];
  },

  // One canonical address per page: /courses.html sends you to /courses, which
  // then serves the file internally without changing the URL again.
  async redirects() {
    return [
      { source: "/index.html", destination: "/", permanent: true },
      // The Organizer is the professor's page; people look for it by these names.
      ...["/tutor", "/professor", "/staff", "/teach"].map((source) => ({ source, destination: "/organizer", permanent: false })),
      ...pages
        .filter((page) => page !== "index")
        .map((page) => ({ source: `/${page}.html`, destination: `/${page}`, permanent: true })),
    ];
  },
};

export default nextConfig;
