import type { CurrencyCode } from "@/lib/types/currency";

export type IntrinsicValueReadinessStatus = "Ready" | "Review" | "Missing" | "Not Applicable";

export type ShareCountUnit = "millions" | "absolute";

/** Explicit mock/scaffold share-count inputs — not live company data. */
export interface CompanyIntrinsicValueFoundationInputs {
  selectedDilutedShares: number;
  shareUnit: ShareCountUnit;
  selectedSharesSource: string;
  currentSharePrice?: number | null;
  priceCurrency?: CurrencyCode | null;
  fxRateToValuationCurrency?: number | null;
  notes?: string;
}

export interface IntrinsicValueInput {
  companyId: string;
  selectedBenchmark: string;

  equityValue: number | null;
  equityValueCurrency: CurrencyCode | null;

  selectedDilutedShares: number | null;
  shareUnit: ShareCountUnit | null;
  selectedSharesSource: string | null;

  currentSharePrice: number | null;
  priceCurrency: CurrencyCode | null;
  fxRateToValuationCurrency: number | null;

  sourceNotes: string[];
}

export interface IntrinsicValueResult {
  intrinsicValuePerShare: number | null;
  valuationCurrency: CurrencyCode | null;
  selectedDilutedShares: number | null;
  shareUnit: ShareCountUnit | null;
  selectedSharesSource: string | null;

  status: IntrinsicValueReadinessStatus;
  missingInputs: string[];
  warnings: string[];
  notes: string[];
}
