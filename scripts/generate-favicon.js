#!/usr/bin/env node
/**
 * Generates app/favicon.ico from app/icon.svg.
 * Run once: node scripts/generate-favicon.js
 * Requires: npm install sharp to-ico --save-dev
 */
const fs = require("fs");
const path = require("path");

async function main() {
  let sharp, toIco;
  try {
    sharp = require("sharp");
    toIco = require("to-ico");
  } catch (e) {
    console.error("Run: npm install sharp to-ico --save-dev");
    process.exit(1);
  }

  const appDir = path.join(process.cwd(), "app");
  const svgPath = path.join(appDir, "icon.svg");
  const outPath = path.join(appDir, "favicon.ico");

  if (!fs.existsSync(svgPath)) {
    console.error("Missing app/icon.svg");
    process.exit(1);
  }

  const pngBuffer = await sharp(svgPath)
    .resize(32, 32)
    .png()
    .toBuffer();

  const icoBuffer = await toIco([pngBuffer]);
  fs.writeFileSync(outPath, icoBuffer);
  console.log("Wrote", outPath);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
