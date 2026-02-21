import { NextResponse } from "next/server";

/**
 * IndexNow key file (Option 2 with keyLocation).
 * Served at /indexnow-key.txt so keyLocation = https://fivmatch.ro/indexnow-key.txt
 * and we can submit any URL on the host (path prefix is /).
 * Key: 8–128 chars, [a-zA-Z0-9-]. Set INDEXNOW_KEY in env.
 */
export async function GET() {
  const key = process.env.INDEXNOW_KEY;
  if (!key || key.length < 8 || key.length > 128 || !/^[a-zA-Z0-9-]+$/.test(key)) {
    return new NextResponse(null, { status: 404 });
  }
  return new NextResponse(key, {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
