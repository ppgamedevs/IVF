import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

/**
 * POST /api/admin/leads/[id]/call?token=...
 * Logs a call attempt and increments call_attempts counter.
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
    const body = await request.json().catch(() => ({}));
    const notes = body.notes || "";

    const now = new Date().toISOString();

    // Increment call attempts and update status if needed
    const result = await sql`
      UPDATE leads
      SET 
        call_attempts = call_attempts + 1,
        operator_status = CASE
          WHEN operator_status = 'NEW' THEN 'CALLED_NO_ANSWER'
          ELSE operator_status
        END,
        operator_notes = CASE
          WHEN operator_notes IS NULL OR operator_notes = '' THEN ${notes}
          ELSE operator_notes || E'\n\n' || ${now} || ': ' || ${notes}
        END,
        updated_at = ${now}
      WHERE id = ${params.id}
      RETURNING id, call_attempts, operator_status
    `;

    if (result.length === 0) {
      return NextResponse.json({ error: "Lead negăsit" }, { status: 404 });
    }

    // Create lead event
    await sql`
      INSERT INTO lead_events (lead_id, type, metadata)
      VALUES (${params.id}, 'OPERATOR_CALLED', ${JSON.stringify({ 
        call_attempts: result[0].call_attempts,
        notes: notes || null,
      })})
    `;

    return NextResponse.json({
      success: true,
      call_attempts: result[0].call_attempts,
      operator_status: result[0].operator_status,
    });
  } catch (err) {
    console.error("Error logging call:", err);
    return NextResponse.json(
      { error: "Eroare la înregistrarea apelului" },
      { status: 500 }
    );
  }
}
