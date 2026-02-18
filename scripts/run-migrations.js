/**
 * Runs all migration-*.sql files in order against DATABASE_URL.
 * Safe to run on every deploy (migrations use IF NOT EXISTS).
 * Skips if DATABASE_URL is not set (e.g. CI without DB).
 */
const fs = require("fs");
const path = require("path");

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.log("run-migrations: DATABASE_URL not set, skipping.");
  process.exit(0);
}

async function main() {
  const { neon } = require("@neondatabase/serverless");
  const sql = neon(DATABASE_URL);
  const scriptsDir = path.join(__dirname);
  const files = fs
    .readdirSync(scriptsDir)
    .filter((f) => f.startsWith("migration-") && f.endsWith(".sql"))
    .sort();

  for (const file of files) {
    const filePath = path.join(scriptsDir, file);
    const content = fs.readFileSync(filePath, "utf8");
    // Remove single-line comments and empty lines; keep statements
    const statements = content
      .split("\n")
      .filter((line) => !line.trim().startsWith("--"))
      .join("\n")
      .split(";")
      .map((s) => s.trim())
      .filter(Boolean);

    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i] + ";";
      try {
        await sql`${sql.unsafe(stmt)}`;
      } catch (err) {
        console.error(`run-migrations: ${file} statement ${i + 1} failed:`, err.message);
        throw err;
      }
    }
    console.log("run-migrations: applied", file);
  }
  console.log("run-migrations: done.");
}

main().catch((err) => {
  console.error("run-migrations:", err);
  process.exit(1);
});
