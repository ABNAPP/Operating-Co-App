import { runValuationsBatch } from "@/lib/valuation-persistence/runValuationsBatch";

const payload = JSON.parse(process.argv[2] ?? "{}") as {
  tickers?: string[] | null;
  chunkSize?: number;
  pauseBetweenChunksMs?: number;
  pauseBetweenCompaniesMs?: number;
  refresh?: boolean;
};

async function main() {
  console.info("[valuation-batch] Starting local batch…");

  const summary = await runValuationsBatch({
    tickers: payload.tickers ?? undefined,
    chunkSize: payload.chunkSize,
    pauseBetweenChunksMs: payload.pauseBetweenChunksMs,
    pauseBetweenCompaniesMs: payload.pauseBetweenCompaniesMs,
    refresh: payload.refresh,
  });

  console.info("[valuation-batch] Done.", {
    total: summary.total,
    succeeded: summary.succeeded,
    failed: summary.failed,
    chunkSize: summary.chunkSize,
  });

  if (summary.failed > 0) {
    console.info("[valuation-batch] Failures:");
    for (const row of summary.results.filter((r) => !r.success)) {
      console.info(`  - ${row.cleanTicker}: ${row.error}`);
    }
    process.exit(1);
  }

  process.exit(0);
}

main().catch((error) => {
  console.error("[valuation-batch] Fatal:", error);
  process.exit(1);
});
