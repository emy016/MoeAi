import type { MetadataRoute } from "next";

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://moe-ai.vercel.app";
const ROUTES = ["", "/courses", "/quizzes", "/simulators", "/ranked", "/moeai", "/about", "/legal"];

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return ROUTES.map((path) => ({
    url: `${SITE}${path}`,
    lastModified: now,
    changeFrequency: "weekly" as const,
    priority: path === "" ? 1 : path === "/moeai" ? 0.9 : 0.7,
  }));
}
