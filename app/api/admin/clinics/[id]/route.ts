import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

/**
 * GET /api/admin/clinics/[id]?token=...
 * Returns clinic details.
 */
export async function GET(
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
    const clinics = await sql`
      SELECT id, name, email, city_coverage, active, notes, created_at, updated_at
      FROM clinics
      WHERE id = ${params.id}
    `;

    if (clinics.length === 0) {
      return NextResponse.json({ error: "Clinică negăsită" }, { status: 404 });
    }

    return NextResponse.json({ clinic: clinics[0] });
  } catch (err) {
    console.error("Error fetching clinic:", err);
    return NextResponse.json(
      { error: "Eroare la încărcarea clinicii" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/clinics/[id]?token=...
 * Updates clinic.
 * Body: { name?, email?, city_coverage?, active?, notes? }
 */
export async function PUT(
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
    const { name, email, city_coverage, active, notes } = body;

    const sql = getDb();
    const now = new Date().toISOString();

    // Build update query dynamically
    const updates: string[] = [];
    const params: unknown[] = [];
    let paramIndex = 1;

    if (name !== undefined) {
      updates.push(`name = $${paramIndex++}`);
      params.push(name);
    }
    if (email !== undefined) {
      updates.push(`email = $${paramIndex++}`);
      params.push(email);
    }
    if (city_coverage !== undefined) {
      updates.push(`city_coverage = $${paramIndex++}`);
      params.push(sql.array(city_coverage));
    }
    if (active !== undefined) {
      updates.push(`active = $${paramIndex++}`);
      params.push(active);
    }
    if (notes !== undefined) {
      updates.push(`notes = $${paramIndex++}`);
      params.push(notes);
    }

    if (updates.length === 0) {
      return NextResponse.json(
        { error: "Nu s-au furnizat câmpuri pentru actualizare" },
        { status: 400 }
      );
    }

    updates.push(`updated_at = $${paramIndex++}`);
    params.push(now);
    params.push(params.id); // For WHERE clause

    const query = `
      UPDATE clinics
      SET ${updates.join(", ")}
      WHERE id = $${paramIndex}
      RETURNING id, name, email, city_coverage, active, notes, created_at, updated_at
    `;

    const result = await sql.unsafe(query, params);

    if (result.length === 0) {
      return NextResponse.json({ error: "Clinică negăsită" }, { status: 404 });
    }

    return NextResponse.json({ clinic: result[0] });
  } catch (err) {
    console.error("Error updating clinic:", err);
    return NextResponse.json(
      { error: "Eroare la actualizarea clinicii" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/clinics/[id]?token=...
 * Deletes clinic (soft delete by setting active=false).
 */
export async function DELETE(
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
      UPDATE clinics
      SET active = false, updated_at = ${now}
      WHERE id = ${params.id}
      RETURNING id, name, active
    `;

    if (result.length === 0) {
      return NextResponse.json({ error: "Clinică negăsită" }, { status: 404 });
    }

    return NextResponse.json({ success: true, clinic: result[0] });
  } catch (err) {
    console.error("Error deleting clinic:", err);
    return NextResponse.json(
      { error: "Eroare la ștergerea clinicii" },
      { status: 500 }
    );
  }
}
