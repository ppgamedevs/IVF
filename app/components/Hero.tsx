import { useTranslations } from "next-intl";
import CtaLink from "./CtaLink";

export default function Hero() {
  const t = useTranslations("hero");

  return (
    <section className="bg-white">
      <div className="px-4 sm:px-6 lg:px-8 pt-10 sm:pt-14 lg:pt-16 pb-10 sm:pb-12 lg:pb-14">
        <div className="max-w-2xl mx-auto text-center">
          <p className="text-xs sm:text-sm text-medical-muted mb-5 sm:mb-6 tracking-wide">
            {t("badge")}
          </p>

          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold leading-tight tracking-tight text-medical-heading mb-4 sm:mb-5">
            {t("title")}{" "}
            <span className="text-primary-600">{t("titleHighlight")}</span>
          </h1>

          <p className="text-base sm:text-lg text-medical-muted max-w-xl mx-auto mb-8 sm:mb-10 leading-relaxed">
            {t("subtitle")}
          </p>

          <CtaLink
            href="#lead-form"
            location="hero"
            className="inline-flex items-center justify-center px-8 py-3.5 sm:py-4 text-base font-semibold text-white bg-primary-700 rounded-xl hover:bg-primary-800 active:bg-primary-900 active:scale-[0.99] transition-all duration-200 shadow-md shadow-primary-700/30 hover:shadow-lg hover:shadow-primary-700/40"
          >
            {t("cta")}
          </CtaLink>

          <p className="mt-4 text-xs sm:text-sm text-medical-muted/70">{t("trustLine")}</p>
        </div>
      </div>
    </section>
  );
}
