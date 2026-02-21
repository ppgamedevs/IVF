import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

/**
 * GET /api/admin/clinics?token=...
 * Returns list of all clinics (active and inactive).
 */
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  const verifyToken = process.env.VERIFY_TOKEN;

  if (!verifyToken || token !== verifyToken) {
    return NextResponse.json({ error: "Neautorizat" }, { status: 403 });
  }

  try {
    const sql = getDb();
    const activeOnly = request.nextUrl.searchParams.get("active") === "true";

    const clinics = await sql`
      SELECT id, name, email, phone, city_coverage, active, notes, created_at, updated_at
      FROM clinics
      ${activeOnly ? sql`WHERE active = true` : sql``}
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

/**
 * POST /api/admin/clinics?token=...
 * Creates a new clinic.
 * Body: { name, email, phone?, city_coverage?: string[] | string, active?: boolean, notes?: string }
 */
export async function POST(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  const verifyToken = process.env.VERIFY_TOKEN;

  if (!verifyToken || token !== verifyToken) {
    return NextResponse.json({ error: "Neautorizat" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { name, email, phone, city_coverage, city, active, notes } = body;

    if (!name || !email) {
      return NextResponse.json(
        { error: "Nume și email sunt obligatorii" },
        { status: 400 }
      );
    }

    const sql = getDb();
    const now = new Date().toISOString();
    let cityArr: string[] = [];
    if (Array.isArray(city_coverage) && city_coverage.length > 0) {
      cityArr = city_coverage;
    } else if (typeof city === "string" && city.trim()) {
      cityArr = [city.trim()];
    }
    const phoneVal = phone && String(phone).trim() ? String(phone).trim() : null;
    const activeVal = active !== false;

    const result = await sql`
      INSERT INTO clinics (name, email, phone, city_coverage, active, notes, created_at, updated_at)
      VALUES (${name}, ${email}, ${phoneVal}, ${cityArr}, ${activeVal}, ${notes || null}, ${now}, ${now})
      RETURNING id, name, email, phone, city_coverage, active, notes, created_at, updated_at
    `;

    return NextResponse.json({ clinic: result[0] }, { status: 201 });
  } catch (err) {
    console.error("Error creating clinic:", err);
    return NextResponse.json(
      { error: "Eroare la crearea clinicii" },
      { status: 500 }
    );
  }
}
