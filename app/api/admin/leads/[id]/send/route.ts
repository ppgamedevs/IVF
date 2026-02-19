import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

/**
 * POST /api/admin/leads/[id]/send?token=...
 * Marks lead as sent.
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
    const now = new Date().toISOString();

    const result = await sql`
      UPDATE leads
      SET 
        status = 'sent',
        sent_at = ${now},
        updated_at = ${now}
      WHERE id = ${params.id}
      RETURNING id, status, sent_at
    `;

    if (result.length === 0) {
      return NextResponse.json({ error: "Lead negăsit" }, { status: 404 });
    }

    return NextResponse.json({ success: true, lead: result[0] });
  } catch (err) {
    console.error("Error marking lead as sent:", err);
    return NextResponse.json(
      { error: "Eroare la marcarea lead-ului ca trimis" },
      { status: 500 }
    );
  }
}
