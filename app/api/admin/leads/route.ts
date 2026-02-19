import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

/**
 * GET /api/admin/leads?token=...
 * Returns last 100 leads for admin panel.
 */
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  const verifyToken = process.env.VERIFY_TOKEN;

  if (!verifyToken || token !== verifyToken) {
    return NextResponse.json({ error: "Neautorizat" }, { status: 403 });
  }

  try {
    const sql = getDb();
    const leads = await sql`
      SELECT 
        l.id,
        l.first_name,
        l.last_name,
        l.phone,
        l.city,
        l.timeline,
        l.budget_range,
        l.status,
        l.created_at,
        l.assigned_clinic_id,
        c.name as clinic_name,
        c.city as clinic_city
      FROM leads l
      LEFT JOIN clinics c ON l.assigned_clinic_id = c.id
      ORDER BY l.created_at DESC
      LIMIT 100
    `;

    return NextResponse.json({ leads });
  } catch (err) {
    console.error("Error fetching leads:", err);
    return NextResponse.json(
      { error: "Eroare la încărcarea lead-urilor" },
      { status: 500 }
    );
  }
}
