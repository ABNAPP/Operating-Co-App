import type { CurrencyCode } from "@/lib/types";

export interface FxProviderResult {
  success: boolean;
  skipped?: boolean;
  providerId: string;
  providerLabel: string;
  fromCurrency: CurrencyCode;
  toCurrency: CurrencyCode;
  fxPair: string;
  rate?: number;
  quoteDate?: string;
  warning?: string;
  error?: string;
}

export interface FxProvider {
  id: string;
  label: string;
  priority: number;
  isConfigured: () => boolean;
  fetchFxRate: (fromCurrency: CurrencyCode, toCurrency: CurrencyCode) => Promise<FxProviderResult>;
}
