import { useTranslations, useLocale } from "next-intl";
import Link from "next/link";
import LanguageToggle from "./LanguageToggle";

export default function Header() {
  const t = useTranslations("header");
  const locale = useLocale();

  return (
    <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-medical-border/60">
      <div className="container-wide px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14 sm:h-16">
          {/* Brand */}
          <Link href={`/${locale}`} className="flex items-center gap-2">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-primary-600 flex items-center justify-center flex-shrink-0">
              <svg
                className="w-4 h-4 sm:w-5 sm:h-5 text-white"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z"
                />
              </svg>
            </div>
            <span className="text-base sm:text-lg font-bold text-medical-heading tracking-tight">
              {t("brand")}
            </span>
          </Link>

          {/* Language toggle */}
          <LanguageToggle />
        </div>
      </div>
    </header>
  );
}
