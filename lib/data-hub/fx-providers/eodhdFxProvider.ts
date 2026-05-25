import "server-only";
import type { CurrencyCode } from "@/lib/types";
import type { FxProvider, FxProviderResult } from "@/lib/data-hub/fx-providers/types";

const REQUEST_TIMEOUT_MS = 8000;

function createFailure(
  providerId: string,
  providerLabel: string,
  fromCurrency: CurrencyCode,
  toCurrency: CurrencyCode,
  message: string,
): FxProviderResult {
  return {
    success: false,
    providerId,
    providerLabel,
    fromCurrency,
    toCurrency,
    fxPair: `${fromCurrency}${toCurrency}`,
    error: message,
  };
}

function createEodhdProvider(
  providerId: "eodhd-1" | "eodhd-2",
  label: string,
  envKey: "EODHD_API_KEY_1" | "EODHD_API_KEY_2",
  priority: number,
): FxProvider {
  return {
    id: providerId,
    label,
    priority,
    isConfigured: () => Boolean(process.env[envKey]),
    async fetchFxRate(fromCurrency, toCurrency) {
      const apiKey = process.env[envKey];

      if (!apiKey) {
        return createFailure(providerId, label, fromCurrency, toCurrency, `${envKey} not configured.`);
      }

      const pair = `${fromCurrency}${toCurrency}`;
      const url = `https://eodhd.com/api/real-time/${pair}.FOREX?api_token=${apiKey}&fmt=json`;

      try {
        const response = await fetch(url, {
          method: "GET",
          cache: "no-store",
          signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        });

        if (!response.ok) {
          return createFailure(
            providerId,
            label,
            fromCurrency,
            toCurrency,
            `HTTP ${response.status} from EODHD.`,
          );
        }

        const payload = (await response.json()) as Record<string, unknown>;
        const candidate =
          typeof payload.close === "number"
            ? payload.close
            : typeof payload.close === "string"
              ? Number(payload.close)
              : typeof payload.bid === "number" && typeof payload.ask === "number"
                ? (payload.bid + payload.ask) / 2
                : null;

        if (candidate === null || !Number.isFinite(candidate) || candidate <= 0) {
          return createFailure(
            providerId,
            label,
            fromCurrency,
            toCurrency,
            "EODHD returned no valid FX rate.",
          );
        }

        return {
          success: true,
          providerId,
          providerLabel: label,
          fromCurrency,
          toCurrency,
          fxPair: pair,
          rate: candidate,
          quoteDate:
            typeof payload.timestamp === "number"
              ? new Date(payload.timestamp * 1000).toISOString()
              : new Date().toISOString(),
        };
      } catch (error) {
        return createFailure(
          providerId,
          label,
          fromCurrency,
          toCurrency,
          error instanceof Error ? error.message : "Unknown EODHD provider error.",
        );
      }
    },
  };
}

export const eodhdFxProvider1 = createEodhdProvider("eodhd-1", "EODHD-1", "EODHD_API_KEY_1", 1);
export const eodhdFxProvider2 = createEodhdProvider("eodhd-2", "EODHD-2", "EODHD_API_KEY_2", 2);
