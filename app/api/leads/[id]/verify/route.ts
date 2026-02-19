import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

function verifyToken(request: NextRequest): boolean {
  const token = request.headers.get("x-verify-token") || request.nextUrl.searchParams.get("token");
  const expectedToken = process.env.VERIFY_TOKEN;
  if (!expectedToken) {
    throw new Error("VERIFY_TOKEN environment variable is not set");
  }
  return token === expectedToken;
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    if (!verifyToken(request)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const leadId = params.id;
    const sql = getDb();

    const now = new Date().toISOString();

    const rows = await sql`
      UPDATE leads
      SET status = 'verified',
          verified_at = ${now},
          phone_verified_at = ${now},
          updated_at = ${now}
      WHERE id = ${leadId}
        AND status = 'new_unverified'
      RETURNING id, status, verified_at, phone_verified_at
    `;

    if (rows.length === 0) {
      return NextResponse.json(
        { error: "Lead not found or already verified/sent" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      lead_id: rows[0].id,
      status: rows[0].status,
      verified_at: rows[0].verified_at,
    });
  } catch (err) {
    console.error("Error in /api/leads/[id]/verify:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 },
    );
  }
}
