"use client";

import { useState, useRef, useEffect, useCallback, type FormEvent } from "react";
import { useTranslations, useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import FormSelect from "./FormSelect";
import {
  trackFormStart,
  trackFormSubmit,
  trackFormError,
  trackGenerateLead,
  trackConversion,
} from "@/lib/analytics";

interface FormData {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  femaleAgeExact: string;
  maleAgeExact: string;
  city: string;
  triedIVF: string;
  primaryFactor: string;
  hasRecentTests: string;
  testsList: string;
  previousClinics: string;
  urgencyLevel: string;
  budgetRange: string;
  voucherStatus: string;
  availabilityWindows: string;
  bestContactMethod: string;
  message: string;
  gdprConsent: boolean;
  consentToShare: boolean;
}

const initialFormData: FormData = {
  firstName: "",
  lastName: "",
  phone: "",
  email: "",
  femaleAgeExact: "",
  maleAgeExact: "",
  city: "",
  triedIVF: "",
  primaryFactor: "",
  hasRecentTests: "",
  testsList: "",
  previousClinics: "",
  urgencyLevel: "",
  budgetRange: "",
  voucherStatus: "",
  availabilityWindows: "",
  bestContactMethod: "",
  message: "",
  gdprConsent: false,
  consentToShare: false,
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isValidPhone(raw: string): boolean {
  const stripped = raw.replace(/[\s\-\.\(\)]/g, "");
  if (!/^(\+?40|0)/.test(stripped)) return false;
  const digits = stripped.replace(/\D/g, "");
  return digits.length >= 10 && digits.length <= 13;
}

function deriveAgeRange(age: number): string {
  if (age < 30) return "under-30";
  if (age <= 34) return "30-34";
  if (age <= 37) return "35-37";
  if (age <= 40) return "38-40";
  return "41+";
}

function deriveTimeline(urgency: string): string {
  const map: Record<string, string> = {
    ASAP_0_30: "asap",
    SOON_1_3: "1-3months",
    MID_3_6: "1-3months",
    LATER_6_12: "researching",
    INFO_ONLY: "researching",
  };
  return map[urgency] || "researching";
}

const inputClasses =
  "w-full px-4 py-3 rounded-xl border border-medical-border bg-white text-medical-heading placeholder:text-medical-muted/60 focus:border-primary-400 focus:outline-none transition-colors duration-200 text-base";

const labelClasses = "block text-sm font-medium text-medical-text mb-1.5";

export default function LeadForm() {
  const t = useTranslations("form");
  const locale = useLocale();
  const router = useRouter();
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});
  const honeypotRef = useRef<HTMLInputElement>(null);
  const renderedAtRef = useRef<number>(Date.now());
  const formStartedRef = useRef(false);

  useEffect(() => {
    renderedAtRef.current = Date.now();
  }, []);

  const handleFormInteraction = useCallback(() => {
    if (!formStartedRef.current) {
      formStartedRef.current = true;
      trackFormStart();
    }
  }, []);

  const primaryFactors = [
    { value: "UNKNOWN", label: t("primaryFactorUnknown") },
    { value: "MALE_FACTOR", label: t("primaryFactorMale") },
    { value: "FEMALE_FACTOR", label: t("primaryFactorFemale") },
    { value: "BOTH", label: t("primaryFactorBoth") },
    { value: "UNEXPLAINED", label: t("primaryFactorUnexplained") },
    { value: "ENDOMETRIOSIS", label: t("primaryFactorEndometriosis") },
    { value: "LOW_OVARIAN_RESERVE", label: t("primaryFactorLowReserve") },
    { value: "TUBAL", label: t("primaryFactorTubal") },
    { value: "PCOS", label: t("primaryFactorPCOS") },
    { value: "OTHER", label: t("primaryFactorOther") },
  ];

  const urgencyLevels = [
    { value: "ASAP_0_30", label: t("urgencyAsap") },
    { value: "SOON_1_3", label: t("urgencySoon") },
    { value: "MID_3_6", label: t("urgencyMid") },
    { value: "LATER_6_12", label: t("urgencyLater") },
    { value: "INFO_ONLY", label: t("urgencyInfo") },
  ];

  const budgetRanges = [
    { value: "under-10k", label: t("budgetUnder10k") },
    { value: "10k-20k", label: t("budget10kTo20k") },
    { value: "over-20k", label: t("budgetOver20k") },
    { value: "prefer-discuss", label: t("budgetPreferDiscuss") },
  ];

  const voucherStatuses = [
    { value: "NONE", label: t("voucherStatusNone") },
    { value: "APPLIED", label: t("voucherStatusApplied") },
    { value: "APPROVED_ASSMB", label: t("voucherStatusApprovedAssmb") },
    { value: "APPROVED_NATIONAL", label: t("voucherStatusApprovedNational") },
    { value: "APPROVED_OTHER", label: t("voucherStatusApprovedOther") },
  ];

  const bestContactMethods = [
    { value: "PHONE", label: t("bestContactPhone") },
    { value: "WHATSAPP", label: t("bestContactWhatsapp") },
    { value: "EMAIL", label: t("bestContactEmail") },
  ];

  function validate(): boolean {
    const newErrors: Partial<Record<keyof FormData, string>> = {};

    if (!formData.firstName.trim()) newErrors.firstName = t("errorFirstName");
    if (!formData.lastName.trim()) newErrors.lastName = t("errorLastName");

    if (!formData.phone.trim()) {
      newErrors.phone = t("errorPhone");
    } else if (!isValidPhone(formData.phone)) {
      newErrors.phone = t("errorPhoneInvalid");
    }

    if (!formData.email.trim()) {
      newErrors.email = t("errorEmail");
    } else if (!EMAIL_REGEX.test(formData.email)) {
      newErrors.email = t("errorEmailInvalid");
    }

    const femAge = parseInt(formData.femaleAgeExact, 10);
    if (!formData.femaleAgeExact.trim()) {
      newErrors.femaleAgeExact = t("errorFemaleAgeExact");
    } else if (isNaN(femAge) || femAge < 18 || femAge > 50) {
      newErrors.femaleAgeExact = t("errorFemaleAgeExactInvalid");
    }

    if (!formData.city.trim()) newErrors.city = t("errorCity");
    if (!formData.triedIVF) newErrors.triedIVF = t("errorTriedIVF");
    if (!formData.urgencyLevel) newErrors.urgencyLevel = t("errorUrgencyLevel");
    if (!formData.budgetRange) newErrors.budgetRange = t("errorBudgetRange");
    if (!formData.gdprConsent) newErrors.gdprConsent = t("errorGdpr");
    if (!formData.consentToShare) newErrors.consentToShare = t("consentToShareRequired");

    setErrors(newErrors);
    const errorKeys = Object.keys(newErrors);
    if (errorKeys.length > 0) {
      trackFormError(errorKeys);
    }
    return errorKeys.length === 0;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setServerError(null);

    if (!validate()) return;

    trackFormSubmit();
    setSubmitting(true);

    const femAge = parseInt(formData.femaleAgeExact, 10);
    const ageRange = deriveAgeRange(femAge);
    const timeline = deriveTimeline(formData.urgencyLevel);
    const testStatus = formData.hasRecentTests === "yes" ? "ready" : formData.hasRecentTests === "no" ? "not-started" : "unknown";

    try {
      const response = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          first_name: formData.firstName.trim(),
          last_name: formData.lastName.trim(),
          phone: formData.phone.trim(),
          email: formData.email.trim(),
          age_range: ageRange,
          exact_age: femAge,
          tried_ivf: formData.triedIVF,
          timeline,
          budget_range: formData.budgetRange,
          test_status: testStatus,
          city: formData.city.trim(),
          message: formData.message.trim() || undefined,
          gdpr_consent: formData.gdprConsent,
          female_age_exact: femAge,
          male_age_exact: formData.maleAgeExact ? parseInt(formData.maleAgeExact, 10) : undefined,
          primary_factor: formData.primaryFactor || undefined,
          voucher_status: formData.voucherStatus || undefined,
          has_recent_tests: formData.hasRecentTests ? formData.hasRecentTests === "yes" : undefined,
          tests_list: formData.testsList?.trim() || undefined,
          previous_clinics: formData.previousClinics?.trim() || undefined,
          urgency_level: formData.urgencyLevel,
          availability_windows: formData.availabilityWindows?.trim() || undefined,
          best_contact_method: formData.bestContactMethod || undefined,
          consent_to_share: formData.consentToShare,
          locale,
          _company: honeypotRef.current?.value || "",
          _rendered: renderedAtRef.current,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        if (result.fields) {
          const fieldErrors: Partial<Record<keyof FormData, string>> = {};
          const fieldMap: Record<string, keyof FormData> = {
            first_name: "firstName",
            last_name: "lastName",
            phone: "phone",
            email: "email",
            female_age_exact: "femaleAgeExact",
            tried_ivf: "triedIVF",
            urgency_level: "urgencyLevel",
            budget_range: "budgetRange",
            city: "city",
            gdpr_consent: "gdprConsent",
            consent_to_share: "consentToShare",
          };
          for (const [key, msg] of Object.entries(result.fields)) {
            const formKey = fieldMap[key];
            if (formKey) fieldErrors[formKey] = msg as string;
          }
          setErrors(fieldErrors);
        }
        setServerError(result.error || t("errorServer"));
        return;
      }

      if (typeof window !== "undefined" && window.gtag) {
        window.gtag("event", "form_submitted", {
          form_name: "lead_form",
        });
      }

      trackGenerateLead({
        timeline,
        age_range: ageRange,
        tried_ivf: formData.triedIVF,
        city: formData.city.trim(),
      });
      trackConversion();

      router.push(`/${locale}/thank-you`);
    } catch {
      setServerError(t("errorNetwork"));
    } finally {
      setSubmitting(false);
    }
  }

  function updateField(field: keyof FormData, value: string | boolean) {
    handleFormInteraction();
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
    if (serverError) setServerError(null);
  }

  const showUrgencyNudge = formData.urgencyLevel === "INFO_ONLY" || formData.urgencyLevel === "LATER_6_12";

  return (
    <section id="lead-form" className="bg-white scroll-mt-20">
      <div className="px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-20">
        <div className="container-narrow px-0 sm:px-0">
          <div className="text-center mb-8 sm:mb-10">
            <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-medical-heading mb-2 sm:mb-3">{t("title")}</h2>
            <p className="text-medical-muted text-sm sm:text-base max-w-lg mx-auto">{t("subtitle")}</p>
          </div>

          <form
            onSubmit={handleSubmit}
            noValidate
            className="max-w-xl mx-auto bg-medical-bg border border-medical-border rounded-2xl p-5 sm:p-8"
          >
            {serverError && (
              <div
                role="alert"
                className="mb-5 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-start gap-3"
              >
                <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                </svg>
                <span>{serverError}</span>
              </div>
            )}

            <div className="absolute opacity-0 -z-10 h-0 overflow-hidden" aria-hidden="true">
              <label htmlFor="_company">Company</label>
              <input ref={honeypotRef} type="text" id="_company" name="_company" tabIndex={-1} autoComplete="off" />
            </div>

            {/* ── Personal info ── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <div>
                <label htmlFor="firstName" className={labelClasses}>
                  {t("firstName")} <span className="text-red-400">*</span>
                </label>
                <input
                  id="firstName"
                  type="text"
                  placeholder="Maria"
                  value={formData.firstName}
                  onChange={(e) => updateField("firstName", e.target.value)}
                  disabled={submitting}
                  aria-invalid={!!errors.firstName}
                  aria-describedby={errors.firstName ? "err-firstName" : undefined}
                  className={`${inputClasses} ${errors.firstName ? "border-red-300" : ""} disabled:opacity-60`}
                />
                {errors.firstName && <p id="err-firstName" role="alert" className="mt-1 text-sm text-red-500">{errors.firstName}</p>}
              </div>
              <div>
                <label htmlFor="lastName" className={labelClasses}>
                  {t("lastName")} <span className="text-red-400">*</span>
                </label>
                <input
                  id="lastName"
                  type="text"
                  placeholder="Popescu"
                  value={formData.lastName}
                  onChange={(e) => updateField("lastName", e.target.value)}
                  disabled={submitting}
                  aria-invalid={!!errors.lastName}
                  aria-describedby={errors.lastName ? "err-lastName" : undefined}
                  className={`${inputClasses} ${errors.lastName ? "border-red-300" : ""} disabled:opacity-60`}
                />
                {errors.lastName && <p id="err-lastName" role="alert" className="mt-1 text-sm text-red-500">{errors.lastName}</p>}
              </div>
            </div>

            <div className="mb-4">
              <label htmlFor="phone" className={labelClasses}>
                {t("phone")} <span className="text-red-400">*</span>
              </label>
              <input
                id="phone"
                type="tel"
                placeholder="+40 7XX XXX XXX"
                value={formData.phone}
                onChange={(e) => updateField("phone", e.target.value)}
                disabled={submitting}
                aria-invalid={!!errors.phone}
                aria-describedby={errors.phone ? "err-phone" : "phone-helper"}
                className={`${inputClasses} ${errors.phone ? "border-red-300" : ""} disabled:opacity-60`}
              />
              {errors.phone ? (
                <p id="err-phone" role="alert" className="mt-1 text-sm text-red-500">{errors.phone}</p>
              ) : (
                <p id="phone-helper" className="mt-1 text-xs text-medical-muted/70">{t("phoneHelper")}</p>
              )}
            </div>

            <div className="mb-4">
              <label htmlFor="email" className={labelClasses}>
                {t("email")} <span className="text-red-400">*</span>
              </label>
              <input
                id="email"
                type="email"
                placeholder="maria@example.com"
                value={formData.email}
                onChange={(e) => updateField("email", e.target.value)}
                disabled={submitting}
                aria-invalid={!!errors.email}
                aria-describedby={errors.email ? "err-email" : undefined}
                className={`${inputClasses} ${errors.email ? "border-red-300" : ""} disabled:opacity-60`}
              />
              {errors.email && <p id="err-email" role="alert" className="mt-1 text-sm text-red-500">{errors.email}</p>}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <div>
                <label htmlFor="femaleAgeExact" className={labelClasses}>
                  {t("femaleAgeExact")} <span className="text-red-400">*</span>
                </label>
                <input
                  type="number"
                  id="femaleAgeExact"
                  min="18"
                  max="50"
                  value={formData.femaleAgeExact}
                  onChange={(e) => updateField("femaleAgeExact", e.target.value)}
                  placeholder={t("femaleAgeExactPlaceholder")}
                  disabled={submitting}
                  aria-invalid={!!errors.femaleAgeExact}
                  aria-describedby={errors.femaleAgeExact ? "err-femaleAgeExact" : undefined}
                  className={`${inputClasses} ${errors.femaleAgeExact ? "border-red-300" : ""} disabled:opacity-60`}
                />
                {errors.femaleAgeExact && <p id="err-femaleAgeExact" role="alert" className="mt-1 text-sm text-red-500">{errors.femaleAgeExact}</p>}
              </div>
              <div>
                <label htmlFor="maleAgeExact" className={labelClasses}>
                  {t("maleAgeExact")}
                </label>
                <input
                  type="number"
                  id="maleAgeExact"
                  min="18"
                  max="70"
                  value={formData.maleAgeExact}
                  onChange={(e) => updateField("maleAgeExact", e.target.value)}
                  placeholder={t("maleAgeExactPlaceholder")}
                  className={inputClasses}
                  disabled={submitting}
                />
              </div>
            </div>

            <div className="mb-4">
              <label htmlFor="city" className={labelClasses}>
                {t("city")} <span className="text-red-400">*</span>
              </label>
              <input
                id="city"
                type="text"
                placeholder={t("cityPlaceholder")}
                value={formData.city}
                onChange={(e) => updateField("city", e.target.value)}
                disabled={submitting}
                aria-invalid={!!errors.city}
                aria-describedby={errors.city ? "err-city" : undefined}
                className={`${inputClasses} ${errors.city ? "border-red-300" : ""} disabled:opacity-60`}
              />
              {errors.city && <p id="err-city" role="alert" className="mt-1 text-sm text-red-500">{errors.city}</p>}
            </div>

            {/* ── Medical situation ── */}
            <div className="mb-6 mt-6 pt-6 border-t border-medical-border">
              <h3 className="text-base font-semibold text-medical-heading mb-1">{t("medicalSectionTitle")}</h3>
              <p className="text-sm text-medical-muted mb-4">{t("medicalSectionSubtitle")}</p>

              <div className="mb-4">
                <fieldset>
                  <legend className={labelClasses}>
                    {t("triedIVF")} <span className="text-red-400">*</span>
                  </legend>
                  <div className="grid grid-cols-3 gap-2 mt-1" role="group" aria-label={t("triedIVF")}>
                    {[
                      { value: "Yes", label: t("triedYes") },
                      { value: "No", label: t("triedNo") },
                      { value: "InProgress", label: t("triedInProgress") },
                    ].map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => updateField("triedIVF", opt.value)}
                        disabled={submitting}
                        aria-pressed={formData.triedIVF === opt.value}
                        className={`py-3 px-3 rounded-xl border text-sm font-medium transition-all duration-200 disabled:opacity-60 active:scale-[0.98] ${
                          formData.triedIVF === opt.value
                            ? "border-primary-500 bg-primary-50 text-primary-700"
                            : "border-medical-border bg-white text-medical-text hover:border-primary-200"
                        } ${errors.triedIVF ? "border-red-300" : ""}`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </fieldset>
                {errors.triedIVF && <p role="alert" className="mt-1 text-sm text-red-500">{errors.triedIVF}</p>}
              </div>

              <div className="mb-4">
                <FormSelect
                  id="primaryFactor"
                  label={t("primaryFactor")}
                  placeholder={t("primaryFactorPlaceholder")}
                  options={primaryFactors}
                  value={formData.primaryFactor}
                  onChange={(v) => updateField("primaryFactor", v)}
                  disabled={submitting}
                />
              </div>

              <div className="mb-4">
                <label className={labelClasses}>{t("hasRecentTests")}</label>
                <div className="flex gap-3 mt-1">
                  <button
                    type="button"
                    onClick={() => updateField("hasRecentTests", "yes")}
                    disabled={submitting}
                    className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
                      formData.hasRecentTests === "yes"
                        ? "border-primary-500 bg-primary-50 text-primary-700"
                        : "border-medical-border bg-white text-medical-text hover:border-primary-200"
                    }`}
                  >
                    {t("hasRecentTestsYes")}
                  </button>
                  <button
                    type="button"
                    onClick={() => updateField("hasRecentTests", "no")}
                    disabled={submitting}
                    className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
                      formData.hasRecentTests === "no"
                        ? "border-primary-500 bg-primary-50 text-primary-700"
                        : "border-medical-border bg-white text-medical-text hover:border-primary-200"
                    }`}
                  >
                    {t("hasRecentTestsNo")}
                  </button>
                </div>
              </div>

              {formData.hasRecentTests === "yes" && (
                <div className="mb-4">
                  <label htmlFor="testsList" className={labelClasses}>
                    {t("testsList")}
                  </label>
                  <input
                    type="text"
                    id="testsList"
                    value={formData.testsList}
                    onChange={(e) => updateField("testsList", e.target.value)}
                    placeholder={t("testsListPlaceholder")}
                    className={inputClasses}
                    disabled={submitting}
                  />
                </div>
              )}

              <div className="mb-4">
                <label htmlFor="previousClinics" className={labelClasses}>
                  {t("previousClinics")}
                </label>
                <input
                  type="text"
                  id="previousClinics"
                  value={formData.previousClinics}
                  onChange={(e) => updateField("previousClinics", e.target.value)}
                  placeholder={t("previousClinicsPlaceholder")}
                  className={inputClasses}
                  disabled={submitting}
                />
              </div>
            </div>

            {/* ── Planning ── */}
            <div className="mb-6 pt-6 border-t border-medical-border">
              <h3 className="text-base font-semibold text-medical-heading mb-1">{t("planningSectionTitle")}</h3>
              <p className="text-sm text-medical-muted mb-4">{t("planningSectionSubtitle")}</p>

              <div className="mb-4">
                <FormSelect
                  id="urgencyLevel"
                  label={t("urgencyLevel")}
                  placeholder={t("urgencyLevelPlaceholder")}
                  options={urgencyLevels}
                  value={formData.urgencyLevel}
                  onChange={(v) => updateField("urgencyLevel", v)}
                  disabled={submitting}
                  error={errors.urgencyLevel}
                  errorId="err-urgencyLevel"
                  required
                />
                {showUrgencyNudge && (
                  <p className="mt-2 text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                    {t("urgencyNudge")}
                  </p>
                )}
              </div>

              <div className="mb-4">
                <FormSelect
                  id="budgetRange"
                  label={t("budgetRange")}
                  placeholder={t("budgetRangePlaceholder")}
                  options={budgetRanges}
                  value={formData.budgetRange}
                  onChange={(v) => updateField("budgetRange", v)}
                  disabled={submitting}
                  error={errors.budgetRange}
                  errorId="err-budgetRange"
                  required
                />
              </div>

              <div className="mb-4">
                <FormSelect
                  id="voucherStatus"
                  label={t("voucherStatus")}
                  placeholder={t("voucherStatusPlaceholder")}
                  options={voucherStatuses}
                  value={formData.voucherStatus}
                  onChange={(v) => updateField("voucherStatus", v)}
                  disabled={submitting}
                />
              </div>
            </div>

            {/* ── Contact preferences ── */}
            <div className="mb-6 pt-6 border-t border-medical-border">
              <h3 className="text-base font-semibold text-medical-heading mb-4">{t("preferencesSectionTitle")}</h3>

              <div className="mb-4">
                <label htmlFor="availabilityWindows" className={labelClasses}>
                  {t("availabilityWindows")}
                </label>
                <input
                  type="text"
                  id="availabilityWindows"
                  value={formData.availabilityWindows}
                  onChange={(e) => updateField("availabilityWindows", e.target.value)}
                  placeholder={t("availabilityWindowsPlaceholder")}
                  className={inputClasses}
                  disabled={submitting}
                />
              </div>

              <div className="mb-4">
                <FormSelect
                  id="bestContactMethod"
                  label={t("bestContactMethod")}
                  placeholder={t("bestContactMethodPlaceholder")}
                  options={bestContactMethods}
                  value={formData.bestContactMethod}
                  onChange={(v) => updateField("bestContactMethod", v)}
                  disabled={submitting}
                />
              </div>

              <div className="mb-5">
                <label htmlFor="message" className={labelClasses}>
                  {t("message")} <span className="text-medical-muted">{t("messageOptional")}</span>
                </label>
                <textarea
                  id="message"
                  rows={3}
                  placeholder={t("messagePlaceholder")}
                  value={formData.message}
                  onChange={(e) => updateField("message", e.target.value)}
                  disabled={submitting}
                  className={`${inputClasses} resize-none disabled:opacity-60`}
                />
              </div>
            </div>

            {/* ── Consent ── */}
            <div className="mb-6">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.gdprConsent}
                  onChange={(e) => updateField("gdprConsent", e.target.checked)}
                  disabled={submitting}
                  aria-invalid={!!errors.gdprConsent}
                  aria-describedby={errors.gdprConsent ? "err-gdpr" : undefined}
                  className="mt-0.5 w-5 h-5 rounded border-medical-border text-primary-600 focus:ring-primary-500 cursor-pointer flex-shrink-0 disabled:opacity-60"
                />
                <span className={`text-xs sm:text-sm text-medical-muted leading-relaxed ${errors.gdprConsent ? "text-red-500" : ""}`}>
                  {t.rich("gdprText", {
                    privacyPolicy: (chunks) => (
                      <a href={`/${locale}/privacy`} target="_blank" rel="noopener noreferrer" className="text-primary-600 underline underline-offset-2 hover:text-primary-700">{chunks}</a>
                    ),
                  })}{" "}
                  <span className="text-red-400">*</span>
                </span>
              </label>
              {errors.gdprConsent && <p id="err-gdpr" role="alert" className="mt-1 text-sm text-red-500 ml-8">{errors.gdprConsent}</p>}
            </div>

            <div className="mb-6">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.consentToShare}
                  onChange={(e) => updateField("consentToShare", e.target.checked)}
                  disabled={submitting}
                  aria-invalid={!!errors.consentToShare}
                  aria-describedby={errors.consentToShare ? "err-consentToShare" : undefined}
                  required
                  className="mt-0.5 w-5 h-5 rounded border-medical-border text-primary-600 focus:ring-primary-500 cursor-pointer flex-shrink-0 disabled:opacity-60"
                />
                <span className={`text-xs sm:text-sm text-medical-muted leading-relaxed ${errors.consentToShare ? "text-red-500" : ""}`}>
                  {t("consentToShareText")}{" "}
                  <span className="text-red-400">*</span>
                </span>
              </label>
              <p className="text-xs text-medical-muted mt-1 ml-8">
                {t("consentToShareHelper")}
              </p>
              {errors.consentToShare && <p id="err-consentToShare" role="alert" className="mt-1 text-sm text-red-500 ml-8">{errors.consentToShare}</p>}
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3.5 sm:py-4 px-8 text-base font-semibold text-white bg-primary-700 rounded-xl hover:bg-primary-800 active:bg-primary-900 active:scale-[0.99] transition-all duration-200 shadow-md shadow-primary-700/30 hover:shadow-lg hover:shadow-primary-700/40 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  {t("submitting")}
                </>
              ) : (
                t("submit")
              )}
            </button>

            <p className="text-center text-xs text-medical-muted/70 mt-3">{t("submitHelper")}</p>
          </form>
        </div>
      </div>
    </section>
  );
}
