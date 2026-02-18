"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

function FAQItem({
  question,
  answer,
  isOpen,
  onToggle,
}: {
  question: string;
  answer: string;
  isOpen: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="border-b border-medical-border last:border-b-0">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between py-5 text-left group"
        aria-expanded={isOpen}
      >
        <span className="text-base font-medium text-medical-heading pr-4 group-hover:text-primary-600 transition-colors">
          {question}
        </span>
        <svg
          className={`w-5 h-5 text-medical-muted flex-shrink-0 transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2}
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
        </svg>
      </button>
      <div
        className={`overflow-hidden transition-all duration-300 ease-in-out ${
          isOpen ? "max-h-96 pb-5" : "max-h-0"
        }`}
      >
        <p className="text-medical-muted leading-relaxed pr-8">{answer}</p>
      </div>
    </div>
  );
}

const faqKeys = ["q1", "q2", "q3", "q4", "q5"] as const;

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  const t = useTranslations("faq");

  return (
    <section className="bg-medical-bg">
      <div className="section-padding">
        <div className="container-narrow">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-medical-heading mb-4">{t("title")}</h2>
            <p className="text-medical-muted text-lg">{t("subtitle")}</p>
          </div>

          <div className="bg-white rounded-2xl border border-medical-border px-6 sm:px-8">
            {faqKeys.map((key, index) => (
              <FAQItem
                key={key}
                question={t(key)}
                answer={t(key.replace("q", "a") as `a${1 | 2 | 3 | 4 | 5}`)}
                isOpen={openIndex === index}
                onToggle={() => setOpenIndex(openIndex === index ? null : index)}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
