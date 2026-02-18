import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { locales, defaultLocale } from "@/i18n/routing";
import ThankYouClient from "./ThankYouClient";

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://fivmatch.ro";

export async function generateMetadata({
  params: { locale },
}: {
  params: { locale: string };
}): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace: "thankYou" });

  const languages: Record<string, string> = {};
  for (const loc of locales) {
    languages[loc] = `${BASE_URL}/${loc}/thank-you`;
  }
  languages["x-default"] = `${BASE_URL}/${defaultLocale}/thank-you`;

  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    alternates: {
      canonical: `${BASE_URL}/${locale}/thank-you`,
      languages,
    },
    robots: {
      index: false,
      follow: false,
    },
  };
}

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export default async function ThankYouPage({
  params: { locale },
}: {
  params: { locale: string };
}) {
  const t = await getTranslations({ locale, namespace: "thankYou" });

  return (
    <>
      <div className="min-h-screen flex flex-col">
        <main className="flex-1 flex items-center justify-center px-4 py-16">
          <div className="max-w-lg text-center">
            <div className="w-20 h-20 mx-auto mb-6 flex items-center justify-center rounded-full bg-green-50">
              <svg
                className="w-10 h-10 text-green-500"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M4.5 12.75l6 6 9-13.5"
                />
              </svg>
            </div>

            <h1 className="text-2xl sm:text-3xl font-bold text-medical-heading mb-3">
              {t("title")}
            </h1>
            <p className="text-lg text-primary-700 font-medium mb-4">
              {t("subtitle")}
            </p>
            <p className="text-medical-muted text-base leading-relaxed mb-8">
              {t("body")}
            </p>

            <a
              href={`/${locale}`}
              className="inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold text-primary-700 bg-primary-50 border border-primary-200 rounded-xl hover:bg-primary-100 transition-colors duration-200"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18"
                />
              </svg>
              {t("backHome")}
            </a>
          </div>
        </main>
      </div>

      <ThankYouClient locale={locale} />
    </>
  );
}
