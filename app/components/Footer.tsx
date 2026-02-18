import { useTranslations, useLocale } from "next-intl";
import Link from "next/link";

export default function Footer() {
  const t = useTranslations("footer");
  const locale = useLocale();
  const year = new Date().getFullYear();

  return (
    <footer className="bg-slate-50 border-t border-medical-border">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-12">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 sm:gap-10 mb-8">
          {/* Brand + tagline */}
          <div className="sm:col-span-1">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-lg bg-primary-600 flex items-center justify-center flex-shrink-0">
                <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
                </svg>
              </div>
              <span className="text-base font-bold text-medical-heading tracking-tight">{t("brand")}</span>
            </div>
            <p className="text-sm text-medical-muted leading-relaxed">
              {t("tagline")}
            </p>
          </div>

          {/* Legal links */}
          <div>
            <h3 className="text-sm font-semibold text-medical-heading mb-3">{t("linksTitle")}</h3>
            <nav className="flex flex-col gap-2">
              <Link href={`/${locale}/privacy`} className="text-sm text-medical-muted hover:text-primary-600 transition-colors">
                {t("privacy")}
              </Link>
              <Link href={`/${locale}/terms`} className="text-sm text-medical-muted hover:text-primary-600 transition-colors">
                {t("terms")}
              </Link>
              <Link href={`/${locale}/cookies`} className="text-sm text-medical-muted hover:text-primary-600 transition-colors">
                {t("cookiePolicy")}
              </Link>
            </nav>
          </div>

          {/* Contact */}
          <div>
            <h3 className="text-sm font-semibold text-medical-heading mb-3">{t("contactTitle")}</h3>
            <a
              href={`mailto:${t("contactEmail")}`}
              className="text-sm text-medical-muted hover:text-primary-600 transition-colors"
            >
              {t("contactEmail")}
            </a>
          </div>
        </div>

        {/* Disclaimer */}
        <div className="border-t border-medical-border/60 pt-6 mb-6">
          <p className="text-xs text-medical-muted/70 leading-relaxed max-w-3xl">
            {t("disclaimer")}
          </p>
        </div>

        {/* Copyright */}
        <p className="text-xs text-medical-muted/60">{t("copyright", { year })}</p>
      </div>
    </footer>
  );
}
