#!/usr/bin/env node
/**
 * Ping IndexNow (Bing, Yandex, etc.) with your site URLs so they recrawl faster.
 * Run after deploy or when content changes. Requires INDEXNOW_KEY and NEXT_PUBLIC_SITE_URL.
 *
 * Usage:
 *   INDEXNOW_KEY=your-key NEXT_PUBLIC_SITE_URL=https://fivmatch.ro node scripts/ping-indexnow.js
 * Or set env in .env.local and run: node scripts/ping-indexnow.js
 *
 * Key: 8–128 chars, [a-zA-Z0-9-]. Generate one: node -e "console.log(require('crypto').randomBytes(16).toString('hex'))"
 */

const INDEXNOW_ENDPOINT = "https://api.indexnow.org/indexnow";

function loadEnvLocal() {
  try {
    const fs = require("fs");
    const path = require("path");
    const p = path.join(process.cwd(), ".env.local");
    if (fs.existsSync(p)) {
      const content = fs.readFileSync(p, "utf8");
      for (const line of content.split("\n")) {
        const m = line.match(/^\s*([^#=]+)=(.*)$/);
        if (m) {
          const k = m[1].trim();
          const v = m[2].trim().replace(/^["']|["']$/g, "");
          if (!process.env[k]) process.env[k] = v;
        }
      }
    }
  } catch (_) {}
}

loadEnvLocal();

const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL || "https://fivmatch.ro").replace(/\/$/, "");
const key = process.env.INDEXNOW_KEY;

if (!key || key.length < 8 || key.length > 128) {
  console.error("Set INDEXNOW_KEY (8–128 chars, [a-zA-Z0-9-]). Generate: node -e \"console.log(require('crypto').randomBytes(16).toString('hex'))\"");
  process.exit(1);
}

const locales = ["ro", "en"];
const paths = ["", "cookies", "privacy", "terms", "thank-you", "operator"];
const urlList = [];
for (const locale of locales) {
  for (const p of paths) {
    const segment = p ? `/${p}` : "";
    urlList.push(`${siteUrl}/${locale}${segment}`);
  }
}

const body = {
  host: new URL(siteUrl).hostname,
  key,
  keyLocation: `${siteUrl}/indexnow-key.txt`,
  urlList,
};

async function main() {
  console.log("IndexNow: submitting", urlList.length, "URLs to", INDEXNOW_ENDPOINT);
  const res = await fetch(INDEXNOW_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify(body),
  });
  if (res.ok) {
    console.log("IndexNow: OK", res.status);
  } else {
    console.error("IndexNow: error", res.status, await res.text());
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
