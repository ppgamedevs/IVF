import type { MetadataRoute } from "next";
import { locales, defaultLocale } from "@/i18n/routing";

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://fivmatch.ro";
const SITE_URL = BASE_URL.startsWith("http") ? BASE_URL : `https://${BASE_URL}`;

/** Public paths under [locale] (no leading slash). Admin and API excluded. Bing: use canonical URLs only. */
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
  const now = new Date();

  for (const locale of locales) {
    for (const path of localePaths) {
      const pathSegment = path ? `/${path}` : "";
      const url = `${SITE_URL}/${locale}${pathSegment}`;
      const languages: Record<string, string> = {};
      for (const loc of locales) {
        languages[loc] = `${SITE_URL}/${loc}${pathSegment}`;
      }
      languages["x-default"] = `${SITE_URL}/${defaultLocale}${pathSegment}`;

      entries.push({
        url,
        lastModified: now,
        changeFrequency: path === "" ? "daily" : "monthly",
        priority: path === "" ? 1 : 0.8,
        alternates: { languages },
      });
    }
  }

  return entries;
}
