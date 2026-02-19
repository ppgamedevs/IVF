import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { validateLeadPayload } from "@/lib/validation";
import { sendInternalNotification } from "@/lib/email";
import { hashIp } from "@/lib/ip-hash";
import { resolveLocale, apiMessage, deriveIntentLevel, userSubject } from "@/lib/locale-strings";
import { computeLeadTier } from "@/lib/tiering";
import {
  isHoneypotFilled,
  isRateLimited,
  isSubmittedTooFast,
  isSpamContent,
} from "@/lib/spam";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getClientIp(request: NextRequest): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

/** True if the error is due to a missing DB column (e.g. migration 005 not run in prod). */
function isMissingColumnError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  const code = (err as { code?: string })?.code;
  return code === "42703" || /column .* does not exist/i.test(msg) || /nurture_/i.test(msg);
}


/**
 * Build a silent fake 201 response.
 * Bots think they succeeded; the locale makes it look authentic.
 */
function fakeSuccess(locale: "ro" | "en") {
  return NextResponse.json(
    {
      success: true,
      message: apiMessage("success", locale),
      next_steps: apiMessage("nextSteps", locale),
      lead_id: "00000000-0000-0000-0000-000000000000",
    },
    { status: 201 },
  );
}

// ---------------------------------------------------------------------------
// POST /api/leads
// ---------------------------------------------------------------------------

/*
 * ─── Manual test checklist ───────────────────────────────────────────
 *
 * 1. /ro submit  → clinic email in RO + user email in RO
 *                → API JSON message & next_steps in RO
 * 2. /en submit  → clinic email in EN + user email in EN
 *                → API JSON message & next_steps in EN
 * 3. Honeypot    → fill _company field → 201 but no DB insert / email
 * 4. Fast submit → _rendered = Date.now() → 201 silent drop
 * 5. Bad locale  → locale: "fr" → defaults to "ro"
 * 6. Missing locale → defaults to "ro"
 * 7. Rate limit  → 6+ requests from same IP in 15 min → silent drop
 * 8. Spam msg    → message with 3+ URLs → silent drop
 * 9. Validation  → empty first_name → 422 with localized field error
 * ─────────────────────────────────────────────────────────────────────
 */

