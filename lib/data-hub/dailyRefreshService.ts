import { refreshRiskfreeRatesFromFred } from "@/lib/data-hub/riskfreeRefreshService";
import { refreshFxRatesFromProviderPriority as refreshFxFromProviders } from "@/lib/data-hub/fxRefreshService";
import {
  getDailyRefreshStatus,
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

export async function runDailyDataRefresh(): Promise<DailyRefreshSummary> {
  const startedAt = new Date().toISOString();
  const warnings: string[] = [];
  const errors: string[] = [];
  const providersUsed: string[] = [];

  const riskfreeRefresh = await refreshRiskfreeRatesFromFred();
  const fxServiceSummary = await refreshFxFromProviders();

  const riskfreeResult: RefreshStepResult = {
    status: riskfreeRefresh.status,
    provider: "FRED",
    warnings: riskfreeRefresh.warnings,
    errors: riskfreeRefresh.errors,
  };

  const fxResult: RefreshStepResult = {
    status: fxServiceSummary.status,
    provider:
      fxServiceSummary.providersUsed.length > 0
        ? fxServiceSummary.providersUsed.join(", ")
        : "No provider succeeded",
    warnings: fxServiceSummary.warnings,
    errors: fxServiceSummary.errors,
  };

  providersUsed.push(riskfreeResult.provider);
  providersUsed.push(...fxServiceSummary.providersUsed);
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
    status: success
      ? "Riskfree + FX Refreshed"
      : "Daily Refresh Completed With Errors",
    fxLastAttemptAt: fxServiceSummary.finishedAt,
    fxLastSuccessfulRefreshAt: fxServiceSummary.lastSuccessfulRefresh ?? undefined,
    fxProvidersUsed: fxServiceSummary.providersUsed,
    fxProviderUsed: fxServiceSummary.providersUsed[0] ?? undefined,
    fxWarnings: fxServiceSummary.warnings,
    fxErrors: fxServiceSummary.errors,
    fxProviderAttempts: fxServiceSummary.providerAttempts,
    fxUpdatedCount: fxServiceSummary.updated,
    fxSkippedCount: fxServiceSummary.skipped,
    fxStalePreservedCount: fxServiceSummary.stalePreserved,
    fxManualOverrideCount: fxServiceSummary.manualOverride,
    fxSameCurrencyCount: fxServiceSummary.sameCurrency,
    fxInverseDerivedCount: fxServiceSummary.inverseDerived,
    riskfreeLastAttemptAt: finishedAt,
    riskfreeLastSuccessfulRefreshAt: riskfreeRefresh.lastSuccessfulRefresh ?? undefined,
  };

  try {
    await upsertDailyRefreshStatus(statusDoc);
  } catch {
    warnings.push("Could not persist daily refresh status document.");
  }

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
