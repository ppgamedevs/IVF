"use client";

import { useState, useEffect } from "react";
import { useTranslations, useLocale } from "next-intl";

const COOKIE_KEY = "fivmatch_cookie_consent";

type ConsentLevel = "all" | "essential" | null;

function getStoredConsent(): ConsentLevel {
  if (typeof window === "undefined") return null;
  const val = localStorage.getItem(COOKIE_KEY);
  if (val === "all" || val === "essential") return val;
  return null;
}

function storeConsent(level: "all" | "essential") {
  localStorage.setItem(COOKIE_KEY, level);
}

export default function CookieConsent() {
  const t = useTranslations("cookies");
  const locale = useLocale();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const consent = getStoredConsent();
    if (!consent) {
      let cancelled = false;
      const show = () => {
        if (!cancelled) setVisible(true);
      };
      if (typeof requestIdleCallback !== "undefined") {
        const id = requestIdleCallback(show, { timeout: 1500 });
        return () => {
          cancelled = true;
          cancelIdleCallback(id);
        };
      }
      const id = setTimeout(show, 1200);
      return () => {
        cancelled = true;
        clearTimeout(id);
      };
    }
  }, []);

  function accept(level: "all" | "essential") {
    storeConsent(level);
    setVisible(false);

    if (typeof window !== "undefined" && window.gtag) {
      if (level === "all") {
        window.gtag("consent", "update", {
          analytics_storage: "granted",
          ad_storage: "granted",
          ad_user_data: "granted",
          ad_personalization: "granted",
        });
      } else {
        window.gtag("consent", "update", {
          analytics_storage: "denied",
          ad_storage: "denied",
          ad_user_data: "denied",
          ad_personalization: "denied",
        });
      }
    }
  }

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-label={t("title")}
      className="fixed bottom-0 inset-x-0 z-[60] p-3 sm:p-4 animate-slideUp"
    >
      <div className="max-w-2xl mx-auto bg-white border border-medical-border rounded-2xl shadow-xl shadow-black/10 p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:gap-4">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-medical-heading mb-1">
              {t("title")}
            </p>
            <p className="text-xs sm:text-sm text-medical-muted leading-relaxed">
              {t("description")}{" "}
              <a
                href={`/${locale}/cookies`}
                className="text-primary-600 underline underline-offset-2 hover:text-primary-700"
              >
                {t("learnMore")}
              </a>
            </p>
          </div>
          <div className="flex gap-2 sm:flex-shrink-0">
            <button
              type="button"
              onClick={() => accept("essential")}
              className="flex-1 sm:flex-none px-4 py-2.5 text-sm font-medium text-medical-muted bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors duration-150 active:scale-[0.98]"
            >
              {t("acceptRecommended")}
            </button>
            <button
              type="button"
              onClick={() => accept("all")}
              className="flex-1 sm:flex-none px-4 py-2.5 text-sm font-semibold text-white bg-primary-600 hover:bg-primary-700 rounded-xl transition-colors duration-150 active:scale-[0.98]"
            >
              {t("acceptAll")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
