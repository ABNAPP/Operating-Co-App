import type { CurrencyCode } from "@/lib/types/currency";
import type { IntrinsicValueReadinessStatus } from "@/lib/types/intrinsic-value-engine";

export type MosDecisionReadinessStatus = "Ready" | "Review" | "Missing" | "Not Applicable";

export interface MosDecisionInput {
  companyId: string;
  selectedBenchmark: string;

  intrinsicValuePerShare: number | null;
  intrinsicValueCurrency: CurrencyCode | null;
  intrinsicStatus: IntrinsicValueReadinessStatus | null;

  currentSharePrice: number | null;
  priceCurrency: CurrencyCode | null;

  /** If trading currency != valuation currency, this allows conversion for MOS math. */
  fxRateToValuationCurrency: number | null;

  requiredMOS: number | null;
  requiredMOSSource: string | null;

  sourceNotes: string[];
}

export type MosDecisionOutcome = "Above Required MOS" | "Below Required MOS";

export interface MosDecisionResult {
  upsideDownsidePercent: number | null;
  marginOfSafetyPercent: number | null;
  entryPrice: number | null;
  decisionOutcome: MosDecisionOutcome | null;

  status: MosDecisionReadinessStatus;
  missingInputs: string[];
  warnings: string[];
  notes: string[];
}