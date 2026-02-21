import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

/**
 * POST /api/admin/cleanup?token=...
 * Clears all leads, lead_events, and clinics so the operator panel starts empty.
 * Use before going live to remove test data.
 */
export async function POST(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  const verifyToken = process.env.VERIFY_TOKEN;

  if (!verifyToken || token !== verifyToken) {
    return NextResponse.json({ error: "Neautorizat" }, { status: 403 });
  }

  try {
    const sql = getDb();

    // lead_events CASCADE when leads are deleted; clinics ON DELETE SET NULL on leads
    await sql`DELETE FROM leads`;
    await sql`DELETE FROM clinics`;

    return NextResponse.json({
      success: true,
      message: "Baza de date a fost golită: lead-uri, evenimente și clinici.",
    });
  } catch (err) {
    console.error("Error during cleanup:", err);
    return NextResponse.json(
      { error: "Eroare la golirea bazei de date" },
      { status: 500 }
    );
  }
}
