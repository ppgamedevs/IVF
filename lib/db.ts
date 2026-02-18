import { neon } from "@neondatabase/serverless";

/**
 * Returns a Neon SQL query function.
 * Uses the pooled connection string from the DATABASE_URL env var.
 * Safe to call per-request in serverless environments.
 */
export function getDb() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error(
      "Missing DATABASE_URL environment variable. Add it to .env.local or your Vercel project settings."
    );
  }

  return neon(databaseUrl);
}
