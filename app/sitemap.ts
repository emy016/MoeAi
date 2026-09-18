import { readdirSync } from "node:fs";
import path from "node:path";
import type { MetadataRoute } from "next";

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://moe-ai-sable.vercel.app";

/** Derived from the HTML actually in public/, plus the app routes. */
export default function sitemap(): MetadataRoute.Sitemap {
  let pages: string[] = [];
  try {
    pages = readdirSync(path.join(process.cwd(), "public"))
      .filter((f) => f.endsWith(".html"))
      .map((f) => f.replace(/\.html$/, ""))
      .map((name) => (name === "index" ? "" : `/${name}`));
  } catch {
    pages = [""];
  }

  // admin is a private tool, not something to invite crawlers into.
  const routes = [...new Set([...pages, "/moeai", "/workspace", "/legal"])].filter((r) => r !== "/admin");
  const now = new Date();

  return routes.map((route) => ({
    url: `${SITE}${route}`,
    lastModified: now,
    changeFrequency: "weekly" as const,
    priority: route === "" ? 1 : route === "/moeai" ? 0.9 : 0.7,
  }));
}
