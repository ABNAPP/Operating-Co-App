#!/usr/bin/env node
/**
 * Local batch valuation runner (Firebase Spark / no Cloud Functions).
 *
 * Runs the full foundation pipeline per company and writes
 * valuationResults + dashboardRows via Firebase Admin.
 *
 * Usage:
 *   node scripts/run-all-valuations-batch.mjs
 *   node scripts/run-all-valuations-batch.mjs --tickers MSFT,AAPL
 *   node scripts/run-all-valuations-batch.mjs --chunk 5 --pause-chunk 5000 --pause-company 1000
 *
 * Requires .env.local with Firebase Admin + (optional) NEXT_PUBLIC_* for client fallback reads.
 */

import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { loadEnvLocal } from "./load-env-local.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, "..");

loadEnvLocal(projectRoot);

function parseArgs(argv) {
  const options = {
    tickers: null,
    chunkSize: 5,
    pauseChunkMs: 4000,
    pauseCompanyMs: 800,
    refresh: true,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--tickers" && argv[i + 1]) {
      options.tickers = argv[i + 1]
        .split(",")
        .map((t) => t.trim().toUpperCase())
        .filter(Boolean);
      i += 1;
    } else if (arg === "--chunk" && argv[i + 1]) {
      options.chunkSize = Number(argv[i + 1]);
      i += 1;
    } else if (arg === "--pause-chunk" && argv[i + 1]) {
      options.pauseChunkMs = Number(argv[i + 1]);
      i += 1;
    } else if (arg === "--pause-company" && argv[i + 1]) {
      options.pauseCompanyMs = Number(argv[i + 1]);
      i += 1;
    } else if (arg === "--no-refresh") {
      options.refresh = false;
    } else if (arg === "--help" || arg === "-h") {
      options.help = true;
    }
  }

  return options;
}

const args = parseArgs(process.argv.slice(2));

if (args.help) {
  console.log(`
Local valuation batch (Spark-safe)

  node scripts/run-all-valuations-batch.mjs
  node scripts/run-all-valuations-batch.mjs --tickers MSFT,AAPL
  node scripts/run-all-valuations-batch.mjs --chunk 5 --pause-chunk 5000

Options:
  --tickers A,B,C   Only these cleanTickers (default: all companies in Firestore)
  --chunk N         Companies per chunk (max 10, default 5)
  --pause-chunk MS  Pause between chunks (default 4000)
  --pause-company MS Pause between companies in a chunk (default 800)
  --no-refresh      Reuse in-memory foundation cache if warm (not recommended for batch)

Requires Firebase Admin vars in .env.local.
`);
  process.exit(0);
}

const runnerPath = resolve(projectRoot, "scripts", "run-all-valuations-batch-runner.ts");

const child = spawn(
  "npx",
  [
    "-y",
    "tsx",
    runnerPath,
    JSON.stringify({
      tickers: args.tickers,
      chunkSize: args.chunkSize,
      pauseBetweenChunksMs: args.pauseChunkMs,
      pauseBetweenCompaniesMs: args.pauseCompanyMs,
      refresh: args.refresh,
    }),
  ],
  {
    cwd: projectRoot,
    stdio: "inherit",
    env: process.env,
    shell: true,
  },
);

child.on("exit", (code) => {
  process.exit(code ?? 1);
});
