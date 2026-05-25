import "server-only";
import type { FxProvider } from "@/lib/data-hub/fx-providers/types";

export const marketstackFxProvider: FxProvider = {
  id: "marketstack",
  label: "MarketStack",
  priority: 5,
  isConfigured: () => Boolean(process.env.MARKETSTACK_API_KEY),
  async fetchFxRate(fromCurrency, toCurrency) {
    return {
      success: false,
      skipped: true,
      providerId: "marketstack",
      providerLabel: "MarketStack",
      fromCurrency,
      toCurrency,
      fxPair: `${fromCurrency}${toCurrency}`,
      warning: "Provider skipped: FX endpoint support is not finalized for this phase.",
    };
  },
};
