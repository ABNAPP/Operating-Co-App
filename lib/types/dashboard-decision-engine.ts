import type { CurrencyCode } from "@/lib/types/currency";
import type { MosDecisionOutcome } from "@/lib/types/mos-decision-engine";
import type { ReviewSeverity } from "@/lib/types/review-flags";

export type DashboardDecisionIntegrationReadinessStatus =
  | "Ready"
  | "Review"
  | "Missing"
  | "Not Applicable";

/** Build-status layer for Dashboard decision integration (presentation mapping only). */
export type DashboardDecisionIntegrationLayerStatus = "Foundation" | "Not started";

export type FoundationDecisionOutcomeDisplay = MosDecisionOutcome | "N/A";

export interface DashboardDecisionIntegrationResult {
  status: DashboardDecisionIntegrationReadinessStatus;

  companyId: string;
  cleanTicker: string;
  companyName: string;
  selectedBenchmark: string;
  valuationCurrency: CurrencyCode | null;

  intrinsicValuePerShare: number | null;
  currentPrice: number | null;
  priceCurrency: CurrencyCode | null;

  upsideDownsidePercent: number | null;
  marginOfSafetyPercent: number | null;
  requiredMosPercent: number | null;
  entryPrice: number | null;

  foundationDecisionOutcome: FoundationDecisionOutcomeDisplay;

  reviewSeverity: ReviewSeverity;
  missingInputs: string[];
  warnings: string[];
  sourceNotes: string[];

  dashboardDecisionIntegrationStatus: DashboardDecisionIntegrationLayerStatus;

  /** Traceability — foundation engine statuses used for mapping (not official Dashboard decision). */
  intrinsicFoundationStatus: string | null;
  mosFoundationStatus: string | null;
}
