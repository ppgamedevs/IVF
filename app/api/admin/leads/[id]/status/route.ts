import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { resolveLeadId } from "@/lib/resolve-lead-id";
import { computeLeadTier } from "@/lib/tiering";

/**
 * POST /api/admin/leads/[id]/status?token=...
 * Updates operator_status and related fields. [id] can be full UUID or shortId.
 * Body: { status: "VERIFIED_READY" | "INVALID" | "LOW_INTENT_NURTURE", notes?: string }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  const token = request.nextUrl.searchParams.get("token");
  const verifyToken = process.env.VERIFY_TOKEN;

  if (!verifyToken || token !== verifyToken) {
    return NextResponse.json({ error: "Neautorizat" }, { status: 403 });
  }

  try {
    const sql = getDb();
    const resolved = await Promise.resolve(params);
    const idParam = typeof resolved.id === "string" ? resolved.id : resolved.id?.[0];
    const leadId = await resolveLeadId(sql, idParam ?? "");
    if (!leadId) {
      return NextResponse.json({ error: "Lead negăsit" }, { status: 404 });
    }

    const body = await request.json().catch(() => ({}));
    const status = typeof body?.status === "string" ? body.status : null;
    const notes = typeof body?.notes === "string" ? body.notes : "";

    if (!status || !["VERIFIED_READY", "INVALID", "LOW_INTENT_NURTURE"].includes(status)) {
      return NextResponse.json(
        { error: "Status invalid" },
        { status: 400 }
      );
    }

    // Fetch current lead data for tiering
    const currentLead = await sql`
      SELECT 
        operator_status, urgency_level, consent_to_share,
        female_age_exact, best_contact_method, availability_windows,
        has_recent_tests, tests_list, locale
      FROM leads
      WHERE id = ${leadId}
    `;

    if (currentLead.length === 0) {
      return NextResponse.json({ error: "Lead negăsit" }, { status: 404 });
    }

    const lead = currentLead[0];
    const now = new Date().toISOString();

    // Compute tier if verifying
    let tierUpdate: { lead_tier?: string; tier_reason?: string | null } = {};
    if (status === "VERIFIED_READY") {
      // Treat null consent as true when operator verifies (form requires consent; old leads may have null)
      const consentToShare = lead.consent_to_share !== false;
      const tieringResult = computeLeadTier({
        operator_status: status,
        urgency_level: lead.urgency_level,
        consent_to_share: consentToShare,
        female_age_exact: lead.female_age_exact,
        best_contact_method: lead.best_contact_method,
        availability_windows: lead.availability_windows,
        has_recent_tests: lead.has_recent_tests,
        tests_list: lead.tests_list,
      }, (lead.locale as "ro" | "en") || "ro");

      tierUpdate = {
        lead_tier: tieringResult.tier,
        tier_reason: tieringResult.reason,
      };
    } else if (status === "LOW_INTENT_NURTURE") {
      // Set tier to D for low intent
      tierUpdate = {
        lead_tier: "D",
        tier_reason: lead.locale === "ro" 
          ? "Lead cu intenție scăzută, trimis în nurturing"
          : "Low intent lead, sent to nurturing",
      };
    } else if (status === "INVALID") {
      tierUpdate = {
        lead_tier: "D",
        tier_reason: lead.locale === "ro" 
          ? "Lead marcat ca invalid"
          : "Lead marked as invalid",
      };
    }

    // Compute new operator_notes in JS to avoid Postgres "could not determine data type of parameter" (CASE with multiple params)
    const existingNotes = lead.operator_notes ?? "";
    const hasNewNotes = notes != null && String(notes).trim() !== "";
    const newOperatorNotes = hasNewNotes
      ? (existingNotes.trim() === "" ? notes : `${existingNotes}\n\n${now}: ${notes}`)
      : existingNotes;

    // Update lead
    const result = await sql`
      UPDATE leads
      SET 
        operator_status = ${status},
        operator_verified_at = ${status === "VERIFIED_READY" ? now : null},
        operator_notes = ${newOperatorNotes},
        lead_tier = ${tierUpdate.lead_tier ?? "D"},
        tier_reason = ${tierUpdate.tier_reason || null},
        updated_at = ${now}
      WHERE id = ${leadId}
      RETURNING id, operator_status, operator_verified_at, lead_tier, tier_reason
    `;

    if (result.length === 0) {
      return NextResponse.json({ error: "Lead negăsit" }, { status: 404 });
    }

    // Create lead event (non-fatal: status update already succeeded)
    try {
      await sql`
        INSERT INTO lead_events (lead_id, type, metadata)
        VALUES (${leadId}, 'STATUS_CHANGED', ${JSON.stringify({ 
          old_status: lead.operator_status,
          new_status: status,
          notes: notes || null,
        })})
      `;
    } catch (eventErr) {
      console.warn("Could not create lead_events row:", eventErr);
    }

    // If LOW_INTENT_NURTURE, trigger nurture enrollment
    if (status === "LOW_INTENT_NURTURE") {
      try {
        await sql`
          UPDATE leads
          SET 
            nurture_stage = 1,
            nurture_next_at = ${now},
            nurture_completed = false
          WHERE id = ${leadId}
        `;
      } catch (err) {
        // Nurture columns might not exist, ignore
        console.warn("Could not set nurture stage:", err);
      }
    }

    return NextResponse.json({
      success: true,
      operator_status: result[0].operator_status,
      operator_verified_at: result[0].operator_verified_at,
      lead_tier: result[0].lead_tier,
      tier_reason: result[0].tier_reason,
    });
  } catch (err) {
    console.error("Error updating status:", err);
    return NextResponse.json(
      { error: "Eroare la actualizarea statusului" },
      { status: 500 }
    );
  }
}
