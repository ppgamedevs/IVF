import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { resolveLeadId } from "@/lib/resolve-lead-id";

/**
 * POST /api/admin/leads/[id]/verify?token=...
 * Marks lead as verified. [id] can be full UUID or shortId.
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

    const now = new Date().toISOString();

    const result = await sql`
      UPDATE leads
      SET 
        status = 'verified',
        verified_at = ${now},
        updated_at = ${now}
      WHERE id = ${leadId}
      RETURNING id, status, verified_at
    `;

    if (result.length === 0) {
      return NextResponse.json({ error: "Lead negăsit" }, { status: 404 });
    }

    return NextResponse.json({ success: true, lead: result[0] });
  } catch (err) {
    console.error("Error verifying lead:", err);
    return NextResponse.json(
      { error: "Eroare la verificarea lead-ului" },
      { status: 500 }
    );
  }
}
