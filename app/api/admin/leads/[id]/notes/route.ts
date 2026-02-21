import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { resolveLeadId } from "@/lib/resolve-lead-id";

/**
 * POST /api/admin/leads/[id]/notes?token=...
 * Updates operator notes for a lead. [id] can be full UUID or shortId.
 * Body: { notes: string }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  const token = request.nextUrl.searchParams.get("token");
  const verifyToken = process.env.VERIFY_TOKEN;

  if (!verifyToken || token !== verifyToken) {
    return NextResponse.json({ error: "Neautorizat" }, { status: 403 });
  }

  try {
    const sql = getDb();
    const resolved = await Promise.resolve(params);
    const leadId = await resolveLeadId(sql, resolved.id ?? "");
    if (!leadId) {
      return NextResponse.json({ error: "Lead negăsit" }, { status: 404 });
    }

    const body = await request.json();
    const { notes } = body;

    const now = new Date().toISOString();

    const result = await sql`
      UPDATE leads
      SET 
        operator_notes = ${notes || null},
        notes = ${notes || null},
        updated_at = ${now}
      WHERE id = ${leadId}
      RETURNING id, operator_notes, notes
    `;

    if (result.length === 0) {
      return NextResponse.json({ error: "Lead negăsit" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      operator_notes: result[0].operator_notes,
    });
  } catch (err) {
    console.error("Error updating notes:", err);
    return NextResponse.json(
      { error: "Eroare la actualizarea notelor" },
      { status: 500 }
    );
  }
}
