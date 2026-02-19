import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

/**
 * GET /api/admin/leads/[id]?token=...
 * Returns full lead details including all Phase 2 fields.
 */
export async function GET(
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
    const leads = await sql`
      SELECT 
        l.*,
        c.name as clinic_name,
        c.email as clinic_email,
        c.city_coverage as clinic_city_coverage
      FROM leads l
      LEFT JOIN clinics c ON l.assigned_clinic_id = c.id
      WHERE l.id = ${params.id}
    `;

    if (leads.length === 0) {
      return NextResponse.json({ error: "Lead negăsit" }, { status: 404 });
    }

    // Get lead events for audit trail
    const events = await sql`
      SELECT id, type, metadata, created_at
      FROM lead_events
      WHERE lead_id = ${params.id}
      ORDER BY created_at DESC
    `;

    return NextResponse.json({ 
      lead: leads[0],
      events: events || [],
    });
  } catch (err) {
    console.error("Error fetching lead:", err);
    return NextResponse.json(
      { error: "Eroare la încărcarea lead-ului" },
      { status: 500 }
    );
  }
}
