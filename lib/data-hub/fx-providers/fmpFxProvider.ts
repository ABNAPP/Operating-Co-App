import "server-only";
import type { FxProvider, FxProviderResult } from "@/lib/data-hub/fx-providers/types";

const REQUEST_TIMEOUT_MS = 8000;

export const fmpFxProvider: FxProvider = {
  id: "fmp",
  label: "FMP",
  priority: 3,
  isConfigured: () => Boolean(process.env.FMP_API_KEY),
  async fetchFxRate(fromCurrency, toCurrency): Promise<FxProviderResult> {
    const apiKey = process.env.FMP_API_KEY;
    const fxPair = `${fromCurrency}${toCurrency}`;

    if (!apiKey) {
      return {
        success: false,
        providerId: "fmp",
        providerLabel: "FMP",
        fromCurrency,
        toCurrency,
        fxPair,
        error: "FMP_API_KEY not configured.",
      };
    }

    const url = `https://financialmodelingprep.com/api/v3/quote/${fxPair}?apikey=${apiKey}`;

    try {
      const response = await fetch(url, {
        method: "GET",
        cache: "no-store",
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });

      if (!response.ok) {
        return {
          success: false,
          providerId: "fmp",
          providerLabel: "FMP",
          fromCurrency,
          toCurrency,
          fxPair,
          error: `HTTP ${response.status} from FMP.`,
        };
      }

      const payload = (await response.json()) as Array<Record<string, unknown>>;
      const row = payload[0];

      const rate =
        typeof row?.price === "number"
          ? row.price
          : typeof row?.price === "string"
            ? Number(row.price)
            : null;

      if (rate === null || !Number.isFinite(rate) || rate <= 0) {
        return {
          success: false,
          providerId: "fmp",
          providerLabel: "FMP",
          fromCurrency,
          toCurrency,
          fxPair,
          error: "FMP returned no valid FX rate.",
        };
      }

      return {
        success: true,
        providerId: "fmp",
        providerLabel: "FMP",
        fromCurrency,
        toCurrency,
        fxPair,
        rate,
        quoteDate: new Date().toISOString(),
      };
    } catch (error) {
      return {
        success: false,
        providerId: "fmp",
        providerLabel: "FMP",
        fromCurrency,
        toCurrency,
        fxPair,
        error: error instanceof Error ? error.message : "Unknown FMP provider error.",
      };
    }
  },
};
