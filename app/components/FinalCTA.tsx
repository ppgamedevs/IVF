import { useTranslations } from "next-intl";
import CtaLink from "./CtaLink";

export default function FinalCTA() {
  const t = useTranslations("finalCta");

  return (
    <section className="bg-gradient-to-br from-primary-900 via-primary-800 to-primary-900 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary-700/30 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-72 h-72 bg-primary-600/20 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
      </div>

      <div className="relative section-padding">
        <div className="container-narrow text-center">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-4 text-balance">
            {t("title")}
          </h2>
          <p className="text-primary-200 text-lg max-w-xl mx-auto mb-8 leading-relaxed">
            {t("description")}
          </p>
          <CtaLink
            href="#lead-form"
            location="final_cta"
            className="inline-flex items-center justify-center px-8 py-4 text-base font-semibold text-primary-900 bg-white rounded-xl hover:bg-primary-50 active:bg-primary-100 transition-all duration-200 shadow-lg hover:shadow-xl hover:-translate-y-0.5"
          >
            {t("cta")}
            <svg className="ml-2 w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </CtaLink>
          <p className="mt-4 text-sm text-primary-300">{t("trustLine")}</p>
        </div>
      </div>
    </section>
  );
}
