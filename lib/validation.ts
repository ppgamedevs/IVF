import { type SupportedLocale, resolveLocale, validationError } from "./locale-strings";

export interface LeadPayload {
  first_name: string;
  last_name: string;
  phone: string;
  email: string;
  age_range: string;
  tried_ivf: string;
  timeline: string;
  budget_range: string;
  city: string;
  message?: string;
  gdpr_consent: boolean;
  locale: SupportedLocale;
}

const VALID_AGE_RANGES = ["under-30", "30-34", "35-37", "38-40", "41+"];

const VALID_TIMELINES = ["asap", "1-3months", "researching"];

const VALID_BUDGET_RANGES = ["under-10k", "10k-20k", "over-20k", "prefer-discuss"];

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Romania-friendly phone validation.
 * Strips whitespace, dashes, dots, and parens, then checks:
 *  - Starts with +40, 40, or 0
 *  - Total digit count is 10-13 (covers mobile, landline, with/without country code)
 */
function isValidPhone(raw: string): boolean {
  const stripped = raw.replace(/[\s\-\.\(\)]/g, "");
  if (!/^(\+?40|0)/.test(stripped)) return false;
  const digits = stripped.replace(/\D/g, "");
  return digits.length >= 10 && digits.length <= 13;
}

export interface ValidationResult {
  valid: boolean;
  errors: Record<string, string>;
  sanitized?: LeadPayload;
  locale: SupportedLocale;
}

function sanitizeString(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, 500);
}

export function validateLeadPayload(body: unknown): ValidationResult {
  if (!body || typeof body !== "object") {
    return {
      valid: false,
      errors: { _form: "invalid_body" },
      locale: "ro",
    };
  }

  const raw = body as Record<string, unknown>;
  const locale = resolveLocale(raw.locale);
  const errors: Record<string, string> = {};

  const firstName = sanitizeString(raw.first_name);
  const lastName = sanitizeString(raw.last_name);
  const phone = sanitizeString(raw.phone);
  const email = sanitizeString(raw.email);
  const ageRange = sanitizeString(raw.age_range);
  const triedIvf = sanitizeString(raw.tried_ivf);
  const timeline = sanitizeString(raw.timeline);
  const budgetRange = sanitizeString(raw.budget_range);
  const city = sanitizeString(raw.city);
  const message = sanitizeString(raw.message);
  const gdprConsent = raw.gdpr_consent === true;

  if (!firstName) errors.first_name = validationError("first_name_required", locale);
  if (!lastName) errors.last_name = validationError("last_name_required", locale);

  if (!phone) {
    errors.phone = validationError("phone_required", locale);
  } else if (!isValidPhone(phone)) {
    errors.phone = validationError("phone_invalid", locale);
  }

  if (!email) {
    errors.email = validationError("email_required", locale);
  } else if (!EMAIL_REGEX.test(email)) {
    errors.email = validationError("email_invalid", locale);
  }

  if (!VALID_AGE_RANGES.includes(ageRange)) {
    errors.age_range = validationError("age_range_invalid", locale);
  }

  if (!["Yes", "No", "InProgress"].includes(triedIvf)) {
    errors.tried_ivf = validationError("tried_ivf_invalid", locale);
  }

  if (!VALID_TIMELINES.includes(timeline)) {
    errors.timeline = validationError("timeline_invalid", locale);
  }

  if (!VALID_BUDGET_RANGES.includes(budgetRange)) {
    errors.budget_range = validationError("budget_range_invalid", locale);
  }

  if (!city) errors.city = validationError("city_required", locale);

  if (!gdprConsent) {
    errors.gdpr_consent = validationError("gdpr_required", locale);
  }

  if (Object.keys(errors).length > 0) {
    return { valid: false, errors, locale };
  }

  return {
    valid: true,
    errors: {},
    locale,
    sanitized: {
      first_name: firstName,
      last_name: lastName,
      phone,
      email: email.toLowerCase(),
      age_range: ageRange,
      tried_ivf: triedIvf,
      timeline,
      budget_range: budgetRange,
      city,
      message: message || undefined,
      gdpr_consent: gdprConsent,
      locale,
    },
  };
}
