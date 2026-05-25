import "server-only";
import type { FxProvider, FxProviderResult } from "@/lib/data-hub/fx-providers/types";

const REQUEST_TIMEOUT_MS = 8000;

interface FinnhubForexResponse {
  base?: string;
  quote?: Record<string, number>;
  error?: string;
}

export const finnhubFxProvider: FxProvider = {
  id: "finnhub",
  label: "Finnhub",
  priority: 4,
  isConfigured: () => Boolean(process.env.FINNHUB_API_KEY),
  async fetchFxRate(fromCurrency, toCurrency): Promise<FxProviderResult> {
    const apiKey = process.env.FINNHUB_API_KEY;
    const fxPair = `${fromCurrency}${toCurrency}`;

    if (!apiKey) {
      return {
        success: false,
        providerId: "finnhub",
        providerLabel: "Finnhub",
        fromCurrency,
        toCurrency,
        fxPair,
        error: "FINNHUB_API_KEY not configured.",
      };
    }

    const url = `https://finnhub.io/api/v1/forex/rates?base=${fromCurrency}&token=${apiKey}`;

    try {
      const response = await fetch(url, {
        method: "GET",
        cache: "no-store",
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });

      if (!response.ok) {
        return {
          success: false,
          providerId: "finnhub",
          providerLabel: "Finnhub",
          fromCurrency,
          toCurrency,
          fxPair,
          error: `HTTP ${response.status} from Finnhub.`,
        };
      }

      const payload = (await response.json()) as FinnhubForexResponse;

      if (payload.error) {
        return {
          success: false,
          providerId: "finnhub",
          providerLabel: "Finnhub",
          fromCurrency,
          toCurrency,
          fxPair,
          error: payload.error,
        };
      }

      const rate = payload.quote?.[toCurrency];

      if (!Number.isFinite(rate) || !rate || rate <= 0) {
        return {
          success: false,
          providerId: "finnhub",
          providerLabel: "Finnhub",
          fromCurrency,
          toCurrency,
          fxPair,
          error: "Finnhub returned no valid FX quote for target currency.",
        };
      }

      return {
        success: true,
        providerId: "finnhub",
        providerLabel: "Finnhub",
        fromCurrency,
        toCurrency,
        fxPair,
        rate,
        quoteDate: new Date().toISOString(),
      };
    } catch (error) {
      return {
        success: false,
        providerId: "finnhub",
        providerLabel: "Finnhub",
        fromCurrency,
        toCurrency,
        fxPair,
        error: error instanceof Error ? error.message : "Unknown Finnhub provider error.",
      };
    }
  },
};
