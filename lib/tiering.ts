/**
 * Phase 2: Lead Tiering Logic
 * Computes lead_tier (A/B/C/D) and tier_reason based on lead data.
 */

export type LeadTier = "A" | "B" | "C" | "D";

export interface TieringInput {
  operator_status: string;
  urgency_level?: string | null;
  consent_to_share: boolean;
  female_age_exact?: number | null;
  best_contact_method?: string | null;
  availability_windows?: string | null;
  has_recent_tests?: boolean | null;
  tests_list?: string | null;
}

export interface TieringResult {
  tier: LeadTier;
  reason: string;
}

/**
 * Compute lead tier based on Phase 2 rules.
 */
export function computeLeadTier(input: TieringInput, locale: "ro" | "en" = "ro"): TieringResult {
  const { operator_status, urgency_level, consent_to_share, female_age_exact, best_contact_method, availability_windows, has_recent_tests, tests_list } = input;

  // Must be verified ready to be Tier A/B/C
  if (operator_status !== "VERIFIED_READY") {
    if (operator_status === "LOW_INTENT_NURTURE" || operator_status === "INFO_ONLY") {
      return {
        tier: "D",
        reason: locale === "ro" 
          ? "Lead cu intenție scăzută sau doar informare"
          : "Low intent or information-only lead",
      };
    }
    if (operator_status === "INVALID") {
      return {
        tier: "D",
        reason: locale === "ro" 
          ? "Lead marcat ca invalid"
          : "Lead marked as invalid",
      };
    }
    return {
      tier: "D",
      reason: locale === "ro" 
        ? "Lead neverificat de operator"
        : "Lead not verified by operator",
    };
  }

  // Must have consent
  if (!consent_to_share) {
    return {
      tier: "D",
      reason: locale === "ro" 
        ? "Fără consimțământ pentru partajare"
        : "No consent to share",
    };
  }

  // Check urgency
  if (urgency_level === "INFO_ONLY") {
    return {
      tier: "D",
      reason: locale === "ro" 
        ? "Doar informare, fără urgență"
        : "Information only, no urgency",
    };
  }

  if (urgency_level === "LATER_6_12") {
    return {
      tier: "C",
      reason: locale === "ro" 
        ? "Urgență scăzută (6-12 luni)"
        : "Low urgency (6-12 months)",
    };
  }

  // For Tier A, need: urgency (ASAP/SOON/MID), age 20-45, best_contact_method
  const hasGoodUrgency = urgency_level && ["ASAP_0_30", "SOON_1_3", "MID_3_6"].includes(urgency_level);
  const hasGoodAge = female_age_exact !== null && female_age_exact !== undefined && female_age_exact >= 20 && female_age_exact <= 45;
  const hasContactMethod = best_contact_method && best_contact_method.length > 0;

  // Tier A requirements
  if (hasGoodUrgency && hasGoodAge && hasContactMethod) {
    // Check for optional enhancements
    const hasAvailability = availability_windows && availability_windows.trim().length > 0;
    const hasTestsInfo = has_recent_tests === true || (tests_list && tests_list.trim().length > 0);

    let reason = locale === "ro" 
      ? "Lead verificat, urgență bună, vârstă optimă, metodă de contact disponibilă"
      : "Verified lead, good urgency, optimal age, contact method available";

    if (hasAvailability && hasTestsInfo) {
      reason += locale === "ro" 
        ? ", disponibilitate și analize documentate"
        : ", availability and tests documented";
    } else if (hasAvailability) {
      reason += locale === "ro" 
        ? ", disponibilitate documentată"
        : ", availability documented";
    } else if (hasTestsInfo) {
      reason += locale === "ro" 
        ? ", analize documentate"
        : ", tests documented";
    }

    return { tier: "A", reason };
  }

  // Tier B: Verified but missing some key info
  if (hasGoodUrgency) {
    const missing: string[] = [];
    if (!hasGoodAge) missing.push(locale === "ro" ? "vârstă" : "age");
    if (!hasContactMethod) missing.push(locale === "ro" ? "metodă contact" : "contact method");
    if (!availability_windows || availability_windows.trim().length === 0) {
      missing.push(locale === "ro" ? "disponibilitate" : "availability");
    }
    if (!has_recent_tests && (!tests_list || tests_list.trim().length === 0)) {
      missing.push(locale === "ro" ? "informații analize" : "test info");
    }

    return {
      tier: "B",
      reason: locale === "ro" 
        ? `Lead verificat cu urgență bună, dar lipsește: ${missing.join(", ")}`
        : `Verified lead with good urgency, but missing: ${missing.join(", ")}`,
    };
  }

  // Default to C if verified but low urgency
  return {
    tier: "C",
    reason: locale === "ro" 
      ? "Lead verificat dar cu urgență scăzută sau informații incomplete"
      : "Verified lead but with low urgency or incomplete information",
  };
}
