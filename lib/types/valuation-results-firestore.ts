/**
 * Firestore contract: `valuationResults/{cleanTicker}`
 *
 * Canonical persisted output of the full valuation foundation pipeline (Beta → MOS).
 * Frontend Company Workspace (Valuation / Review tabs) and detail views read this
 * document — they must not re-run engines.
 *
 * @see docs/firestore-valuation-schema.md
 */

import type {
  BetaLookupResult,
  BetaPolicyResult,
  BetaReadinessStatus,
} from "@/lib/types/beta-engine";
import type { CurrencyCode } from "@/lib/types/currency";
import type {
  DashboardDecisionIntegrationLayerStatus,
  DashboardDecisionIntegrationReadinessStatus,
  FoundationDecisionOutcomeDisplay,
} from "@/lib/types/dashboard-decision-engine";
import type { DcfPvInput, DcfPvResult } from "@/lib/types/dcf-pv-engine";
import type {
  ForecastFadeInput,
  ForecastFadeResult,
} from "@/lib/types/forecast-fade-engine";
import type {
  EquityBridgeInput,
  EquityBridgeResult,
} from "@/lib/types/equity-bridge-engine";
import type {
  IntrinsicValueInput,
  IntrinsicValueResult,
} from "@/lib/types/intrinsic-value-engine";
import type { MosDecisionInput, MosDecisionResult } from "@/lib/types/mos-decision-engine";
import type {
  ReinvestmentFcffInput,
  ReinvestmentFcffResult,
} from "@/lib/types/reinvestment-fcff-engine";
import type { ReviewSeverity } from "@/lib/types/review-flags";
import type {
  TerminalValueInput,
  TerminalValueResult,
} from "@/lib/types/terminal-value-engine";
import type { WaccInput, WaccReadinessStatus, WaccResult } from "@/lib/types/wacc-engine";

/** Bump when the persisted document shape changes (migrations). */
export const VALUATION_RESULT_SCHEMA_VERSION = "valuation-result-v1" as const;

export type ValuationResultSchemaVersion = typeof VALUATION_RESULT_SCHEMA_VERSION;

/** Who produced this document (audit trail for Phase B workers). */
export type ValuationResultComputeSource =
  | "foundation-worker"
  | "nextjs-request"
  | "manual-recompute-api"
  | "migration-seed";

export type ValuationResultComputeStatus =
  | "complete"
  | "failed"
  | "stale"
  | "pending";

/**
 * Fingerprints and stamps used to decide if a company must be recomputed.
 * Mirrors `companyFoundationFingerprint` + reference stamp resolution.
 */
export interface ValuationResultFingerprints {
  /** Stable hash of valuation-driving company inputs + reference data. */
  valuationInputFingerprint: string;
  /** Hash of live price / MOS threshold overlay inputs. */
  marketOverlayFingerprint: string;
  /** Global reference-data version (riskfree, ERP import, engine version). */
  referenceDataStamp: string;
  /** `companies/{id}.lastUpdated` at compute time. */
  companyDocumentLastUpdated: string;
  /**
   * Revision of `companyInputs/{id}` when manual inputs affect engines.
   * Null until `engine_wired` persistence is enabled.
   */
  manualInputsRevision: string | null;
}

export interface ValuationResultVersioning {
  schemaVersion: ValuationResultSchemaVersion;
  /** Matches `FOUNDATION_ENGINE_VERSION` in companyFoundationFingerprint. */
  engineVersion: string;
  calculatedAt: string;
  computeSource: ValuationResultComputeSource;
  /** Optional batch/run id from orchestrator (Phase B). */
  runId: string | null;
  computeStatus: ValuationResultComputeStatus;
  /** ISO timestamp when this doc was superseded by a newer successful run. */
  supersededAt: string | null;
}

/**
 * Official headline outputs — single source of truth for "Official Intrinsic Value"
 * and foundation decision outcome. Denormalized for cheap reads inside one doc.
 */
export interface ValuationResultOfficialOutputs {
  officialIntrinsicValuePerShare: number | null;
  officialIntrinsicValueCurrency: CurrencyCode | null;
  currentSharePrice: number | null;
  currentSharePriceCurrency: CurrencyCode | null;
  upsideDownsidePercent: number | null;
  marginOfSafetyPercent: number | null;
  requiredMosPercent: number | null;
  entryPrice: number | null;
  foundationDecisionOutcome: FoundationDecisionOutcomeDisplay;
  foundationReadinessStatus: DashboardDecisionIntegrationReadinessStatus;
  reviewSeverity: ReviewSeverity;
  wacc: number | null;
  costOfEquity: number | null;
  selectedBeta: number | null;
}

