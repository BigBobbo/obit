import type { MetadataRoute } from "next";

// Memorial pages are unlisted: never crawled, never in a sitemap (PRD §6).
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "*", disallow: ["/m/", "/api/", "/dashboard/", "/admin/"] },
    ],
  };
}
