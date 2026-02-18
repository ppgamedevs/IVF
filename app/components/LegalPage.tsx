import { useTranslations, useLocale } from "next-intl";
import Link from "next/link";
import Header from "./Header";
import Footer from "./Footer";

interface Section {
  titleKey: string;
  textKey: string;
  listKey?: string;
  extraKey?: string;
  subtitle1Key?: string;
  text1Key?: string;
  subtitle2Key?: string;
  text2Key?: string;
  subtitle3Key?: string;
  text3Key?: string;
}

interface LegalPageProps {
  namespace: string;
  sections: Section[];
}

export default function LegalPage({ namespace, sections }: LegalPageProps) {
  const t = useTranslations(namespace);
  const tLegal = useTranslations("legal");
  const locale = useLocale();

  return (
    <>
      <Header />
      <main className="bg-white min-h-screen">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
          <Link
            href={`/${locale}`}
            className="inline-flex items-center gap-1.5 text-sm text-primary-600 hover:text-primary-700 transition-colors mb-8"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
            {tLegal("backHome")}
          </Link>

          <h1 className="text-2xl sm:text-3xl font-bold text-medical-heading mb-4">
            {t("title")}
          </h1>

          <p className="text-sm text-medical-muted mb-8">
            {tLegal("lastUpdated", { date: "18.02.2026" })}
          </p>

          <p className="text-base text-medical-text leading-relaxed mb-8">
            {t("intro")}
          </p>

          <div className="space-y-8">
            {sections.map((section, idx) => (
              <article key={idx}>
                <h2 className="text-lg font-semibold text-medical-heading mb-3">
                  {t(section.titleKey)}
                </h2>
                <p className="text-base text-medical-text leading-relaxed">
                  {t(section.textKey)}
                </p>

                {section.listKey && (
                  <ul className="mt-3 space-y-1.5 pl-5 list-disc text-base text-medical-text leading-relaxed">
                    {(t(section.listKey) as string).split("|").map((item, i) => (
                      <li key={i}>{item}</li>
                    ))}
                  </ul>
                )}

                {section.extraKey && (
                  <p className="mt-3 text-base text-medical-text leading-relaxed">
                    {t(section.extraKey)}
                  </p>
                )}

                {section.subtitle1Key && (
                  <div className="mt-4">
                    <h3 className="text-sm font-semibold text-medical-heading mb-1">{t(section.subtitle1Key)}</h3>
                    <p className="text-base text-medical-text leading-relaxed">{t(section.text1Key!)}</p>
                  </div>
                )}
                {section.subtitle2Key && (
                  <div className="mt-4">
                    <h3 className="text-sm font-semibold text-medical-heading mb-1">{t(section.subtitle2Key)}</h3>
                    <p className="text-base text-medical-text leading-relaxed">{t(section.text2Key!)}</p>
                  </div>
                )}
                {section.subtitle3Key && (
                  <div className="mt-4">
                    <h3 className="text-sm font-semibold text-medical-heading mb-1">{t(section.subtitle3Key)}</h3>
                    <p className="text-base text-medical-text leading-relaxed">{t(section.text3Key!)}</p>
                  </div>
                )}
              </article>
            ))}
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
