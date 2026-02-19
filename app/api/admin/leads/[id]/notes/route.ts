import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

/**
 * POST /api/admin/leads/[id]/notes?token=...
 * Updates lead notes.
 * Body: { notes: string }
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
    const { notes } = body;

    const sql = getDb();
    const now = new Date().toISOString();

    const result = await sql`
      UPDATE leads
      SET 
        notes = ${notes || null},
        updated_at = ${now}
      WHERE id = ${params.id}
      RETURNING id, notes
    `;

    if (result.length === 0) {
      return NextResponse.json({ error: "Lead negăsit" }, { status: 404 });
    }

    return NextResponse.json({ success: true, lead: result[0] });
  } catch (err) {
    console.error("Error updating notes:", err);
    return NextResponse.json(
      { error: "Eroare la actualizarea notelor" },
      { status: 500 }
    );
  }
}
