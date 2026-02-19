import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

/**
 * POST /api/admin/leads/[id]/assign?token=...
 * Assigns lead to a clinic.
 * Body: { clinic_id: string }
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
    const body = await request.json();
    const { clinic_id } = body;

    if (!clinic_id) {
      return NextResponse.json(
        { error: "ID clinică lipsă" },
        { status: 400 }
      );
    }

    const sql = getDb();
    const now = new Date().toISOString();

    const result = await sql`
      UPDATE leads
      SET 
        status = 'assigned',
        assigned_clinic_id = ${clinic_id},
        assigned_at = ${now},
        updated_at = ${now}
      WHERE id = ${params.id}
      RETURNING id, status, assigned_clinic_id, assigned_at
    `;

    if (result.length === 0) {
      return NextResponse.json({ error: "Lead negăsit" }, { status: 404 });
    }

    return NextResponse.json({ success: true, lead: result[0] });
  } catch (err) {
    console.error("Error assigning lead:", err);
    return NextResponse.json(
      { error: "Eroare la atribuirea lead-ului" },
      { status: 500 }
    );
  }
}
