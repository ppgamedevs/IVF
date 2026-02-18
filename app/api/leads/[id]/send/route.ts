import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { sendLeadEmails } from "@/lib/email";

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

    // Fetch lead - must be verified and not already sent
    const leadRows = await sql`
      SELECT 
        id, first_name, last_name, phone, email,
        age_range, tried_ivf, timeline, budget_range, city,
        message, gdpr_consent, locale, ip_hash,
        intent_level, status, created_at
      FROM leads
      WHERE id = ${leadId}
        AND status = 'verified'
    `;

    if (leadRows.length === 0) {
      return NextResponse.json(
        { error: "Lead not found or not verified" },
        { status: 404 },
      );
    }

    const lead = leadRows[0];

    // Check if already sent
    if (lead.status !== "verified") {
      return NextResponse.json(
        { error: "Lead already sent or invalid status" },
        { status: 400 },
      );
    }

    // Prepare lead payload for email
    const leadPayload = {
      first_name: lead.first_name,
      last_name: lead.last_name,
      phone: lead.phone,
      email: lead.email,
      age_range: lead.age_range,
      tried_ivf: lead.tried_ivf,
      timeline: lead.timeline,
      budget_range: lead.budget_range,
      city: lead.city,
      message: lead.message || undefined,
      gdpr_consent: lead.gdpr_consent,
      locale: lead.locale as "ro" | "en",
    };

    // Send email to clinic using existing routing
    const now = new Date().toISOString();
    const userAgent = request.headers.get("user-agent") || "unknown";

    await sendLeadEmails({
      lead: leadPayload,
      leadId: lead.id,
      submittedAt: lead.created_at,
      intentLevel: lead.intent_level as "high" | "medium" | "low",
      ipHash: lead.ip_hash || "",
      userAgent: userAgent.slice(0, 500),
    });

    // Update status to sent_to_clinic and stop nurture emails
    const updateRows = await sql`
      UPDATE leads
      SET status = 'sent_to_clinic',
          sent_at = ${now},
          updated_at = ${now},
          nurture_completed = true
      WHERE id = ${leadId}
      RETURNING id, status, sent_at
    `;

    return NextResponse.json({
      success: true,
      lead_id: updateRows[0].id,
      status: updateRows[0].status,
      sent_at: updateRows[0].sent_at,
    });
  } catch (err) {
    console.error("Error in /api/leads/[id]/send:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 },
    );
  }
}
