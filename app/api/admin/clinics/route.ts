import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

/**
 * GET /api/admin/clinics?token=...
 * Returns all active clinics.
 */
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  const verifyToken = process.env.VERIFY_TOKEN;

  if (!verifyToken || token !== verifyToken) {
    return NextResponse.json({ error: "Neautorizat" }, { status: 403 });
  }

  try {
    const sql = getDb();
    const clinics = await sql`
      SELECT id, name, email, city
      FROM clinics
      WHERE active = true
      ORDER BY name ASC
    `;

    return NextResponse.json({ clinics });
  } catch (err) {
    console.error("Error fetching clinics:", err);
    return NextResponse.json(
      { error: "Eroare la încărcarea clinicilor" },
      { status: 500 }
    );
  }
}
