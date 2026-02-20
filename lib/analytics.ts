/**
 * Type-safe Google Analytics 4 + Google Ads + GTM event helpers.
 *
 * All custom events use the recommended GA4 naming conventions so they
 * can be imported directly into Google Ads as conversions.
 *
 * For GTM users: every event is also pushed to `window.dataLayer` in the
 * standard GTM format (`{ event, ...params }`), so GTM triggers can fire
 * on any of these without extra configuration.
 */

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    dataLayer?: Record<string, unknown>[];
  }
}

function gtag(...args: unknown[]) {
  if (typeof window === "undefined" || !window.gtag) return;
  window.gtag(...args);
}

/**
 * Push an event directly to the dataLayer for GTM consumption.
 * This runs independently of gtag - GTM users don't need GA4 configured
 * to pick up these events via custom triggers.
 */
function pushToDataLayer(event: string, params: Record<string, unknown> = {}) {
  if (typeof window === "undefined") return;
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({ event, ...params });
}

// ---------------------------------------------------------------------------
// Core events
// ---------------------------------------------------------------------------

/** Fires when a user first interacts with any form field */
export function trackFormStart(formName: string = "lead_form") {
  gtag("event", "form_start", { form_name: formName });
  pushToDataLayer("form_start", { form_name: formName });
}

/**
 * Fires when the form submit button is clicked (before API response).
 * Tracks intent regardless of outcome.
 */
export function trackFormSubmit(formName: string = "lead_form") {
  gtag("event", "form_submit", { form_name: formName });
  pushToDataLayer("form_submit", { form_name: formName });
}

/**
 * **Primary conversion event for Google Ads.**
 *
 * Fires ONLY after the server confirms the lead was stored (201 response).
 * This is the event you should import into Google Ads as a conversion action.
 *
 * Parameters:
 *   - locale:     "ro" | "en"
 *   - lead_score: "high" | "low" (derived from timeline on server)
 *   - city:       user's city
 *
 * GA4 setup: GA4 > Admin > Events > Mark as conversion > "form_submitted"
 * Google Ads: Tools > Conversions > Import > GA4 > "form_submitted"
 * GTM:        Create trigger on dataLayer event "form_submitted"
 */
export function trackFormSubmitted(params: {
  locale: string;
  lead_score: string;
  city: string;
}) {
  const eventParams = {
    locale: params.locale,
    lead_score: params.lead_score,
    city: params.city,
  };

  gtag("event", "form_submitted", eventParams);
}

/**
 * GA4 recommended event - maps directly to Google Ads "Lead" conversion.
 * Fires only on confirmed successful submission alongside form_submitted.
 */
export function trackGenerateLead(params: {
  timeline: string;
  age_range: string;
  tried_ivf: string;
  city: string;
}) {
  const eventParams = {
    currency: "EUR",
    value: 1,
    lead_source: "website_form",
    timeline: params.timeline,
    age_range: params.age_range,
    tried_ivf: params.tried_ivf,
    city: params.city,
  };

  gtag("event", "generate_lead", eventParams);
  pushToDataLayer("generate_lead", eventParams);
}

/** Fires when form validation fails */
export function trackFormError(errorFields: string[]) {
  const eventParams = {
    form_name: "lead_form",
    error_fields: errorFields.join(","),
  };

  gtag("event", "form_error", eventParams);
  pushToDataLayer("form_error", eventParams);
}

/** Fires when a CTA button is clicked */
export function trackCtaClick(ctaLocation: string) {
  gtag("event", "cta_click", { cta_location: ctaLocation });
  pushToDataLayer("cta_click", { cta_location: ctaLocation });
}

/**
 * Google Ads conversion event - fires alongside form_submitted.
 * Use this as your primary Google Ads conversion action when importing
 * via the Google Ads tag (not GA4 import).
 *
 * To set up: Google Ads > Tools > Conversions > New > Website >
 *   Use Google tag > Event snippet > paste "conversion" event name.
 */
export function trackConversion() {
  const sendTo = process.env.NEXT_PUBLIC_GOOGLE_ADS_ID
    ? `${process.env.NEXT_PUBLIC_GOOGLE_ADS_ID}/${process.env.NEXT_PUBLIC_GOOGLE_ADS_CONVERSION_LABEL}`
    : undefined;

  gtag("event", "conversion", { send_to: sendTo });
  pushToDataLayer("ads_conversion", { send_to: sendTo });
}

/**
 * Track thank-you page view - useful for URL-based conversion rules
 * in Google Ads that fire on /thank-you page loads.
 */
export function trackThankYouPageView(params: {
  locale: string;
  lead_id: string;
}) {
  const eventParams = {
    page_type: "thank_you",
    locale: params.locale,
    lead_id: params.lead_id,
  };

  gtag("event", "thank_you_page_view", eventParams);
  pushToDataLayer("thank_you_page_view", eventParams);
}
