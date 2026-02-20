import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

/**
 * GET /api/admin/leads?token=...&status=...&tier=...&city=...&urgency=...&voucher=...&search=...
 * Returns paginated list of leads with filters.
 */
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  const verifyToken = process.env.VERIFY_TOKEN;

  if (!verifyToken || token !== verifyToken) {
    return NextResponse.json({ error: "Neautorizat" }, { status: 403 });
  }

  try {
    const sql = getDb();
    
    // Parse query params
    const status = request.nextUrl.searchParams.get("status");
    const tier = request.nextUrl.searchParams.get("tier");
    const city = request.nextUrl.searchParams.get("city");
    const urgency = request.nextUrl.searchParams.get("urgency");
    const voucher = request.nextUrl.searchParams.get("voucher");
    const search = request.nextUrl.searchParams.get("search");
    const page = parseInt(request.nextUrl.searchParams.get("page") || "1", 10);
    const limit = parseInt(request.nextUrl.searchParams.get("limit") || "100", 10);
    const offset = (page - 1) * limit;

    // Build WHERE conditions
    const conditions: string[] = [];
    const params: unknown[] = [];
    let paramIndex = 1;

    if (status) {
      conditions.push(`l.operator_status = $${paramIndex++}`);
      params.push(status);
    }

    if (tier) {
      conditions.push(`l.lead_tier = $${paramIndex++}`);
      params.push(tier);
    }

    if (city) {
      conditions.push(`LOWER(l.city) LIKE $${paramIndex++}`);
      params.push(`%${city.toLowerCase()}%`);
    }

    if (urgency) {
      conditions.push(`l.urgency_level = $${paramIndex++}`);
      params.push(urgency);
    }

    if (voucher) {
      conditions.push(`l.voucher_status = $${paramIndex++}`);
      params.push(voucher);
    }

    if (search) {
      conditions.push(`(
        LOWER(l.first_name) LIKE $${paramIndex} OR
        LOWER(l.last_name) LIKE $${paramIndex} OR
        LOWER(l.email) LIKE $${paramIndex} OR
        l.phone LIKE $${paramIndex}
      )`);
      params.push(`%${search.toLowerCase()}%`);
      paramIndex++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    // Query leads with clinic info
    const leadsQuery = `
      SELECT 
        l.id,
        l.first_name,
        l.last_name,
        l.phone,
        l.email,
        l.city,
        l.urgency_level,
        l.lead_tier,
        l.operator_status,
        l.voucher_status,
        l.female_age_exact,
        l.best_contact_method,
        l.operator_verified_at,
        l.sent_to_clinic_at,
        l.created_at,
        l.updated_at,
        c.name as clinic_name,
        c.email as clinic_email
      FROM leads l
      LEFT JOIN clinics c ON l.assigned_clinic_id = c.id
      ${whereClause}
      ORDER BY l.updated_at DESC, l.created_at DESC
      LIMIT $${paramIndex++} OFFSET $${paramIndex++}
    `;

    params.push(limit, offset);

    const leads = await sql.query(leadsQuery, params);

    // Count total for pagination
    const countQuery = `
      SELECT COUNT(*) as total
      FROM leads l
      ${whereClause}
    `;
    const countParams = params.slice(0, -2); // Remove limit and offset
    const countResult = await sql.query(countQuery, countParams);
    const total = parseInt(countResult[0]?.total || "0", 10);

    return NextResponse.json({
      leads,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    console.error("Error fetching leads:", err);
    return NextResponse.json(
      { error: "Eroare la încărcarea lead-urilor" },
      { status: 500 }
    );
  }
}
