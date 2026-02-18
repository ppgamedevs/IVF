import { locales, type Locale } from "@/i18n/routing";
import { notFound } from "next/navigation";

/**
 * Validates a locale parameter. Calls notFound() for unsupported locales,
 * which renders the closest not-found boundary.
 */
export function validateLocale(locale: string): asserts locale is Locale {
  if (!locales.includes(locale as Locale)) {
    notFound();
  }
}
