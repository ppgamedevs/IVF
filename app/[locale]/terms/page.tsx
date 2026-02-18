import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { locales } from "@/i18n/routing";
import LegalPage from "../../components/LegalPage";

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://fivmatch.ro";

export async function generateMetadata({
  params: { locale },
}: {
  params: { locale: string };
}): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace: "terms" });

  const languages: Record<string, string> = {};
  for (const loc of locales) {
    languages[loc] = `${BASE_URL}/${loc}/terms`;
  }

  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    alternates: {
      canonical: `${BASE_URL}/${locale}/terms`,
      languages,
    },
  };
}

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

const SECTIONS = [
  { titleKey: "s1Title", textKey: "s1Text" },
  { titleKey: "s2Title", textKey: "s2Text" },
  { titleKey: "s3Title", textKey: "s3Text", listKey: "s3List" },
  { titleKey: "s4Title", textKey: "s4Text", listKey: "s4List", extraKey: "s4Extra" },
  { titleKey: "s5Title", textKey: "s5Text" },
  { titleKey: "s6Title", textKey: "s6Text" },
  { titleKey: "s7Title", textKey: "s7Text", listKey: "s7List" },
  { titleKey: "s8Title", textKey: "s8Text" },
  { titleKey: "s9Title", textKey: "s9Text" },
  { titleKey: "s10Title", textKey: "s10Text" },
  { titleKey: "s11Title", textKey: "s11Text" },
];

export default function TermsPage() {
  return <LegalPage namespace="terms" sections={SECTIONS} />;
}
