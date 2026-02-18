"use client";

import { useLocale } from "next-intl";
import { usePathname, useRouter } from "@/i18n/routing";
import { type Locale, locales } from "@/i18n/routing";

const LOCALE_LABELS: Record<Locale, string> = {
  ro: "Română",
  en: "English",
};

export default function LanguageToggle() {
  const locale = useLocale() as Locale;
  const pathname = usePathname();
  const router = useRouter();

  function switchLocale(newLocale: Locale) {
    if (newLocale === locale) return;
    router.replace(pathname, { locale: newLocale });
  }

  return (
    <nav
      role="group"
      aria-label="Language selector"
      className="flex items-center"
    >
      {locales.map((loc, i) => {
        const isActive = locale === loc;

        return (
          <span key={loc} className="flex items-center">
            {i > 0 && (
              <span
                className="mx-1.5 text-medical-border select-none"
                aria-hidden="true"
              >
                |
              </span>
            )}
            <button
              type="button"
              onClick={() => switchLocale(loc)}
              disabled={isActive}
              aria-label={
                isActive
                  ? `${LOCALE_LABELS[loc]} (current language)`
                  : `Switch to ${LOCALE_LABELS[loc]}`
              }
              aria-current={isActive ? "true" : undefined}
              className={`text-sm tracking-wide transition-colors duration-150 ${
                isActive
                  ? "font-bold text-primary-700 underline underline-offset-4 decoration-2 decoration-primary-500 cursor-default"
                  : "font-medium text-medical-muted hover:text-medical-heading cursor-pointer"
              }`}
            >
              {loc.toUpperCase()}
            </button>
          </span>
        );
      })}
    </nav>
  );
}
