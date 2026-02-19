import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

/**
 * GET /api/admin/leads/[id]?token=...
 * Returns full lead details.
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
        c.email as clinic_email
      FROM leads l
      LEFT JOIN clinics c ON l.assigned_clinic_id = c.id
      WHERE l.id = ${params.id}
    `;

    if (leads.length === 0) {
      return NextResponse.json({ error: "Lead negăsit" }, { status: 404 });
    }

    return NextResponse.json({ lead: leads[0] });
  } catch (err) {
    console.error("Error fetching lead:", err);
    return NextResponse.json(
      { error: "Eroare la încărcarea lead-ului" },
      { status: 500 }
    );
  }
}
