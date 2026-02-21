/**
 * Resolves lead identifier from URL to full UUID.
 * Accepts either full UUID (36 chars with dashes) or shortId (e.g. first 8 chars of UUID without dashes).
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function resolveLeadId(sql: any, idParam: string): Promise<string | null> {
  if (!idParam || typeof idParam !== "string") return null;
  const trimmed = idParam.trim();
  // Full UUID format
  if (trimmed.length === 36 && trimmed.includes("-")) {
    return trimmed;
  }
  // Short id (e.g. 8 chars, case-insensitive)
  const pattern = trimmed.replace(/-/g, "").slice(0, 32) + "%";
  const rows = await sql`
    SELECT id FROM leads
    WHERE REPLACE(id::text, '-', '') ILIKE ${pattern}
    LIMIT 1
  `;
  const id = rows[0]?.id;
  return typeof id === "string" ? id : null;
}
