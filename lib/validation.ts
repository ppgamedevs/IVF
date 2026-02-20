import { type SupportedLocale, resolveLocale, validationError } from "./locale-strings";

export interface LeadPayload {
  first_name: string;
  last_name: string;
  phone: string;
  email: string;
  age_range: string;
  exact_age?: number;
  tried_ivf: string;
  timeline: string;
  budget_range: string;
  test_status?: string;
  city: string;
  message?: string;
  gdpr_consent: boolean;
  locale: SupportedLocale;
  // Phase 2 fields
  female_age_exact?: number;
  male_age_exact?: number;
  primary_factor?: string;
  voucher_status?: string;
  has_recent_tests?: boolean;
  tests_list?: string;
  previous_clinics?: string;
  urgency_level?: string;
  availability_windows?: string;
  best_contact_method?: string;
  consent_to_share: boolean;
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
  const exactAge = raw.exact_age !== undefined && raw.exact_age !== null
    ? (typeof raw.exact_age === "number" ? raw.exact_age : parseInt(String(raw.exact_age), 10))
    : undefined;
  const triedIvf = sanitizeString(raw.tried_ivf);
  const timeline = sanitizeString(raw.timeline);
  const budgetRange = sanitizeString(raw.budget_range);
  const testStatus = sanitizeString(raw.test_status);
  const city = sanitizeString(raw.city);
  const message = sanitizeString(raw.message);
  const gdprConsent = raw.gdpr_consent === true;
  
  // Phase 2 fields
  const femaleAgeExact = raw.female_age_exact !== undefined && raw.female_age_exact !== null
    ? (typeof raw.female_age_exact === "number" ? raw.female_age_exact : parseInt(String(raw.female_age_exact), 10))
    : undefined;
  const maleAgeExact = raw.male_age_exact !== undefined && raw.male_age_exact !== null
    ? (typeof raw.male_age_exact === "number" ? raw.male_age_exact : parseInt(String(raw.male_age_exact), 10))
    : undefined;
  const primaryFactor = sanitizeString(raw.primary_factor);
  const voucherStatus = sanitizeString(raw.voucher_status);
  const hasRecentTests = raw.has_recent_tests === true || raw.has_recent_tests === "yes" || raw.has_recent_tests === "true";
  const testsList = sanitizeString(raw.tests_list);
  const previousClinics = sanitizeString(raw.previous_clinics);
  const urgencyLevel = sanitizeString(raw.urgency_level);
  const availabilityWindows = sanitizeString(raw.availability_windows);
  const bestContactMethod = sanitizeString(raw.best_contact_method);
  const consentToShare = raw.consent_to_share === true;

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

  // female_age_exact is now the primary age field (required)
  if (!femaleAgeExact || isNaN(femaleAgeExact) || femaleAgeExact < 18 || femaleAgeExact > 50) {
    errors.female_age_exact = validationError("female_age_exact_required", locale);
  }

  // age_range accepted if valid (derived from female_age_exact by the form)
  if (ageRange && !VALID_AGE_RANGES.includes(ageRange)) {
    // Ignore invalid; API will still work without it
  }

  if (!["Yes", "No", "InProgress"].includes(triedIvf)) {
    errors.tried_ivf = validationError("tried_ivf_invalid", locale);
  }

  // timeline accepted if valid (derived from urgency_level by the form)
  if (timeline && !VALID_TIMELINES.includes(timeline)) {
    // Ignore invalid; API will still work without it
  }

  if (!VALID_BUDGET_RANGES.includes(budgetRange)) {
    errors.budget_range = validationError("budget_range_invalid", locale);
  }

  if (!city) errors.city = validationError("city_required", locale);

  if (!gdprConsent) {
    errors.gdpr_consent = validationError("gdpr_required", locale);
  }

  if (!consentToShare) {
    errors.consent_to_share = validationError("consent_to_share_required", locale);
  }

  // urgency_level is now required
  if (!urgencyLevel || !["ASAP_0_30", "SOON_1_3", "MID_3_6", "LATER_6_12", "INFO_ONLY"].includes(urgencyLevel)) {
    errors.urgency_level = validationError("urgency_level_required", locale);
  }

  // Validate primary_factor if provided
  if (primaryFactor && !["UNKNOWN", "MALE_FACTOR", "FEMALE_FACTOR", "BOTH", "UNEXPLAINED", "ENDOMETRIOSIS", "LOW_OVARIAN_RESERVE", "TUBAL", "PCOS", "OTHER"].includes(primaryFactor)) {
    // Optional field, ignore invalid values
  }

  // Validate voucher_status if provided
  if (voucherStatus && !["NONE", "APPLIED", "APPROVED_ASSMB", "APPROVED_NATIONAL", "APPROVED_OTHER"].includes(voucherStatus)) {
    // Optional field, ignore invalid values
  }

  // Validate best_contact_method if provided
  if (bestContactMethod && !["PHONE", "WHATSAPP", "EMAIL"].includes(bestContactMethod)) {
    // Optional field, ignore invalid values
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
      age_range: VALID_AGE_RANGES.includes(ageRange) ? ageRange : (femaleAgeExact ? (femaleAgeExact < 30 ? "under-30" : femaleAgeExact <= 34 ? "30-34" : femaleAgeExact <= 37 ? "35-37" : femaleAgeExact <= 40 ? "38-40" : "41+") : "under-30"),
      exact_age: femaleAgeExact ?? (exactAge && !isNaN(exactAge) && exactAge >= 18 && exactAge <= 50 ? exactAge : undefined),
      tried_ivf: triedIvf,
      timeline: VALID_TIMELINES.includes(timeline) ? timeline : (urgencyLevel === "ASAP_0_30" ? "asap" : urgencyLevel === "SOON_1_3" || urgencyLevel === "MID_3_6" ? "1-3months" : "researching"),
      budget_range: budgetRange,
      test_status: testStatus && ["ready", "pending", "not-started", "unknown"].includes(testStatus) ? testStatus : undefined,
      city,
      message: message || undefined,
      gdpr_consent: gdprConsent,
      locale,
      // Phase 2 fields
      female_age_exact: femaleAgeExact && !isNaN(femaleAgeExact) && femaleAgeExact >= 18 && femaleAgeExact <= 50 ? femaleAgeExact : undefined,
      male_age_exact: maleAgeExact && !isNaN(maleAgeExact) && maleAgeExact >= 18 && maleAgeExact <= 70 ? maleAgeExact : undefined,
      primary_factor: primaryFactor && ["UNKNOWN", "MALE_FACTOR", "FEMALE_FACTOR", "BOTH", "UNEXPLAINED", "ENDOMETRIOSIS", "LOW_OVARIAN_RESERVE", "TUBAL", "PCOS", "OTHER"].includes(primaryFactor) ? primaryFactor : undefined,
      voucher_status: voucherStatus && ["NONE", "APPLIED", "APPROVED_ASSMB", "APPROVED_NATIONAL", "APPROVED_OTHER"].includes(voucherStatus) ? voucherStatus : undefined,
      has_recent_tests: hasRecentTests || undefined,
      tests_list: testsList || undefined,
      previous_clinics: previousClinics || undefined,
      urgency_level: urgencyLevel && ["ASAP_0_30", "SOON_1_3", "MID_3_6", "LATER_6_12", "INFO_ONLY"].includes(urgencyLevel) ? urgencyLevel : undefined,
      availability_windows: availabilityWindows || undefined,
      best_contact_method: bestContactMethod && ["PHONE", "WHATSAPP", "EMAIL"].includes(bestContactMethod) ? bestContactMethod : undefined,
      consent_to_share: consentToShare,
    },
  };
}
