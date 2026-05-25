import "server-only";
import type { CurrencyCode } from "@/lib/types";
import type { FxProvider, FxProviderResult } from "@/lib/data-hub/fx-providers/types";
import { eodhdFxProvider1, eodhdFxProvider2 } from "@/lib/data-hub/fx-providers/eodhdFxProvider";
import { fmpFxProvider } from "@/lib/data-hub/fx-providers/fmpFxProvider";
import { finnhubFxProvider } from "@/lib/data-hub/fx-providers/finnhubFxProvider";
import { marketstackFxProvider } from "@/lib/data-hub/fx-providers/marketstackFxProvider";
import {
  alphaVantageFxProvider1,
  alphaVantageFxProvider2,
} from "@/lib/data-hub/fx-providers/alphaVantageFxProvider";

export const fxProvidersInPriorityOrder: FxProvider[] = [
  eodhdFxProvider1,
  eodhdFxProvider2,
  fmpFxProvider,
  finnhubFxProvider,
  marketstackFxProvider,
  alphaVantageFxProvider1,
  alphaVantageFxProvider2,
];

export interface FxProviderChainResult {
  success: boolean;
  result?: FxProviderResult;
  providerUsed?: string;
  providerAttempts: string[];
  providerAttemptCount: number;
  providersUsed: string[];
  providersFailed: string[];
  warnings: string[];
  errors: string[];
}

export async function fetchFxRateFromProviderChain(
  fromCurrency: CurrencyCode,
  toCurrency: CurrencyCode,
): Promise<FxProviderChainResult> {
  const providersUsed: string[] = [];
  const providersFailed: string[] = [];
  const providerAttempts: string[] = [];
  const warnings: string[] = [];
  const errors: string[] = [];

  // Sequential provider chain protects limited API quotas by stopping at first success.
  for (const provider of fxProvidersInPriorityOrder) {
    if (!provider.isConfigured()) {
      providersFailed.push(provider.label);
      warnings.push(`${provider.label}: not configured.`);
      continue;
    }

    providersUsed.push(provider.label);
    providerAttempts.push(provider.label);
    const result = await provider.fetchFxRate(fromCurrency, toCurrency);

    if (result.success) {
      return {
        success: true,
        result,
        providerUsed: provider.label,
        providerAttempts,
        providerAttemptCount: providerAttempts.length,
        providersUsed,
        providersFailed,
        warnings,
        errors,
      };
    }

    providersFailed.push(provider.label);

    if (result.warning) {
      warnings.push(`${provider.label}: ${result.warning}`);
    }

    if (result.error) {
      errors.push(`${provider.label}: ${result.error}`);
    }
  }

  return {
    success: false,
    providerUsed: undefined,
    providerAttempts,
    providerAttemptCount: providerAttempts.length,
    providersUsed,
    providersFailed,
    warnings,
    errors,
  };
}
