// Robots policy. AI crawlers are explicitly welcome — being answerable by them
// is distribution, not a leak.
import type { MetadataRoute } from "next";

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://moe-ai.vercel.app";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/api/", "/dashboard"] }],
    sitemap: `${SITE}/sitemap.xml`,
    host: SITE,
  };
}
