import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, getTranslations } from "next-intl/server";
import { validateLocale } from "@/lib/locale";
import { locales, defaultLocale } from "@/i18n/routing";
import GoogleAnalytics, { GtmNoScript } from "../components/GoogleAnalytics";
import CookieConsent from "../components/CookieConsent";
import "../globals.css";

const inter = Inter({
  subsets: ["latin", "latin-ext"],
  variable: "--font-inter",
  display: "swap",
});

// Must match the exact site URL (HTTPS, no trailing slash) so canonical and hreflang are correct
const BASE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://fivmatch.ro")
  .replace(/\/$/, "")
  .replace(/^http:\/\//i, "https://");

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#ffffff",
};

export async function generateMetadata({
  params: { locale },
}: {
  params: { locale: string };
}): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace: "metadata" });

  const canonicalUrl = `${BASE_URL}/${locale}`;
  // Self-referencing hreflang: current locale + all alternates + x-default
  const languageAlternates: Record<string, string> = {
    [locale]: canonicalUrl,
    "x-default": `${BASE_URL}/${defaultLocale}`,
  };
  for (const loc of locales) {
    if (loc !== locale) languageAlternates[loc] = `${BASE_URL}/${loc}`;
  }

  const ogLocale = locale === "ro" ? "ro_RO" : "en_US";
  const ogAlternateLocales = locales
    .filter((l) => l !== locale)
    .map((l) => (l === "ro" ? "ro_RO" : "en_US"));

  return {
    metadataBase: new URL(BASE_URL),
    title: t("title"),
    description: t("description"),
    keywords: t("keywords"),
    alternates: {
      canonical: canonicalUrl,
      languages: languageAlternates,
    },
    icons: {
      icon: "/icon.svg",
      apple: "/icon.svg",
    },
    openGraph: {
      title: t("title"),
      description: t("description"),
      url: `${BASE_URL}/${locale}`,
      siteName: "FIV Match",
      type: "website",
      locale: ogLocale,
      alternateLocale: ogAlternateLocales,
    },
    twitter: {
      card: "summary_large_image",
      title: t("title"),
      description: t("description"),
    },
    robots: {
      index: true,
      follow: true,
      "max-snippet": -1,
      "max-image-preview": "large" as const,
      "max-video-preview": -1,
    },
    other: {
      "geo.region": "RO",
      "geo.placename": "Romania",
      "ICBM": "45.9432, 24.9668",
    },
  };
}

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params: { locale },
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  validateLocale(locale);
  const messages = await getMessages();

  const baseUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://fivmatch.ro").replace(/\/$/, "");
  const webSiteDescription =
    locale === "ro"
      ? "Serviciu de potrivire între pacienți și clinici private FIV din România. Solicitare gratuită, contact în 72 de ore."
      : "Matching service between patients and private IVF clinics in Romania. Free request, contact within 72 hours.";

  const organizationId = `${baseUrl}/#organization`;
  const jsonLdGraph = [
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      "@id": organizationId,
      name: "FIV Match",
      url: baseUrl,
      logo: `${baseUrl}/icon.svg`,
      description: webSiteDescription,
      areaServed: { "@type": "Country", name: "Romania" },
      contactPoint: {
        "@type": "ContactPoint",
        email: "leads@fivmatch.ro",
        contactType: "customer service",
        areaServed: "RO",
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      "@id": `${baseUrl}/#website`,
      name: "FIV Match",
      url: baseUrl,
      publisher: { "@id": organizationId },
      inLanguage: locale === "ro" ? "ro" : "en",
      description: webSiteDescription,
      areaServed: { "@type": "Country", name: "Romania" },
    },
  ];

  return (
    <html lang={locale} className={inter.variable}>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({ "@context": "https://schema.org", "@graph": jsonLdGraph }),
          }}
        />
      </head>
      <body className="font-sans antialiased bg-white text-medical-heading">
        <GoogleAnalytics />
        <GtmNoScript />
        <NextIntlClientProvider messages={messages}>
          {children}
          <CookieConsent />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
