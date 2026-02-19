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

function buildClinicHtml(
  lead: LeadPayload,
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
          ${row(clinicLabel("ageRange", loc), lead.age_range)}
          ${row(clinicLabel("triedIvf", loc), clinicYesNo(lead.tried_ivf, loc))}
          ${row(clinicLabel("timeline", loc), timelineCell, true)}
          ${row(clinicLabel("budgetRange", loc), clinicBudget(lead.budget_range, loc))}
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
  lead: LeadPayload,
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

  const dataRows = [
    row(clinicLabel("name", locale), `${lead.first_name} ${lead.last_name}`),
    row(clinicLabel("email", locale), lead.email),
    row(clinicLabel("phone", locale), lead.phone),
    row(clinicLabel("ageRange", locale), ageRangeDisplay(lead.age_range, locale)),
    row(clinicLabel("triedIvf", locale), clinicYesNo(lead.tried_ivf, locale)),
    row(clinicLabel("timeline", locale), clinicTimeline(lead.timeline, locale)),
    row(clinicLabel("budgetRange", locale), clinicBudget(lead.budget_range, locale)),
    row(clinicLabel("city", locale), lead.city),
    row(
      clinicLabel("message", locale),
      lead.message?.trim() || s.noMessage,
    ),
    row(
      locale === "ro" ? "Data trimiterii" : "Submitted at",
      dateStr,
    ),
  ].join("");

  return `
<!DOCTYPE html>
<html lang="${locale}">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background-color:#f8fafc;">
  <div style="max-width:600px;margin:0 auto;padding:32px 24px;">
    <div style="background:#ffffff;border-radius:12px;border:1px solid #e2e8f0;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.05);">

      <div style="background:linear-gradient(135deg,#1e3a5f 0%,#2563eb 100%);padding:32px;text-align:center;">
        <h1 style="margin:0;color:#ffffff !important;font-size:22px;font-weight:600;text-shadow:0 1px 2px rgba(0,0,0,0.1);">${s.heading}</h1>
        <p style="margin:10px 0 0;color:#ffffff !important;font-size:14px;opacity:0.95;">${locale === "ro" ? "Vei fi contactat de clinicile potrivite in maximum 24 de ore." : "You will be contacted by a suitable clinic within 24 hours."}</p>
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
  lead: LeadPayload,
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
          ${row(clinicLabel("ageRange", locale), ageRangeDisplay(lead.age_range, locale))}
          ${row(clinicLabel("triedIvf", locale), clinicYesNo(lead.tried_ivf, locale))}
          ${row(clinicLabel("timeline", locale), clinicTimeline(lead.timeline, locale))}
          ${row(clinicLabel("budgetRange", locale), clinicBudget(lead.budget_range, locale))}
          ${row(s.intentLabel, intentBadge, true)}
          ${row(clinicLabel("city", locale), lead.city)}
          ${lead.message ? row(clinicLabel("message", locale), lead.message) : ""}
        </table>

        <div style="padding:16px;background:#fef3c7;border:1px solid #fde68a;border-radius:8px;font-size:14px;color:#92400e;">
          <strong>${locale === "ro" ? "Actiune necesara" : "Action required"}</strong><br>
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
  lead: LeadPayload;
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
