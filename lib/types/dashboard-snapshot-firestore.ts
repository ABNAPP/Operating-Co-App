/**
 * Firestore contract: `dashboardRows/{cleanTicker}`
 *
 * Denormalized, list-optimized view for the Dashboard home table.
 * One `getDocs()` / `onSnapshot()` on this collection must be enough to render
 * all rows without running valuation engines.
 *
 * Written atomically with `valuationResults/{cleanTicker}` by the compute worker.
 *
 * @see docs/firestore-valuation-schema.md
 */

import type { CurrencyCode } from "@/lib/types/currency";
import type {
  DashboardDecisionIntegrationLayerStatus,
  DashboardDecisionIntegrationReadinessStatus,
  FoundationDecisionOutcomeDisplay,
} from "@/lib/types/dashboard-decision-engine";
import type { ReviewSeverity } from "@/lib/types/review-flags";

export const DASHBOARD_SNAPSHOT_SCHEMA_VERSION = "dashboard-snapshot-v1" as const;

export type DashboardSnapshotSchemaVersion = typeof DASHBOARD_SNAPSHOT_SCHEMA_VERSION;

export type DashboardSnapshotComputeStatus = "complete" | "failed" | "stale" | "pending";

/**
 * Numeric rank for sorting/filtering in Firestore queries (lower = better readiness).
 * Ready=1, Review=2, Missing=3, Not Applicable=0.
 */
export type FoundationReadinessSortRank = 0 | 1 | 2 | 3;

/**
 * Firestore document: `dashboardRows/{cleanTicker}`
 *
 * Document ID = `cleanTicker`.
 */
export interface ValuationDashboardSnapshotDocument {
  schemaVersion: DashboardSnapshotSchemaVersion;

  cleanTicker: string;
  companyName: string;
  fullTicker: string;
  companyLogoUrl: string | null;
  websiteUrl: string | null;
  openCompanyUrl: string;

  damodaranIndustrialBenchmark: string;
  ismSectorDisplay: string | null;
  valuationCurrency: CurrencyCode | null;

  /** Official Intrinsic Value / Share — from persisted foundation, not mock. */
  officialIntrinsicValuePerShare: number | null;
  currentSharePrice: number | null;
  priceCurrency: CurrencyCode | null;

  upsideDownsidePercent: number | null;
  marginOfSafetyPercent: number | null;
  requiredMosPercent: number | null;
  entryPrice: number | null;

  /** Foundation MOS outcome — not legacy Buy/Sell/Hold. */
  foundationDecisionOutcome: FoundationDecisionOutcomeDisplay;
  foundationReadinessStatus: DashboardDecisionIntegrationReadinessStatus;
  foundationReadinessSortRank: FoundationReadinessSortRank;
  reviewSeverity: ReviewSeverity;

  dashboardDecisionIntegrationStatus: DashboardDecisionIntegrationLayerStatus;

  /**
   * Legacy scaffold decision from pre-foundation mock data.
   * Kept separate so UI can label it "Legacy mock" until removed.
   */
  legacyMockDecisionStatus: string | null;

  /** Pointer to full result — same id as this document. */
  valuationResultId: string;

  engineVersion: string;
  referenceDataStamp: string;
  valuationInputFingerprint: string;
  marketOverlayFingerprint: string;

  calculatedAt: string;
  computeStatus: DashboardSnapshotComputeStatus;
  runId: string | null;

  /**
   * Composite sort key for default dashboard ordering, e.g.
   * `{readinessRank}-{companyName}` — set by mapper.
   */
  sortKey: string;
}