/**
 * Dashboard integration slice embedded in valuationResults for single-doc reads.
 * Same fields as `DashboardDecisionIntegrationResult` (presentation mapping output).
 */
export interface ValuationResultDashboardSlice {
  status: DashboardDecisionIntegrationReadinessStatus;
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
  intrinsicFoundationStatus: string | null;
  mosFoundationStatus: string | null;
}

/** Company Snapshot tab — headline cards without parsing full engine trees. */
export interface ValuationResultWorkspaceSnapshotSlice {
  selectedBenchmark: string;
  betaPolicyStatus: string | null;
  selectedBeta: number | null;
  waccStatus: string | null;
  wacc: number | null;
  intrinsicFoundationStatus: string | null;
  mosFoundationStatus: string | null;
  foundationDecisionOutcome: FoundationDecisionOutcomeDisplay;
  officialIntrinsicValuePerShare: number | null;
  currentSharePrice: number | null;
}

// --- Persisted engine bundles (JSON-serializable mirrors of foundation services) ---

export interface StoredBetaPolicyBundle {
  lookup: BetaLookupResult;
  readiness: BetaReadinessStatus;
  policy: BetaPolicyResult;
}

export interface StoredWaccFoundationBundle {
  input: WaccInput;
  readiness: WaccReadinessStatus;
  result: WaccResult;
}

export interface StoredForecastFadeFoundationBundle {
  input: ForecastFadeInput;
  result: ForecastFadeResult;
}

export interface StoredReinvestmentFcffFoundationBundle {
  input: ReinvestmentFcffInput;
  result: ReinvestmentFcffResult;
}

export interface StoredTerminalValueFoundationBundle {
  input: TerminalValueInput;
  result: TerminalValueResult;
}

export interface StoredDcfPvFoundationBundle {
  input: DcfPvInput;
  result: DcfPvResult;
}

export interface StoredEquityBridgeFoundationBundle {
  input: EquityBridgeInput;
  result: EquityBridgeResult;
}

export interface StoredIntrinsicValueFoundationBundle {
  input: IntrinsicValueInput;
  result: IntrinsicValueResult;
}

export interface StoredMosDecisionFoundationBundle {
  input: MosDecisionInput;
  result: MosDecisionResult;
}

/** Beta → Intrinsic valuation chain (excludes MOS). */
export interface StoredValuationFoundationBundle {
  betaPolicy: StoredBetaPolicyBundle | null;
  wacc: StoredWaccFoundationBundle | null;
  forecastFade: StoredForecastFadeFoundationBundle | null;
  reinvestmentFcff: StoredReinvestmentFcffFoundationBundle | null;
  terminalValue: StoredTerminalValueFoundationBundle | null;
  dcfPv: StoredDcfPvFoundationBundle | null;
  equityBridge: StoredEquityBridgeFoundationBundle | null;
  intrinsicValue: StoredIntrinsicValueFoundationBundle | null;
}

/** Full foundation + MOS overlay — drives Valuation Engines & Review tabs. */
export interface StoredCompanyFoundationBundle extends StoredValuationFoundationBundle {
  mosDecision: StoredMosDecisionFoundationBundle | null;
}

export interface ValuationResultComputeMetadata {
  timingMs: Record<string, number> | null;
  totalMs: number | null;
  errorMessage: string | null;
}

/**
 * Firestore document: `valuationResults/{cleanTicker}`
 *
 * Document ID = `cleanTicker` (same as `companies/{cleanTicker}`).
 */
export interface ValuationResultDocument {
  cleanTicker: string;
  companyName: string;
  fullTicker: string;
  selectedBenchmark: string;
  valuationCurrency: CurrencyCode | null;
  reportingCurrency: CurrencyCode | null;
  tradingCurrency: CurrencyCode | null;
  countryOfRisk: string;
  ismSectorDisplay: string | null;

  versioning: ValuationResultVersioning;
  fingerprints: ValuationResultFingerprints;

  official: ValuationResultOfficialOutputs;
  dashboard: ValuationResultDashboardSlice;
  workspaceSnapshot: ValuationResultWorkspaceSnapshotSlice;

  /** Full engine outputs for Company Workspace valuation / review UI. */
  foundation: StoredCompanyFoundationBundle;

  compute: ValuationResultComputeMetadata;

  /** Deep link for UI navigation. */
  openCompanyUrl: string;
}
