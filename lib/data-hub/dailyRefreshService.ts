import { getFirestoreDbSafe } from "@/lib/firebase/client";
import {
  getSelectedFxRate,
  getSelectedRiskfreeRate,
} from "@/lib/data-hub/rateSelectors";
import {
  getDailyRefreshStatus,
  getFxRates,
  getRiskfreeRates,
  upsertDailyRefreshStatus,
} from "@/lib/firestore/repositories/referenceDataRepository";
import type { DailyRefreshStatus } from "@/lib/types";

interface RefreshStepResult {
  status: string;
  provider: string;
  warnings: string[];
  errors: string[];
}

export interface DailyRefreshSummary {
  success: boolean;
  startedAt: string;
  finishedAt: string;
  riskfreeRefreshStatus: string;
  fxRefreshStatus: string;
  providersUsed: string[];
  warnings: string[];
  errors: string[];
}

async function refreshRiskfreeRatesFromFred(): Promise<RefreshStepResult> {
  const { data: riskfreeRows } = await getRiskfreeRates();

  // Phase 4A: cache-first/idempotent structure only, no provider call yet.
  for (const row of riskfreeRows) {
    getSelectedRiskfreeRate(row);
  }

  return {
    status: "Configured / Pending Phase 4B",
    provider: "FRED (planned)",
    warnings: ["No live FRED call executed in Phase 4A."],
    errors: [],
  };
}

async function refreshFxRatesFromProviderPriority(): Promise<RefreshStepResult> {
  const { data: fxRows } = await getFxRates();

  // Phase 4A: cache-first/idempotent structure only, no provider call yet.
  for (const row of fxRows) {
    getSelectedFxRate(row);
  }

  return {
    status: "Configured / Pending Phase 4B",
    provider:
      "EODHD-1 > EODHD-2 > FMP > Finnhub > MarketStack > Alpha Vantage-1 > Alpha Vantage-2 > Manual Override/Cache (planned)",
    warnings: ["No live FX provider call executed in Phase 4A."],
    errors: [],
  };
}

export async function runDailyDataRefresh(): Promise<DailyRefreshSummary> {
  const startedAt = new Date().toISOString();
  const warnings: string[] = [];
  const errors: string[] = [];
  const providersUsed: string[] = [];

  if (!getFirestoreDbSafe()) {
    const finishedAt = new Date().toISOString();
    return {
      success: false,
      startedAt,
      finishedAt,
      riskfreeRefreshStatus: "Firestore Not Initialized",
      fxRefreshStatus: "Firestore Not Initialized",
      providersUsed: [],
      warnings: ["Firestore client unavailable. Mock fallback remains active."],
      errors: ["Daily refresh orchestration requires initialized Firestore client."],
    };
  }

  const [riskfreeResult, fxResult] = await Promise.all([
    refreshRiskfreeRatesFromFred(),
    refreshFxRatesFromProviderPriority(),
  ]);

  providersUsed.push(riskfreeResult.provider, fxResult.provider);
  warnings.push(...riskfreeResult.warnings, ...fxResult.warnings);
  errors.push(...riskfreeResult.errors, ...fxResult.errors);

  const previousStatus = await getDailyRefreshStatus();
  const finishedAt = new Date().toISOString();
  const success = errors.length === 0;

  const statusDoc: DailyRefreshStatus = {
    startedAt,
    finishedAt,
    success,
    riskfreeRefreshStatus: riskfreeResult.status,
    fxRefreshStatus: fxResult.status,
    providersUsed,
    warnings,
    errors,
    lastSuccessfulRefreshAt: success
      ? finishedAt
      : previousStatus.data.lastSuccessfulRefreshAt,
    source: "vercel-cron-daily",
    status: success ? "Configured / Pending Phase 4B" : "Failed",
  };

  await upsertDailyRefreshStatus(statusDoc);

  return {
    success,
    startedAt,
    finishedAt,
    riskfreeRefreshStatus: riskfreeResult.status,
    fxRefreshStatus: fxResult.status,
    providersUsed,
    warnings,
    errors,
  };
}
