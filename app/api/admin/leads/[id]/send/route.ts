import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { sendPremiumLeadEmail } from "@/lib/email";

/**
 * POST /api/admin/leads/[id]/send?token=...
 * Sends premium lead sheet email to assigned clinic and marks lead as sent.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const token = request.nextUrl.searchParams.get("token");
  const verifyToken = process.env.VERIFY_TOKEN;

  if (!verifyToken || token !== verifyToken) {
    return NextResponse.json({ error: "Neautorizat" }, { status: 403 });
  }

  try {
    const sql = getDb();

    // Fetch lead with all Phase 2 fields including consent metadata
    const leadRows = await sql`
      SELECT 
        l.*,
        c.name as clinic_name,
        c.email as clinic_email
      FROM leads l
      LEFT JOIN clinics c ON l.assigned_clinic_id = c.id
      WHERE l.id = ${params.id}
        AND l.operator_status = 'VERIFIED_READY'
        AND l.assigned_clinic_id IS NOT NULL
        AND l.consent_to_share = true
    `;

    if (leadRows.length === 0) {
      return NextResponse.json(
        { error: "Lead negăsit, neverificat sau fără clinică atribuită" },
        { status: 404 }
      );
    }

    const lead = leadRows[0];

    if (!lead.clinic_email) {
      return NextResponse.json(
        { error: "Clinică fără email configurat" },
        { status: 400 }
      );
    }

    // Send premium lead email
    await sendPremiumLeadEmail({
      lead: lead as any,
      clinicEmail: lead.clinic_email,
      clinicName: lead.clinic_name || "Clinică",
    });

    const now = new Date().toISOString();

    // Update lead status
    const result = await sql`
      UPDATE leads
      SET 
        operator_status = 'SENT_TO_CLINIC',
        sent_to_clinic_at = ${now},
        updated_at = ${now}
      WHERE id = ${params.id}
      RETURNING id, operator_status, sent_to_clinic_at
    `;

    // Create lead event
    await sql`
      INSERT INTO lead_events (lead_id, type, metadata)
      VALUES (${params.id}, 'SENT_EMAIL', ${JSON.stringify({ 
        clinic_id: lead.assigned_clinic_id,
        clinic_email: lead.clinic_email,
        sent_at: now,
      })})
    `;

    return NextResponse.json({
      success: true,
      operator_status: result[0].operator_status,
      sent_to_clinic_at: result[0].sent_to_clinic_at,
    });
  } catch (err) {
    console.error("Error sending lead email:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Eroare la trimiterea email-ului" },
      { status: 500 }
    );
  }
}
