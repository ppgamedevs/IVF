import { Resend } from "resend";
import type { LeadPayload } from "./validation";
import { resolveClinicEmail, getMonitorEmail } from "./clinic-routing";
import {
  type SupportedLocale,
  type IntentLevel,
  clinicSubject,
  clinicLabel,
  clinicYesNo,
  clinicTimeline,
  clinicBudget,
  clinicGdpr,
  ageRangeDisplay,
  testStatusDisplay,
  urgencyDisplay,
  voucherDisplay,
  primaryFactorDisplay,
  contactMethodDisplay,
  intentLabel,
  userSubject,
  userEmailStrings,
  internalSubject,
  internalEmailStrings,
  nurtureEmailStrings,
} from "./locale-strings";

// ---------------------------------------------------------------------------
// Resend client (lazy singleton)
// ---------------------------------------------------------------------------

let _resend: Resend | null = null;

export function getResend(): Resend {
  if (_resend) return _resend;
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error("Missing RESEND_API_KEY environment variable.");
  _resend = new Resend(apiKey);
  return _resend;
}

export function getFromAddress(): string {
  return process.env.RESEND_FROM_EMAIL || "FIV Match <noreply@fivmatch.ro>";
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Format UUID to a shorter, modern ID (first 8 chars, uppercase).
 * Example: "c33f4a67-b9b3-463c-85ca-a18bcd414ff2" -> "C33F4A67"
 */
function formatLeadId(uuid: string): string {
  if (!uuid) return uuid;
  // Remove dashes and take first 8 characters, uppercase
  const short = uuid.replace(/-/g, "").slice(0, 8).toUpperCase();
  return short;
}

function row(label: string, value: string, isHtml = false): string {
  return `
    <tr>
      <td style="padding:12px 16px;border-bottom:1px solid #f1f5f9;font-weight:600;color:#64748b;width:40%;vertical-align:top;">${escapeHtml(label)}</td>
      <td style="padding:12px 16px;border-bottom:1px solid #f1f5f9;word-wrap:break-word;word-break:break-word;white-space:pre-wrap;max-width:60%;">${isHtml ? value : escapeHtml(value)}</td>
    </tr>`;
}

// ---------------------------------------------------------------------------
// Clinic notification email - localized body + English meta block
// ---------------------------------------------------------------------------

export interface MetaBlock {
  leadId: string;
  timestamp: string;
  locale: SupportedLocale;
  intentLevel: IntentLevel;
  ipHash: string;
  userAgent: string;
  routedTo: string;
}

interface ExtendedLeadPayload extends LeadPayload {
  exact_age?: number;
  test_status?: string;
  phone_verified_at?: string | null;
}

function buildClinicHtml(
  lead: ExtendedLeadPayload,
  meta: MetaBlock,
): string {
  const loc = lead.locale;
  const dateStr = new Date(meta.timestamp).toLocaleString(
    loc === "ro" ? "ro-RO" : "en-GB",
    { dateStyle: "long", timeStyle: "short" },
  );

  const submittedLabel = loc === "ro" ? "Trimis" : "Submitted";

  const timelineVal = clinicTimeline(lead.timeline, loc);
  const timelineCell =
    lead.timeline === "asap"
      ? `<span style="display:inline-block;padding:2px 10px;background:#dcfce7;color:#166534;border-radius:9999px;font-size:13px;font-weight:600;">ASAP</span>`
      : escapeHtml(timelineVal);

  const emailLink = `<a href="mailto:${escapeHtml(lead.email)}" style="color:#2563eb;text-decoration:none;">${escapeHtml(lead.email)}</a>`;
  const phoneLink = `<a href="tel:${escapeHtml(lead.phone)}" style="color:#2563eb;text-decoration:none;">${escapeHtml(lead.phone)}</a>`;

  return `
<!DOCTYPE html>
<html lang="${loc}">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background-color:#f8fafc;">
  <div style="max-width:600px;margin:0 auto;padding:32px 24px;">
    <div style="background:#ffffff;border-radius:12px;border:1px solid #e2e8f0;overflow:hidden;">

      <div style="background:#1e3a5f;padding:24px 32px;">
        <h1 style="margin:0;color:#ffffff;font-size:20px;font-weight:600;">${escapeHtml(clinicSubject(loc, meta.intentLevel))}</h1>
        <p style="margin:8px 0 0;color:#93c5fd;font-size:14px;">${submittedLabel} ${escapeHtml(dateStr)}</p>
      </div>

      <div style="padding:32px;">
        <table style="width:100%;border-collapse:collapse;font-size:15px;color:#334155;">
          ${row(clinicLabel("name", loc), `${lead.first_name} ${lead.last_name}`)}
          ${row(clinicLabel("email", loc), emailLink, true)}
          ${row(clinicLabel("phone", loc), phoneLink, true)}
          ${lead.exact_age 
            ? row(loc === "ro" ? "Vârsta exactă" : "Exact age", `${lead.exact_age} ${loc === "ro" ? "ani" : "years"}`, true)
            : row(clinicLabel("ageRange", loc), ageRangeDisplay(lead.age_range, loc))}
          ${row(clinicLabel("triedIvf", loc), clinicYesNo(lead.tried_ivf, loc))}
          ${row(clinicLabel("timeline", loc), timelineCell, true)}
          ${row(loc === "ro" ? "Mod de finanțare" : "Financing method", clinicBudget(lead.budget_range, loc))}
          ${lead.test_status 
            ? row(loc === "ro" ? "Status analize medicale" : "Medical test status", testStatusDisplay(lead.test_status, loc))
            : ""}
          ${lead.phone_verified_at 
            ? row(loc === "ro" ? "Confirmare telefonică" : "Phone verified", loc === "ro" 
              ? `✓ Confirmat telefonic la ${new Date(lead.phone_verified_at).toLocaleString("ro-RO", { dateStyle: "short", timeStyle: "short", timeZone: "Europe/Bucharest" })}`
              : `✓ Verified by phone at ${new Date(lead.phone_verified_at).toLocaleString("en-GB", { dateStyle: "short", timeStyle: "short", timeZone: "Europe/Bucharest" })}`, true)
            : ""}
          ${row(clinicLabel("intentLevel", loc), (() => {
            const styles: Record<string, string> = {
              high: "background:#dcfce7;color:#166534;",
              medium: "background:#dbeafe;color:#1e40af;",
              low: "background:#fef9c3;color:#854d0e;",
            };
            const s = styles[meta.intentLevel] || styles.low;
            return `<span style="display:inline-block;padding:2px 10px;${s}border-radius:9999px;font-size:13px;font-weight:600;">${intentLabel(meta.intentLevel, loc)}</span>`;
          })(), true)}
          ${row(clinicLabel("city", loc), lead.city)}
          ${lead.message ? row(clinicLabel("message", loc), lead.message) : ""}
          ${row(clinicLabel("gdpr", loc), clinicGdpr(loc))}
        </table>

        ${meta.intentLevel === "low" ? `
        <div style="margin-top:16px;padding:12px 16px;background:#fef9c3;border:1px solid #fde68a;border-radius:8px;font-size:13px;color:#854d0e;">
          <strong>${loc === "ro" ? "Lead informativ" : "Informational lead"}</strong> - ${loc === "ro"
            ? "Acest lead se documenteaza deocamdata. Recomandat pentru nurturing, nu contact imediat."
            : "This lead is still researching. Recommended for nurturing, not immediate outreach."}
        </div>` : ""}
        ${meta.intentLevel === "medium" ? `
        <div style="margin-top:16px;padding:12px 16px;background:#dbeafe;border:1px solid #bfdbfe;border-radius:8px;font-size:13px;color:#1e40af;">
          <strong>${loc === "ro" ? "Intent mediu" : "Medium intent"}</strong> - ${loc === "ro"
            ? "Lead serios, buget de discutat. Recomandat pentru contact direct."
            : "Serious lead, budget to discuss. Recommended for direct outreach."}
        </div>` : ""}

        <!-- Standardized meta block - always in English for staff convenience -->
        <div style="margin-top:24px;padding:16px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;font-size:12px;color:#94a3b8;font-family:monospace;">
          <strong style="color:#64748b;">Internal Meta (EN)</strong><br>
          Lead ID: ${escapeHtml(meta.leadId)}<br>
          Timestamp: ${escapeHtml(meta.timestamp)}<br>
          Source: Landing form<br>
          Locale: ${meta.locale}<br>
          Intent: ${meta.intentLevel}<br>
          Routed: ${escapeHtml(meta.routedTo)}<br>
          IP Hash: ${escapeHtml(meta.ipHash)}<br>
          User-Agent: ${escapeHtml(meta.userAgent.slice(0, 180))}
        </div>
      </div>

    </div>
  </div>
</body>
</html>`;
}

// ---------------------------------------------------------------------------
// User confirmation email - fully localized, with full data summary
// ---------------------------------------------------------------------------

export function buildUserHtml(
  lead: ExtendedLeadPayload,
  submittedAt: string,
): string {
  const locale = lead.locale;
  const s = userEmailStrings(escapeHtml(lead.first_name), locale);
  // Format date in Romania timezone (Europe/Bucharest)
  const dateStr = new Date(submittedAt).toLocaleString(
    locale === "ro" ? "ro-RO" : "en-GB",
    { 
      dateStyle: "long", 
      timeStyle: "short",
      timeZone: "Europe/Bucharest",
    },
  );

  const ageVal = lead.female_age_exact ?? lead.exact_age;
  const dataRows = [
    row(clinicLabel("name", locale), `${lead.first_name} ${lead.last_name}`),
    row(clinicLabel("email", locale), lead.email),
    row(clinicLabel("phone", locale), lead.phone),
    ageVal != null
      ? row(locale === "ro" ? "Vârsta (femeie)" : "Age (female)", `${ageVal} ${locale === "ro" ? "ani" : "years"}`)
      : row(clinicLabel("ageRange", locale), ageRangeDisplay(lead.age_range, locale)),
    lead.male_age_exact != null ? row(locale === "ro" ? "Vârsta partener" : "Partner age", `${lead.male_age_exact} ${locale === "ro" ? "ani" : "years"}`) : "",
    row(clinicLabel("triedIvf", locale), clinicYesNo(lead.tried_ivf, locale)),
    lead.primary_factor ? row(locale === "ro" ? "Cauză principală" : "Primary factor", primaryFactorDisplay(lead.primary_factor, locale)) : "",
    lead.urgency_level ? row(locale === "ro" ? "Termen dorit" : "Desired timeframe", urgencyDisplay(lead.urgency_level, locale)) : "",
    row(clinicLabel("timeline", locale), clinicTimeline(lead.timeline, locale)),
    row(locale === "ro" ? "Mod de finanțare" : "Financing method", clinicBudget(lead.budget_range, locale)),
    lead.voucher_status ? row(locale === "ro" ? "Voucher" : "Voucher", voucherDisplay(lead.voucher_status, locale)) : "",
    lead.test_status 
      ? row(locale === "ro" ? "Status analize medicale" : "Medical test status", testStatusDisplay(lead.test_status, locale))
      : "",
    lead.has_recent_tests != null ? row(locale === "ro" ? "Analize recente" : "Recent tests", lead.has_recent_tests ? (locale === "ro" ? "Da" : "Yes") : (locale === "ro" ? "Nu" : "No")) : "",
    lead.tests_list ? row(locale === "ro" ? "Lista analize" : "Tests list", lead.tests_list) : "",
    lead.previous_clinics ? row(locale === "ro" ? "Clinici consultate anterior" : "Previously consulted clinics", lead.previous_clinics) : "",
    lead.best_contact_method ? row(locale === "ro" ? "Preferință contact" : "Contact preference", contactMethodDisplay(lead.best_contact_method, locale)) : "",
    lead.availability_windows ? row(locale === "ro" ? "Disponibilitate" : "Availability", lead.availability_windows) : "",
    row(clinicLabel("city", locale), lead.city),
    row(
      clinicLabel("message", locale),
      lead.message?.trim() || s.noMessage,
    ),
    row(
      locale === "ro" ? "Data trimiterii" : "Submitted at",
      dateStr,
    ),
  ].filter(Boolean).join("");

  return `
<!DOCTYPE html>
<html lang="${locale}">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background-color:#f8fafc;">
  <div style="max-width:600px;margin:0 auto;padding:32px 24px;">
    <div style="background:#ffffff;border-radius:12px;border:1px solid #e2e8f0;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.05);">

      <div style="background:linear-gradient(135deg,#1e3a5f 0%,#2563eb 100%);padding:32px;text-align:center;">
        <h1 style="margin:0;color:#ffffff !important;font-size:22px;font-weight:600;text-shadow:0 1px 2px rgba(0,0,0,0.1);">${s.heading}</h1>
        <p style="margin:10px 0 0;color:#ffffff !important;font-size:14px;opacity:0.95;">${locale === "ro" ? "Vei fi contactat de clinicile potrivite in maximum 72 de ore." : "You will be contacted by a suitable clinic within 72 hours."}</p>
      </div>

      <div style="padding:32px;">
        <p style="font-size:16px;color:#334155;line-height:1.7;margin:0 0 16px;">${s.greeting}</p>
        <p style="font-size:16px;color:#334155;line-height:1.7;margin:0 0 16px;">${s.body1}</p>
        <p style="font-size:16px;color:#334155;line-height:1.7;margin:0 0 16px;">${s.body2}</p>
        <p style="font-size:16px;color:#334155;line-height:1.7;margin:0 0 24px;">${s.body3}</p>

        <div style="margin-bottom:24px;border:1px solid #e2e8f0;border-radius:10px;overflow:hidden;">
          <div style="padding:14px 20px;background:#f8fafc;border-bottom:1px solid #e2e8f0;">
            <p style="margin:0;font-size:15px;color:#1e3a5f;font-weight:600;">${s.dataSummaryTitle}</p>
          </div>
          <table style="width:100%;border-collapse:collapse;font-size:15px;color:#334155;">
            ${dataRows}
          </table>
        </div>

        <div style="padding:20px;background:#f0f7ff;border-radius:8px;margin-bottom:24px;">
          <p style="margin:0;font-size:14px;color:#1e3a5f;font-weight:600;">${s.nextTitle}</p>
          <ul style="margin:12px 0 0;padding-left:20px;font-size:14px;color:#334155;line-height:1.8;">
            <li>${s.step1}</li>
            <li>${s.step2}</li>
            <li>${s.step3}</li>
          </ul>
        </div>

        <p style="font-size:15px;color:#334155;line-height:1.7;margin:0;">
          ${s.closing}<br>
          <strong style="color:#1e3a5f;">${s.team}</strong>
        </p>
      </div>

      <div style="padding:20px 32px;background:#f8fafc;border-top:1px solid #e2e8f0;text-align:center;">
        <p style="margin:0 0 6px;font-size:12px;color:#94a3b8;">${s.privacy}</p>
        <p style="margin:0;font-size:12px;color:#94a3b8;">${s.support}</p>
      </div>

    </div>
  </div>
</body>
</html>`;
}

// ---------------------------------------------------------------------------
// Internal monitoring email (for manual gate workflow)
// ---------------------------------------------------------------------------

function buildInternalHtml(
  lead: ExtendedLeadPayload,
  leadId: string,
  submittedAt: string,
  intentLevel: IntentLevel,
  locale: SupportedLocale,
): string {
  const s = internalEmailStrings(locale);
  const dateStr = new Date(submittedAt).toLocaleString(
    locale === "ro" ? "ro-RO" : "en-GB",
    { 
      dateStyle: "long", 
      timeStyle: "short",
      timeZone: "Europe/Bucharest",
    },
  );

  const intentBadge = (() => {
    const styles: Record<string, string> = {
      high: "background:#dcfce7;color:#166534;",
      medium: "background:#dbeafe;color:#1e40af;",
      low: "background:#fef9c3;color:#854d0e;",
    };
    const s = styles[intentLevel] || styles.low;
    return `<span style="display:inline-block;padding:2px 10px;${s}border-radius:9999px;font-size:13px;font-weight:600;">${intentLabel(intentLevel, locale)}</span>`;
  })();

  return `
<!DOCTYPE html>
<html lang="${locale}">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background-color:#f8fafc;">
  <div style="max-width:600px;margin:0 auto;padding:32px 24px;">
    <div style="background:#ffffff;border-radius:12px;border:1px solid #e2e8f0;overflow:hidden;">

      <div style="background:#1e3a5f;padding:24px 32px;">
        <h1 style="margin:0;color:#ffffff;font-size:20px;font-weight:600;">${escapeHtml(s.heading)}</h1>
      </div>

      <div style="padding:32px;">
        <p style="font-size:15px;color:#334155;line-height:1.7;margin:0 0 24px;">${escapeHtml(s.intro)}</p>

        <table style="width:100%;border-collapse:collapse;font-size:15px;color:#334155;margin-bottom:24px;">
          ${row(s.leadIdLabel, formatLeadId(leadId))}
          ${row(s.submittedAtLabel, dateStr)}
          ${row(clinicLabel("name", locale), `${lead.first_name} ${lead.last_name}`)}
          ${row(clinicLabel("email", locale), `<a href="mailto:${escapeHtml(lead.email)}" style="color:#2563eb;text-decoration:none;">${escapeHtml(lead.email)}</a>`, true)}
          ${row(clinicLabel("phone", locale), `<a href="tel:${escapeHtml(lead.phone)}" style="color:#2563eb;text-decoration:none;">${escapeHtml(lead.phone)}</a>`, true)}
          ${(lead.female_age_exact ?? lead.exact_age) != null
            ? row(locale === "ro" ? "Vârsta (femeie)" : "Age (female)", `${lead.female_age_exact ?? lead.exact_age} ${locale === "ro" ? "ani" : "years"}`, true)
            : row(clinicLabel("ageRange", locale), ageRangeDisplay(lead.age_range, locale))}
          ${lead.male_age_exact != null ? row(locale === "ro" ? "Vârsta partener" : "Partner age", `${lead.male_age_exact} ${locale === "ro" ? "ani" : "years"}`, true) : ""}
          ${row(clinicLabel("triedIvf", locale), clinicYesNo(lead.tried_ivf, locale))}
          ${lead.primary_factor ? row(locale === "ro" ? "Cauză principală" : "Primary factor", primaryFactorDisplay(lead.primary_factor, locale)) : ""}
          ${lead.urgency_level ? row(locale === "ro" ? "Termen dorit" : "Desired timeframe", urgencyDisplay(lead.urgency_level, locale)) : ""}
          ${row(clinicLabel("timeline", locale), clinicTimeline(lead.timeline, locale))}
          ${row(locale === "ro" ? "Mod de finanțare" : "Financing method", clinicBudget(lead.budget_range, locale))}
          ${lead.voucher_status ? row(locale === "ro" ? "Voucher" : "Voucher", voucherDisplay(lead.voucher_status, locale)) : ""}
          ${lead.test_status 
            ? row(locale === "ro" ? "Status analize" : "Test status", testStatusDisplay(lead.test_status, locale))
            : ""}
          ${lead.has_recent_tests != null ? row(locale === "ro" ? "Analize recente" : "Recent tests", lead.has_recent_tests ? (locale === "ro" ? "Da" : "Yes") : (locale === "ro" ? "Nu" : "No")) : ""}
          ${lead.tests_list ? row(locale === "ro" ? "Lista analize" : "Tests list", lead.tests_list) : ""}
          ${lead.previous_clinics ? row(locale === "ro" ? "Clinici consultate anterior" : "Previously consulted clinics", lead.previous_clinics) : ""}
          ${lead.best_contact_method ? row(locale === "ro" ? "Preferință contact" : "Contact preference", contactMethodDisplay(lead.best_contact_method, locale)) : ""}
          ${lead.availability_windows ? row(locale === "ro" ? "Disponibilitate" : "Availability", lead.availability_windows) : ""}
          ${lead.phone_verified_at 
            ? row(locale === "ro" ? "Confirmare telefonică" : "Phone verified", locale === "ro" 
              ? `✓ Confirmat la ${new Date(lead.phone_verified_at).toLocaleString("ro-RO", { dateStyle: "short", timeStyle: "short", timeZone: "Europe/Bucharest" })}`
              : `✓ Verified at ${new Date(lead.phone_verified_at).toLocaleString("en-GB", { dateStyle: "short", timeStyle: "short", timeZone: "Europe/Bucharest" })}`, true)
            : ""}
          ${row(s.intentLabel, intentBadge, true)}
          ${row(clinicLabel("city", locale), lead.city)}
          ${lead.message ? row(clinicLabel("message", locale), lead.message) : ""}
        </table>

        <div style="padding:16px;background:#dbeafe;border:1px solid #bfdbfe;border-radius:8px;font-size:14px;color:#1e40af;">
          <strong>${locale === "ro" ? "Următorii pași" : "Next steps"}</strong><br>
          ${escapeHtml(s.actionRequired)}
        </div>
      </div>

    </div>
  </div>
</body>
</html>`;
}

// ---------------------------------------------------------------------------
// Nurture sequence emails (for low-intent leads)
// ---------------------------------------------------------------------------

export function buildNurtureHtml(
  stage: 1 | 2 | 3,
  firstName: string,
  email: string,
  locale: SupportedLocale,
): string {
  const s = nurtureEmailStrings(stage, escapeHtml(firstName), locale);
  const unsubscribeLink = s.unsubscribe.replace("{email}", encodeURIComponent(email));

  const ctaButton = s.ctaLink
    ? `<div style="text-align:center;margin:24px 0;">
        <a href="${s.ctaLink}" style="display:inline-block;padding:12px 24px;background:#2563eb;color:#ffffff;text-decoration:none;border-radius:8px;font-weight:600;">${s.cta}</a>
      </div>`
    : `<p style="font-size:15px;color:#334155;line-height:1.7;margin:24px 0;text-align:center;">${s.cta}</p>`;

  return `
<!DOCTYPE html>
<html lang="${locale}">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background-color:#f8fafc;">
  <div style="max-width:600px;margin:0 auto;padding:32px 24px;">
    <div style="background:#ffffff;border-radius:12px;border:1px solid #e2e8f0;overflow:hidden;">

      <div style="background:#2563eb;padding:24px 32px;text-align:center;">
        <h1 style="margin:0;color:#ffffff;font-size:20px;font-weight:600;">${escapeHtml(s.subject)}</h1>
      </div>

      <div style="padding:32px;">
        <p style="font-size:16px;color:#334155;line-height:1.7;margin:0 0 16px;">${s.greeting}</p>
        <div style="font-size:15px;color:#334155;line-height:1.7;margin:0 0 24px;">
          ${s.body}
        </div>

        ${ctaButton}

        <p style="font-size:14px;color:#334155;line-height:1.7;margin:24px 0 0;">
          ${s.closing}
        </p>
      </div>

      <div style="padding:20px 32px;background:#f8fafc;border-top:1px solid #e2e8f0;text-align:center;">
        <p style="margin:0;font-size:11px;color:#94a3b8;line-height:1.6;">
          ${unsubscribeLink}
        </p>
      </div>

    </div>
  </div>
</body>
</html>`;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface SendLeadEmailsParams {
  lead: LeadPayload;
  leadId: string;
  submittedAt: string;
  intentLevel: IntentLevel;
  ipHash: string;
  userAgent: string;
}

export interface SendInternalNotificationParams {
  lead: ExtendedLeadPayload;
  leadId: string;
  submittedAt: string;
  intentLevel: IntentLevel;
}

export async function sendInternalNotification({
  lead,
  leadId,
  submittedAt,
  intentLevel,
}: SendInternalNotificationParams) {
  const resend = getResend();
  const from = getFromAddress();
  const monitorEmail = process.env.INTERNAL_LEADS_MONITOR_EMAIL;

  if (!monitorEmail) {
    console.warn(
      "INTERNAL_LEADS_MONITOR_EMAIL is not set; skipping internal lead notification. Set it in Vercel env for manual gate workflow."
    );
    return;
  }

  const locale = lead.locale;

  const result = await resend.emails.send({
    from,
    to: monitorEmail,
    subject: internalSubject(locale),
    html: buildInternalHtml(lead, leadId, submittedAt, intentLevel, locale),
  });

  if (result.error) {
    console.error("Failed to send internal notification email:", result.error);
    throw new Error("Failed to send internal notification");
  }

  return { sent: true };
}

export async function sendLeadEmails({
  lead,
  leadId,
  submittedAt,
  intentLevel,
  ipHash,
  userAgent,
}: SendLeadEmailsParams) {
  const resend = getResend();
  const from = getFromAddress();

  // Resolve clinic email via city-based routing rules
  const routing = resolveClinicEmail(lead.city);
  const monitorEmail = getMonitorEmail();
  const locale = lead.locale;

  console.log(`[email] Lead ${leadId} routed to ${routing.clinicEmail} (${routing.matchedRule})`);

  const meta: MetaBlock = {
    leadId,
    timestamp: submittedAt,
    locale,
    intentLevel,
    ipHash,
    userAgent,
    routedTo: routing.matchedRule,
  };

  const cc = monitorEmail ? [monitorEmail] : undefined;

  const results = await Promise.allSettled([
    resend.emails.send({
      from,
      to: routing.clinicEmail,
      cc,
      subject: clinicSubject(locale, intentLevel),
      html: buildClinicHtml(lead, meta),
    }),
    resend.emails.send({
      from,
      to: lead.email,
      subject: userSubject(locale),
      html: buildUserHtml(lead, submittedAt),
    }),
  ]);

  const clinicResult = results[0];
  const userResult = results[1];

  if (clinicResult.status === "rejected") {
    console.error("Failed to send clinic notification email:", clinicResult.reason);
  }
  if (userResult.status === "rejected") {
    console.error("Failed to send user confirmation email:", userResult.reason);
  }

  return {
    clinicEmailSent: clinicResult.status === "fulfilled",
    userEmailSent: userResult.status === "fulfilled",
  };
}

// ---------------------------------------------------------------------------
// Phase 2: Premium Lead Sheet Email Template
// ---------------------------------------------------------------------------

interface PremiumLeadData {
  lead: {
    id: string;
    first_name: string;
    last_name: string;
    phone: string;
    email: string;
    city: string;
    female_age_exact?: number | null;
    male_age_exact?: number | null;
    primary_factor?: string | null;
    voucher_status?: string | null;
    has_recent_tests?: boolean | null;
    tests_list?: string | null;
    previous_clinics?: string | null;
    urgency_level?: string | null;
    availability_windows?: string | null;
    best_contact_method?: string | null;
    budget_range?: string | null;
    operator_verified_at?: string | null;
    call_attempts?: number | null;
    operator_notes?: string | null;
    consent_timestamp?: string | null;
    locale?: string;
  };
  clinicEmail: string;
  clinicName: string;
}

function buildPremiumLeadSheetHtml(data: PremiumLeadData): string {
  const { lead, clinicName } = data;
  const locale = (lead.locale as "ro" | "en") || "ro";
  const isRO = locale === "ro";

  function section(title: string, content: string): string {
    return `
      <div style="margin-bottom:24px;">
        <h3 style="margin:0 0 12px;font-size:16px;font-weight:600;color:#1e3a5f;border-bottom:2px solid #e2e8f0;padding-bottom:6px;">
          ${escapeHtml(title)}
        </h3>
        ${content}
      </div>`;
  }

  function row(label: string, value: string, isHtml = false): string {
    return `
      <tr>
        <td style="padding:8px 12px;font-weight:600;color:#64748b;width:35%;vertical-align:top;">${escapeHtml(label)}</td>
        <td style="padding:8px 12px;color:#334155;word-wrap:break-word;word-break:break-word;">${isHtml ? value : escapeHtml(value || (isRO ? "—" : "—"))}</td>
      </tr>`;
  }

  const verifiedAt = lead.operator_verified_at 
    ? new Date(lead.operator_verified_at).toLocaleString(isRO ? "ro-RO" : "en-GB", {
        dateStyle: "short",
        timeStyle: "short",
        timeZone: "Europe/Bucharest",
      })
    : null;

  const urgencyLabel = urgencyDisplay(lead.urgency_level || null, locale);

  return `
<!DOCTYPE html>
<html lang="${locale}">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background-color:#f8fafc;">
  <div style="max-width:700px;margin:0 auto;padding:32px 24px;">
    <div style="background:#ffffff;border-radius:12px;border:1px solid #e2e8f0;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.1);">

      <div style="background:linear-gradient(135deg,#1e3a5f 0%,#2563eb 100%);padding:28px 32px;">
        <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:600;">
          ${isRO ? "Lead verificat telefonic" : "Phone-verified lead"}
        </h1>
        <p style="margin:8px 0 0;color:#ffffff;opacity:0.95;font-size:14px;">
          ${escapeHtml(lead.city || "")} - ${urgencyLabel}
        </p>
      </div>

      <div style="padding:32px;">
        ${section(
          isRO ? "Date de contact" : "Contact Information",
          `<table style="width:100%;border-collapse:collapse;">
            ${row(isRO ? "Nume" : "Name", `${lead.first_name} ${lead.last_name}`)}
            ${row(isRO ? "Telefon" : "Phone", `<a href="tel:${escapeHtml(lead.phone)}" style="color:#2563eb;text-decoration:none;">${escapeHtml(lead.phone)}</a>`, true)}
            ${row(isRO ? "Email" : "Email", `<a href="mailto:${escapeHtml(lead.email)}" style="color:#2563eb;text-decoration:none;">${escapeHtml(lead.email)}</a>`, true)}
            ${lead.best_contact_method ? row(isRO ? "Metodă preferată de contact" : "Preferred contact method", contactMethodDisplay(lead.best_contact_method, locale)) : ""}
          </table>`
        )}

        ${section(
          isRO ? "Intenție și finanțare" : "Intent and Financing",
          `<table style="width:100%;border-collapse:collapse;">
            ${row(isRO ? "Urgență" : "Urgency", urgencyLabel)}
            ${lead.budget_range ? row(isRO ? "Mod de finanțare" : "Financing method", clinicBudget(lead.budget_range, locale)) : ""}
            ${lead.voucher_status ? row(isRO ? "Status voucher" : "Voucher status", voucherDisplay(lead.voucher_status, locale)) : ""}
          </table>`
        )}

        ${section(
          isRO ? "Calificatori medicali" : "Medical Qualifiers",
          `<table style="width:100%;border-collapse:collapse;">
            ${lead.female_age_exact ? row(isRO ? "Vârsta (femeie)" : "Age (female)", `${lead.female_age_exact} ${isRO ? "ani" : "years"}`) : ""}
            ${lead.male_age_exact ? row(isRO ? "Vârsta (bărbat)" : "Age (male)", `${lead.male_age_exact} ${isRO ? "ani" : "years"}`) : ""}
            ${lead.primary_factor ? row(isRO ? "Factor principal" : "Primary factor", primaryFactorDisplay(lead.primary_factor, locale)) : ""}
            ${lead.has_recent_tests !== null ? row(isRO ? "Are analize recente" : "Has recent tests", lead.has_recent_tests ? (isRO ? "Da" : "Yes") : (isRO ? "Nu" : "No")) : ""}
            ${lead.tests_list ? row(isRO ? "Lista analizelor" : "Tests list", lead.tests_list) : ""}
          </table>`
        )}

        ${section(
          isRO ? "Logistică" : "Logistics",
          `<table style="width:100%;border-collapse:collapse;">
            ${lead.availability_windows ? row(isRO ? "Disponibilitate pentru apeluri" : "Availability for calls", lead.availability_windows) : ""}
            ${row(isRO ? "Oraș" : "City", lead.city || "")}
          </table>`
        )}

        ${lead.previous_clinics ? section(
          isRO ? "Istoric" : "History",
          `<p style="margin:0;color:#334155;">${escapeHtml(lead.previous_clinics)}</p>`
        ) : ""}

        ${section(
          isRO ? "Verificare operator" : "Operator Verification",
          `<table style="width:100%;border-collapse:collapse;">
            ${verifiedAt ? row(isRO ? "Verificat la" : "Verified at", verifiedAt) : ""}
            ${(lead.call_attempts ?? 0) > 0 ? row(isRO ? "Încercări apel" : "Call attempts", String(lead.call_attempts)) : ""}
            ${lead.operator_notes ? row(isRO ? "Note operator" : "Operator notes", lead.operator_notes) : ""}
          </table>`
        )}

        ${section(
          isRO ? "Consimțământ GDPR" : "GDPR Consent",
          `<table style="width:100%;border-collapse:collapse;">
            ${lead.consent_timestamp ? row(
              isRO ? "Consimțământ explicit captat la" : "Explicit consent captured at",
              new Date(lead.consent_timestamp).toLocaleString(isRO ? "ro-RO" : "en-GB", {
                dateStyle: "long",
                timeStyle: "short",
                timeZone: "Europe/Bucharest",
              })
            ) : ""}
            ${row(
              isRO ? "Scop utilizare date" : "Data usage purpose",
              isRO ? "Datele pot fi utilizate pentru contact în scop FIV" : "Data may be used for contact regarding IVF purposes"
            )}
          </table>
          <div style="margin-top:12px;padding:12px;background:#f0f7ff;border-radius:6px;border-left:3px solid #2563eb;">
            <p style="margin:0;font-size:13px;color:#1e40af;">
              <strong>${isRO ? "✓ Confirmat explicit" : "✓ Explicitly confirmed"}</strong> - ${isRO 
                ? "Consimțământul a fost acordat explicit de către pacient în formularul de pe site."
                : "Consent was explicitly given by the patient in the website form."}
            </p>
          </div>`
        )}

        <div style="margin-top:20px;padding-top:20px;border-top:1px solid #e2e8f0;">
          <p style="margin:0;font-size:13px;color:#64748b;">
            <strong>${isRO ? "Clinică atribuită:" : "Assigned clinic:"}</strong> ${escapeHtml(clinicName)}
          </p>
        </div>
      </div>

    </div>
  </div>
</body>
</html>`;
}

export interface SendPremiumLeadEmailParams {
  lead: PremiumLeadData["lead"];
  clinicEmail: string;
  clinicName: string;
}

export async function sendPremiumLeadEmail({
  lead,
  clinicEmail,
  clinicName,
}: SendPremiumLeadEmailParams) {
  const resend = getResend();
  const from = getFromAddress();
  const monitorEmail = getMonitorEmail();
  const locale = (lead.locale as "ro" | "en") || "ro";
  const isRO = locale === "ro";

  const urgencyLabel = urgencyDisplay(lead.urgency_level || null, locale);
  const subject = isRO
    ? `[FIVMatch] Lead verificat telefonic - ${lead.city || "N/A"} - ${urgencyLabel}`
    : `[FIVMatch] Phone-verified lead - ${lead.city || "N/A"} - ${urgencyLabel}`;

  const html = buildPremiumLeadSheetHtml({ lead, clinicEmail, clinicName });

  const recipients = [clinicEmail];
  if (monitorEmail) {
    recipients.push(monitorEmail);
  }

  const result = await resend.emails.send({
    from,
    to: clinicEmail,
    cc: monitorEmail ? [monitorEmail] : undefined,
    subject,
    html,
  });

  if (result.error) {
    console.error("Failed to send premium lead email:", result.error);
    throw new Error("Failed to send premium lead email");
  }

  return { sent: true, emailId: result.data?.id };
}
