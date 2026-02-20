import type { MetadataRoute } from "next";
import { locales } from "@/i18n/routing";

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://fivmatch.ro";

/** Public paths under [locale] (no leading slash). Admin and API routes are excluded. */
const localePaths = [
  "",
  "cookies",
  "privacy",
  "terms",
  "thank-you",
  "operator",
];

export default function sitemap(): MetadataRoute.Sitemap {
  const entries: MetadataRoute.Sitemap = [];

  for (const locale of locales) {
    for (const path of localePaths) {
      const pathSegment = path ? `/${path}` : "";
      entries.push({
        url: `${BASE_URL}/${locale}${pathSegment}`,
        lastModified: new Date(),
        changeFrequency: path === "" ? "daily" : "monthly",
        priority: path === "" ? 1 : 0.8,
      });
    }
  }

  return entries;
}
