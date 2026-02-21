import type { MetadataRoute } from "next";

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://fivmatch.ro";

/** Ensure HTTPS for production sitemap (Bing requires consistent canonical URLs). */
const siteUrl = BASE_URL.startsWith("http") ? BASE_URL : `https://${BASE_URL}`;

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "Bingbot",
        allow: "/",
        disallow: ["/admin", "/api/"],
      },
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/api/"],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  };
}
