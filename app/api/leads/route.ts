import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { validateLeadPayload } from "@/lib/validation";
import { sendInternalNotification } from "@/lib/email";
import { hashIp } from "@/lib/ip-hash";
import { resolveLocale, apiMessage, deriveIntentLevel, userSubject } from "@/lib/locale-strings";
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

    // Safety: Stop nurture emails for existing leads with same email
    await sql`
      UPDATE leads 
      SET nurture_completed = true 
      WHERE email = ${lead.email} AND nurture_completed = false
    `;

    // Set nurture fields based on intent level
    const isLowIntent = intentLevel === "low";
    const nurtureStage = isLowIntent ? 1 : 0;
    const nurtureNextAt = isLowIntent ? now : null;

    const rows = await sql`
      INSERT INTO leads (
        first_name, last_name, phone, email,
        age_range, tried_ivf, timeline, budget_range, city,
        message, gdpr_consent, locale, ip_hash,
        intent_level, status, created_at, updated_at,
        nurture_stage, nurture_next_at, nurture_completed
      ) VALUES (
        ${lead.first_name}, ${lead.last_name}, ${lead.phone}, ${lead.email},
        ${lead.age_range}, ${lead.tried_ivf}, ${lead.timeline}, ${lead.budget_range}, ${lead.city},
        ${lead.message ?? null}, ${lead.gdpr_consent}, ${lead.locale}, ${ipHash},
        ${intentLevel}, ${"new_unverified"}, ${now}, ${now},
        ${nurtureStage}, ${nurtureNextAt}, ${false}
      )
      RETURNING id, created_at
    `;

    const leadId = rows[0].id as string;

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
        html: buildUserHtml(lead.first_name, lead.locale),
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
