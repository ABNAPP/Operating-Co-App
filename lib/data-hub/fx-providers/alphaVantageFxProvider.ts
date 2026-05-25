import "server-only";
import type { CurrencyCode } from "@/lib/types";
import type { FxProvider, FxProviderResult } from "@/lib/data-hub/fx-providers/types";

const REQUEST_TIMEOUT_MS = 8000;

interface AlphaVantageResponse {
  Information?: string;
  Note?: string;
  "Realtime Currency Exchange Rate"?: {
    "5. Exchange Rate"?: string;
    "6. Last Refreshed"?: string;
  };
}

function createAlphaProvider(
  providerId: "alpha-vantage-1" | "alpha-vantage-2",
  label: string,
  envKey: "ALPHA_VANTAGE_API_KEY_1" | "ALPHA_VANTAGE_API_KEY_2",
  priority: number,
): FxProvider {
  return {
    id: providerId,
    label,
    priority,
    isConfigured: () => Boolean(process.env[envKey]),
    async fetchFxRate(fromCurrency: CurrencyCode, toCurrency: CurrencyCode): Promise<FxProviderResult> {
      const apiKey = process.env[envKey];
      const fxPair = `${fromCurrency}${toCurrency}`;

      if (!apiKey) {
        return {
          success: false,
          providerId,
          providerLabel: label,
          fromCurrency,
          toCurrency,
          fxPair,
          error: `${envKey} not configured.`,
        };
      }

      const params = new URLSearchParams({
        function: "CURRENCY_EXCHANGE_RATE",
        from_currency: fromCurrency,
        to_currency: toCurrency,
        apikey: apiKey,
      });

      try {
        const response = await fetch(
          `https://www.alphavantage.co/query?${params.toString()}`,
          {
            method: "GET",
            cache: "no-store",
            signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
          },
        );

        if (!response.ok) {
          return {
            success: false,
            providerId,
            providerLabel: label,
            fromCurrency,
            toCurrency,
            fxPair,
            error: `HTTP ${response.status} from Alpha Vantage.`,
          };
        }

        const payload = (await response.json()) as AlphaVantageResponse;

        if (payload.Information || payload.Note) {
          return {
            success: false,
            providerId,
            providerLabel: label,
            fromCurrency,
            toCurrency,
            fxPair,
            error: payload.Information ?? payload.Note ?? "Alpha Vantage rate limited.",
          };
        }

        const rawRate = payload["Realtime Currency Exchange Rate"]?.["5. Exchange Rate"];
        const rate = rawRate ? Number(rawRate) : NaN;

        if (!Number.isFinite(rate) || rate <= 0) {
          return {
            success: false,
            providerId,
            providerLabel: label,
            fromCurrency,
            toCurrency,
            fxPair,
            error: "Alpha Vantage returned no valid exchange rate.",
          };
        }

        return {
          success: true,
          providerId,
          providerLabel: label,
          fromCurrency,
          toCurrency,
          fxPair,
          rate,
          quoteDate:
            payload["Realtime Currency Exchange Rate"]?.["6. Last Refreshed"] ??
            new Date().toISOString(),
        };
      } catch (error) {
        return {
          success: false,
          providerId,
          providerLabel: label,
          fromCurrency,
          toCurrency,
          fxPair,
          error:
            error instanceof Error
              ? error.message
              : "Unknown Alpha Vantage provider error.",
        };
      }
    },
  };
}

export const alphaVantageFxProvider1 = createAlphaProvider(
  "alpha-vantage-1",
  "Alpha Vantage-1",
  "ALPHA_VANTAGE_API_KEY_1",
  6,
);
export const alphaVantageFxProvider2 = createAlphaProvider(
  "alpha-vantage-2",
  "Alpha Vantage-2",
  "ALPHA_VANTAGE_API_KEY_2",
  7,
);