export async function POST(request: NextRequest) {
  // Resolve locale early so even error responses can be localized.
  // We'll re-resolve from the validated body later.
  let locale = resolveLocale("ro");

  try {
    const body = await request.json().catch(() => null);

    if (!body) {
      return NextResponse.json(
        { error: apiMessage("invalidJson", locale) },
        { status: 400 },
      );
    }

    const raw = body as Record<string, unknown>;

    // Read locale hint for early use in fake responses
    locale = resolveLocale(raw.locale);

    // --- Bot protection layer 1: Honeypot ---
    if (isHoneypotFilled(raw)) {
      console.log("[spam] Honeypot triggered");
      return fakeSuccess(locale);
    }

    // --- Bot protection layer 2: Timing ---
    if (isSubmittedTooFast(raw)) {
      console.log("[spam] Submitted too fast");
      return fakeSuccess(locale);
    }

    // --- Bot protection layer 3: Rate limiting (by IP hash) ---
    const rawIp = getClientIp(request);
    const ipHash = hashIp(rawIp);
    if (isRateLimited(ipHash)) {
      console.log(`[spam] Rate limited: ${ipHash.slice(0, 8)}…`);
      return fakeSuccess(locale);
    }

    // --- Validation (returns localized errors) ---
    const validation = validateLeadPayload(body);
    locale = validation.locale; // use the validated locale from here on

    if (!validation.valid) {
      return NextResponse.json(
        {
          error: apiMessage("validationFailed", locale),
          fields: validation.errors,
        },
        { status: 422 },
      );
    }

    const lead = validation.sanitized!;

    // --- Bot protection layer 4: Content spam detection ---
    const spamCheck = isSpamContent(lead);
    if (spamCheck.spam) {
      console.log(`[spam] Content rejected: ${spamCheck.reason}`);
      return fakeSuccess(locale);
    }

    // --- All checks passed - derive intent and insert lead ---
    const now = new Date().toISOString();
    const intentLevel = deriveIntentLevel(lead.timeline, lead.budget_range);
    const sql = getDb();
    
    // Capture consent metadata (explicit GDPR consent)
    const userAgent = request.headers.get("user-agent") || "";
    const consentTimestamp = now; // Exact moment consent was given
    const consentIpHash = ipHash; // Already hashed IP
    const consentUserAgent = userAgent.slice(0, 500); // Limit length

    let leadId: string;

    try {
      // Safety: Stop nurture emails for existing leads with same email (requires migration 005)
      await sql`
        UPDATE leads 
        SET nurture_completed = true 
        WHERE email = ${lead.email} AND nurture_completed = false
      `;

      // Set nurture fields based on intent level (requires migration 005)
      const isLowIntent = intentLevel === "low";
      const nurtureStage = isLowIntent ? 1 : 0;
      const nurtureNextAt = isLowIntent ? now : null;

      // Compute initial tier (will be D for new leads, but compute for consistency)
      const tieringResult = computeLeadTier({
        operator_status: "NEW",
        urgency_level: lead.urgency_level || (lead.timeline === "asap" ? "ASAP_0_30" : lead.timeline === "1-3months" ? "SOON_1_3" : "INFO_ONLY"),
        consent_to_share: lead.consent_to_share ?? true,
        female_age_exact: lead.female_age_exact ?? lead.exact_age ?? null,
        best_contact_method: lead.best_contact_method ?? null,
        availability_windows: lead.availability_windows ?? null,
        has_recent_tests: lead.has_recent_tests ?? null,
        tests_list: lead.tests_list ?? null,
      }, lead.locale);

      const rows = await sql`
        INSERT INTO leads (
          first_name, last_name, phone, email,
          age_range, exact_age, tried_ivf, timeline, budget_range, test_status, city,
          message, gdpr_consent, locale, ip_hash,
          intent_level, status, operator_status, created_at, updated_at,
          nurture_stage, nurture_next_at, nurture_completed,
          female_age_exact, male_age_exact, primary_factor, voucher_status,
          has_recent_tests, tests_list, previous_clinics, urgency_level,
          availability_windows, best_contact_method, consent_to_share,
          consent_timestamp, consent_ip_hash, consent_user_agent,
          lead_tier, tier_reason
        ) VALUES (
          ${lead.first_name}, ${lead.last_name}, ${lead.phone}, ${lead.email},
          ${lead.age_range}, ${lead.exact_age ?? null}, ${lead.tried_ivf}, ${lead.timeline}, ${lead.budget_range}, ${lead.test_status ?? null}, ${lead.city},
          ${lead.message ?? null}, ${lead.gdpr_consent}, ${lead.locale}, ${ipHash},
          ${intentLevel}, ${"new_unverified"}, ${"NEW"}, ${now}, ${now},
          ${nurtureStage}, ${nurtureNextAt}, ${false},
          ${lead.female_age_exact ?? null}, ${lead.male_age_exact ?? null}, ${lead.primary_factor ?? null}, ${lead.voucher_status ?? null},
          ${lead.has_recent_tests ?? null}, ${lead.tests_list ?? null}, ${lead.previous_clinics ?? null}, ${lead.urgency_level ?? (lead.timeline === "asap" ? "ASAP_0_30" : lead.timeline === "1-3months" ? "SOON_1_3" : "INFO_ONLY")},
          ${lead.availability_windows ?? null}, ${lead.best_contact_method ?? null}, ${lead.consent_to_share ?? true},
          ${consentTimestamp}, ${consentIpHash}, ${consentUserAgent},
          ${tieringResult.tier}, ${tieringResult.reason}
        )
        RETURNING id, created_at
      `;

      leadId = rows[0].id as string;
    } catch (dbErr) {
      // Production may not have migration 005 (nurture columns) yet — fallback to insert without them
      if (isMissingColumnError(dbErr)) {
        // Fallback: try without Phase 2 fields if migration not run
        const tieringResult = computeLeadTier({
          operator_status: "NEW",
          urgency_level: lead.urgency_level || (lead.timeline === "asap" ? "ASAP_0_30" : lead.timeline === "1-3months" ? "SOON_1_3" : "INFO_ONLY"),
          consent_to_share: lead.consent_to_share ?? true,
          female_age_exact: lead.female_age_exact ?? lead.exact_age ?? null,
          best_contact_method: lead.best_contact_method ?? null,
          availability_windows: lead.availability_windows ?? null,
          has_recent_tests: lead.has_recent_tests ?? null,
          tests_list: lead.tests_list ?? null,
        }, lead.locale);

        const fallbackRows = await sql`
          INSERT INTO leads (
            first_name, last_name, phone, email,
            age_range, exact_age, tried_ivf, timeline, budget_range, test_status, city,
            message, gdpr_consent, locale, ip_hash,
            intent_level, status, operator_status, created_at, updated_at,
            consent_to_share, consent_timestamp, consent_ip_hash, consent_user_agent,
            lead_tier, tier_reason
          ) VALUES (
            ${lead.first_name}, ${lead.last_name}, ${lead.phone}, ${lead.email},
            ${lead.age_range}, ${lead.exact_age ?? null}, ${lead.tried_ivf}, ${lead.timeline}, ${lead.budget_range}, ${lead.test_status ?? null}, ${lead.city},
            ${lead.message ?? null}, ${lead.gdpr_consent}, ${lead.locale}, ${ipHash},
            ${intentLevel}, ${"new_unverified"}, ${"NEW"}, ${now}, ${now},
            ${lead.consent_to_share ?? true}, ${consentTimestamp}, ${consentIpHash}, ${consentUserAgent},
            ${tieringResult.tier}, ${tieringResult.reason}
          )
          RETURNING id, created_at
        `;
        
        // Create audit events even in fallback mode
        try {
          await sql`
            INSERT INTO lead_events (lead_id, type, metadata)
            VALUES (${fallbackRows[0]?.id}, 'CREATED', ${JSON.stringify({ locale: lead.locale, intent_level: intentLevel })})
          `;
          await sql`
            INSERT INTO lead_events (lead_id, type, metadata)
            VALUES (${fallbackRows[0]?.id}, 'CONSENT_CAPTURED', ${JSON.stringify({ 
              consent: lead.consent_to_share ?? true,
              ip_hash: consentIpHash,
              user_agent: consentUserAgent,
              locale: lead.locale,
              timestamp: consentTimestamp,
            })})
          `;
        } catch (err) {
          console.warn("Could not create audit events:", err);
        }
        leadId = fallbackRows[0]?.id as string;
        if (!leadId) throw dbErr;
      } else {
        throw dbErr;
      }
    }

    // Create audit trail events: CREATED and CONSENT_CAPTURED
    try {
      // Event 1: Lead created
      await sql`
        INSERT INTO lead_events (lead_id, type, metadata)
        VALUES (${leadId}, 'CREATED', ${JSON.stringify({ locale: lead.locale, intent_level: intentLevel })})
      `;
      
      // Event 2: Explicit consent captured (GDPR audit trail)
      await sql`
        INSERT INTO lead_events (lead_id, type, metadata)
        VALUES (${leadId}, 'CONSENT_CAPTURED', ${JSON.stringify({ 
          consent: lead.consent_to_share ?? true,
          ip_hash: consentIpHash,
          user_agent: consentUserAgent,
          locale: lead.locale,
          timestamp: consentTimestamp,
        })})
      `;
    } catch (err) {
      // LeadEvent table might not exist yet, ignore
      console.warn("Could not create lead events:", err);
    }

    // Manual gate workflow: send only to internal monitor + user confirmation
    const { getResend, getFromAddress, buildUserHtml } = await import("@/lib/email");
    const resend = getResend();
    const from = getFromAddress();

    Promise.allSettled([
      sendInternalNotification({
        lead,
        leadId,
        submittedAt: now,
        intentLevel,
      }),
      resend.emails.send({
        from,
        to: lead.email,
        subject: userSubject(lead.locale),
        html: buildUserHtml(lead, now),
      }),
    ]).catch((err) => {
      console.error("Email sending failed:", err);
    });

    return NextResponse.json(
      {
        success: true,
        message: apiMessage("success", locale),
        next_steps: apiMessage("nextSteps", locale),
        lead_id: leadId,
        lead_score: intentLevel,
      },
      { status: 201 },
    );
  } catch (err) {
    console.error("Unexpected error in /api/leads:", err);
    return NextResponse.json(
      { error: apiMessage("serverError", locale) },
      { status: 500 },
    );
  }
}
