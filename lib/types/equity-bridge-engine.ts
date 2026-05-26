export type EquityBridgeReadinessStatus = "Ready" | "Review" | "Missing" | "Not Applicable";

export interface EquityBridgeInput {
  companyId: string;
  selectedBenchmark: string;

  valueOfOperatingAssets: number | null;

  cashAndCashEquivalents: number | null;
  nonOperatingAssets: number | null;
  totalDebt: number | null;
  preferredEquity: number | null;
  minorityInterest: number | null;
  otherNonEquityClaims: number | null;

  sourceNotes: string[];
}

export interface EquityBridgeResult {
  valueOfOperatingAssets: number | null;
  totalAdditions: number | null;
  totalDeductions: number | null;
  equityValue: number | null;

  status: EquityBridgeReadinessStatus;
  missingInputs: string[];
  warnings: string[];
  notes: string[];
}
