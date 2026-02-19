import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

/**
 * POST /api/admin/leads/[id]/assign?token=...
 * Assigns lead to a clinic.
 * Body: { clinic_id: "uuid" }
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
    const body = await request.json();
    const { clinic_id } = body;

    if (!clinic_id) {
      return NextResponse.json(
        { error: "clinic_id este obligatoriu" },
        { status: 400 }
      );
    }

    // Verify clinic exists and is active
    const clinic = await sql`
      SELECT id, name, email, active
      FROM clinics
      WHERE id = ${clinic_id} AND active = true
    `;

    if (clinic.length === 0) {
      return NextResponse.json(
        { error: "Clinică negăsită sau inactivă" },
        { status: 404 }
      );
    }

    const now = new Date().toISOString();

    // Update lead
    const result = await sql`
      UPDATE leads
      SET 
        assigned_clinic_id = ${clinic_id},
        assigned_at = ${now},
        updated_at = ${now}
      WHERE id = ${params.id}
      RETURNING id, assigned_clinic_id, assigned_at
    `;

    if (result.length === 0) {
      return NextResponse.json({ error: "Lead negăsit" }, { status: 404 });
    }

    // Create lead event
    await sql`
      INSERT INTO lead_events (lead_id, type, metadata)
      VALUES (${params.id}, 'ASSIGNED', ${JSON.stringify({ 
        clinic_id,
        clinic_name: clinic[0].name,
      })})
    `;

    return NextResponse.json({
      success: true,
      assigned_clinic_id: result[0].assigned_clinic_id,
      assigned_at: result[0].assigned_at,
      clinic: {
        id: clinic[0].id,
        name: clinic[0].name,
        email: clinic[0].email,
      },
    });
  } catch (err) {
    console.error("Error assigning clinic:", err);
    return NextResponse.json(
      { error: "Eroare la atribuirea clinicii" },
      { status: 500 }
    );
  }
}
