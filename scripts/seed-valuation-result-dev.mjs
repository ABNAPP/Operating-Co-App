#!/usr/bin/env node
/**
 * Calls POST /api/dev/seed-valuation-result on a running dev server.
 *
 * Usage:
 *   node scripts/seed-valuation-result-dev.mjs
 *   node scripts/seed-valuation-result-dev.mjs MSFT
 *
 * Requires CRON_SECRET in environment (or .env.local loaded by your shell).
 */

const ticker = process.argv[2]?.trim().toUpperCase() || "MSFT";
const baseUrl = process.env.SEED_BASE_URL ?? "http://localhost:3000";
const cronSecret = process.env.CRON_SECRET;

if (!cronSecret) {
  console.error("CRON_SECRET is not set. Export it or load from .env.local.");
  process.exit(1);
}

const url = `${baseUrl}/api/dev/seed-valuation-result`;

const response = await fetch(url, {
  method: "POST",
  headers: {
    Authorization: `Bearer ${cronSecret}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({ cleanTicker: ticker, refresh: true }),
});

const payload = await response.json();
console.log(JSON.stringify(payload, null, 2));

if (!response.ok || !payload.success) {
  process.exit(1);
}
