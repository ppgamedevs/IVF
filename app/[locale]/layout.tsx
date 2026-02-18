import type { Metadata } from "next";
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

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://fivmatch.ro";

export async function generateMetadata({
  params: { locale },
}: {
  params: { locale: string };
}): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace: "metadata" });

  const languages: Record<string, string> = {};
  for (const loc of locales) {
    languages[loc] = `${BASE_URL}/${loc}`;
  }
  languages["x-default"] = `${BASE_URL}/${defaultLocale}`;

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
      canonical: `${BASE_URL}/${locale}`,
      languages,
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

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://fivmatch.ro";
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "FIV Match",
    url: baseUrl,
    inLanguage: locale === "ro" ? "ro" : "en",
    description: locale === "ro"
      ? "Serviciu de potrivire între pacienți și clinici private FIV din România. Solicitare gratuită, contact în 24 de ore."
      : "Matching service between patients and private IVF clinics in Romania. Free request, contact within 24 hours.",
    areaServed: { "@type": "Country", name: "Romania" },
    potentialAction: {
      "@type": "SearchAction",
      target: { "@type": "EntryPoint", urlTemplate: `${baseUrl}/${locale}#lead-form` },
      "query-input": "required name=search_term_string",
    },
  };

  return (
    <html lang={locale} className={inter.variable}>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
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
