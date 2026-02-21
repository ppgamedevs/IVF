import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { locales, defaultLocale } from "@/i18n/routing";
import LegalPage from "../../components/LegalPage";

const BASE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://fivmatch.ro").replace(/\/$/, "");

export async function generateMetadata({
  params: { locale },
}: {
  params: { locale: string };
}): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace: "cookiePolicy" });

  const languages: Record<string, string> = { "x-default": `${BASE_URL}/${defaultLocale}/cookies` };
  for (const loc of locales) {
    languages[loc] = `${BASE_URL}/${loc}/cookies`;
  }

  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    alternates: {
      canonical: `${BASE_URL}/${locale}/cookies`,
      languages,
    },
  };
}

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

const SECTIONS = [
  { titleKey: "s1Title", textKey: "s1Text" },
  {
    titleKey: "s2Title",
    textKey: "s2Title",
    subtitle1Key: "s2Subtitle1",
    text1Key: "s2Text1",
    subtitle2Key: "s2Subtitle2",
    text2Key: "s2Text2",
    subtitle3Key: "s2Subtitle3",
    text3Key: "s2Text3",
  },
  { titleKey: "s3Title", textKey: "s3Text" },
  { titleKey: "s4Title", textKey: "s4Text", listKey: "s4List", extraKey: "s4Extra" },
  { titleKey: "s5Title", textKey: "s5Text" },
  { titleKey: "s6Title", textKey: "s6Text" },
  { titleKey: "s7Title", textKey: "s7Text" },
];

export default function CookiePolicyPage() {
  return <LegalPage namespace="cookiePolicy" sections={SECTIONS} />;
}
