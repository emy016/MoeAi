import type { MetadataRoute } from "next";

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://moe-ai-sable.vercel.app";

// AI crawlers are welcome: being answerable by them is distribution.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/api/", "/admin"] }],
    sitemap: `${SITE}/sitemap.xml`,
    host: SITE,
  };
}
