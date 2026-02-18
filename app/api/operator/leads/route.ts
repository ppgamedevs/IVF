import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

function verifyToken(request: NextRequest): boolean {
  const token = request.nextUrl.searchParams.get("token");
  const expectedToken = process.env.VERIFY_TOKEN;
  if (!expectedToken) {
    throw new Error("VERIFY_TOKEN environment variable is not set");
  }
  return token === expectedToken;
}

export async function GET(request: NextRequest) {
  try {
    if (!verifyToken(request)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const sql = getDb();

    const leads = await sql`
      SELECT 
        id,
        status,
        created_at,
        city,
        timeline,
        budget_range,
        phone,
        verified_at,
        sent_at
      FROM leads
      ORDER BY created_at DESC
      LIMIT 50
    `;

    return NextResponse.json({ leads });
  } catch (err) {
    console.error("Error in /api/operator/leads:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 },
    );
  }
}
