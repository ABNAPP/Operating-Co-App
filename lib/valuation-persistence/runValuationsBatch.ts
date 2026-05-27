import "server-only";

import { COLLECTIONS } from "@/lib/firestore/collections";
import { getAdminDb, isFirebaseAdminConfigured } from "@/lib/firebase/admin";
import { getCompanies } from "@/lib/firestore/repositories/companiesRepository";
import { mockCompanies } from "@/lib/mock-companies";
import {
  DEFAULT_DEV_SEED_TICKER,
  seedSingleCompanyValuation,
  type SeedSingleCompanyValuationResult,
} from "@/lib/valuation-persistence/seedSingleCompanyValuation";

export type RunValuationsBatchOptions = {
  /** If omitted, all companies from Firestore (or mock fallback). */
  tickers?: string[];
  chunkSize?: number;
  /** Pause between chunks (ms). */
  pauseBetweenChunksMs?: number;
  /** Pause between companies within a chunk (ms). */
  pauseBetweenCompaniesMs?: number;
  refresh?: boolean;
};

export type RunValuationsBatchSummary = {
  success: boolean;
  total: number;
  succeeded: number;
  failed: number;
  skipped: number;
  chunkSize: number;
  pauseBetweenChunksMs: number;
  results: Array<{
    cleanTicker: string;
    success: boolean;
    officialIntrinsicValuePerShare: number | null;
    error: string | null;
  }>;
};

const DEFAULT_CHUNK_SIZE = 5;
const DEFAULT_PAUSE_BETWEEN_CHUNKS_MS = 4000;
const DEFAULT_PAUSE_BETWEEN_COMPANIES_MS = 800;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function resolveTickerList(explicit?: string[]): Promise<string[]> {
  if (explicit && explicit.length > 0) {
    return explicit.map((t) => t.trim().toUpperCase()).filter(Boolean);
  }

  if (isFirebaseAdminConfigured()) {
    const db = getAdminDb();
    if (db) {
      try {
        const snapshot = await db.collection(COLLECTIONS.companies).get();
        const tickers = snapshot.docs
          .map((doc) => {
            const data = doc.data() as { identity?: { cleanTicker?: string } };
            return data.identity?.cleanTicker ?? doc.id;
          })
          .filter(Boolean)
          .map((t) => t.toUpperCase());

        if (tickers.length > 0) {
          return [...new Set(tickers)].sort();
        }
      } catch {
        // Fall through to client/mock list.
      }
    }
  }

  const { data: companies } = await getCompanies();
  const fromRepo = companies.map((c) => c.identity.cleanTicker.toUpperCase());
  if (fromRepo.length > 0) {
    return [...new Set(fromRepo)].sort();
  }

  return mockCompanies.map((c) => c.identity.cleanTicker.toUpperCase()).sort();
}

/**
 * Local batch orchestrator (Spark-safe): processes companies in small chunks with pauses.
 * Writes `valuationResults` + `dashboardRows` via Firebase Admin per company.
 */
export async function runValuationsBatch(
  options?: RunValuationsBatchOptions,
): Promise<RunValuationsBatchSummary> {
  const chunkSize = Math.max(1, Math.min(options?.chunkSize ?? DEFAULT_CHUNK_SIZE, 10));
  const pauseBetweenChunksMs = options?.pauseBetweenChunksMs ?? DEFAULT_PAUSE_BETWEEN_CHUNKS_MS;
  const pauseBetweenCompaniesMs =
    options?.pauseBetweenCompaniesMs ?? DEFAULT_PAUSE_BETWEEN_COMPANIES_MS;
  const refresh = options?.refresh !== false;

  const tickers = await resolveTickerList(options?.tickers);

  if (tickers.length === 0) {
    return {
      success: false,
      total: 0,
      succeeded: 0,
      failed: 0,
      skipped: 0,
      chunkSize,
      pauseBetweenChunksMs,
      results: [],
    };
  }

  const results: RunValuationsBatchSummary["results"] = [];
  let succeeded = 0;
  let failed = 0;

  for (let chunkStart = 0; chunkStart < tickers.length; chunkStart += chunkSize) {
    const chunk = tickers.slice(chunkStart, chunkStart + chunkSize);
    const chunkIndex = Math.floor(chunkStart / chunkSize) + 1;
    const chunkCount = Math.ceil(tickers.length / chunkSize);

    console.info(
      `[valuation-batch] Chunk ${chunkIndex}/${chunkCount} (${chunk.join(", ")})`,
    );

    for (let i = 0; i < chunk.length; i += 1) {
      const cleanTicker = chunk[i]!;
      try {
        const seedResult: SeedSingleCompanyValuationResult = await seedSingleCompanyValuation({
          cleanTicker,
          refresh,
        });

        const ok = seedResult.success;
        if (ok) {
          succeeded += 1;
        } else {
          failed += 1;
        }

        results.push({
          cleanTicker,
          success: ok,
          officialIntrinsicValuePerShare: seedResult.officialIntrinsicValuePerShare,
          error: seedResult.errors[0] ?? seedResult.firestore.error,
        });

        console.info(
          `[valuation-batch] ${cleanTicker}: ${ok ? "OK" : "FAIL"} IV=${seedResult.officialIntrinsicValuePerShare ?? "N/A"}`,
        );
      } catch (error) {
        failed += 1;
        const message = error instanceof Error ? error.message : "Unknown batch error.";
        results.push({
          cleanTicker,
          success: false,
          officialIntrinsicValuePerShare: null,
          error: message,
        });
        console.error(`[valuation-batch] ${cleanTicker}: ERROR ${message}`);
      }

      if (i < chunk.length - 1 && pauseBetweenCompaniesMs > 0) {
        await sleep(pauseBetweenCompaniesMs);
      }
    }

    const hasMore = chunkStart + chunkSize < tickers.length;
    if (hasMore && pauseBetweenChunksMs > 0) {
      console.info(`[valuation-batch] Pausing ${pauseBetweenChunksMs}ms before next chunk…`);
      await sleep(pauseBetweenChunksMs);
    }
  }

  return {
    success: failed === 0,
    total: tickers.length,
    succeeded,
    failed,
    skipped: 0,
    chunkSize,
    pauseBetweenChunksMs,
    results,
  };
}

export { DEFAULT_DEV_SEED_TICKER };
