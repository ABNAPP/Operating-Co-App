import "server-only";

import { mapDashboardDecisionIntegrationFromFoundationBundle } from "@/lib/engines/dashboard-decision/dashboardDecisionMapping";
import type { CompanyFoundationBundleResult } from "@/lib/engines/company-foundation/companyFoundationTypes";
import { FOUNDATION_ENGINE_VERSION } from "@/lib/engines/company-foundation/companyFoundationFingerprint";
import type { CompanyDataModel } from "@/lib/types/company";
import type {
  FoundationReadinessSortRank,
  ValuationDashboardSnapshotDocument,
} from "@/lib/types/dashboard-snapshot-firestore";
import {
  DASHBOARD_SNAPSHOT_SCHEMA_VERSION,
} from "@/lib/types/dashboard-snapshot-firestore";
import type {
  StoredCompanyFoundationBundle,
  ValuationResultComputeSource,
  ValuationResultDocument,
  ValuationResultFingerprints,
} from "@/lib/types/valuation-results-firestore";
import {
  VALUATION_RESULT_SCHEMA_VERSION,
} from "@/lib/types/valuation-results-firestore";

export type BuildValuationResultDocumentInput = {
  company: CompanyDataModel;
  foundationBundle: CompanyFoundationBundleResult;
  fingerprints: ValuationResultFingerprints;
  referenceDataStamp: string;
  engineVersion?: string;
  calculatedAt?: string;
  computeSource?: ValuationResultComputeSource;
  runId?: string | null;
  ismSectorDisplay?: string | null;
};

const READINESS_SORT_RANK: Record<string, FoundationReadinessSortRank> = {
  "Not Applicable": 0,
  Ready: 1,
  Review: 2,
  Missing: 3,
};

function toStoredFoundationBundle(
  bundle: CompanyFoundationBundleResult,
): StoredCompanyFoundationBundle {
  return {
    betaPolicy: bundle.betaPolicy,
    wacc: bundle.wacc,
    forecastFade: bundle.forecastFade,
    reinvestmentFcff: bundle.reinvestmentFcff,
    terminalValue: bundle.terminalValue,
    dcfPv: bundle.dcfPv,
    equityBridge: bundle.equityBridge,
    intrinsicValue: bundle.intrinsicValue,
    mosDecision: bundle.mosDecision,
  };
}

function buildSortKey(
  readiness: string,
  companyName: string,
): string {
  const rank = READINESS_SORT_RANK[readiness] ?? 3;
  return `${String(rank).padStart(1, "0")}-${companyName.toLowerCase()}`;
}

/**
 * Maps a computed foundation bundle + company identity into the canonical
 * `valuationResults/{cleanTicker}` Firestore document shape.
 */
export function buildValuationResultDocument(
  input: BuildValuationResultDocumentInput,
): ValuationResultDocument {
  const {
    company,
    foundationBundle,
    fingerprints,
    referenceDataStamp,
    engineVersion = FOUNDATION_ENGINE_VERSION,
    calculatedAt = new Date().toISOString(),
    computeSource = "nextjs-request",
    runId = null,
    ismSectorDisplay = null,
  } = input;

  const cleanTicker = company.identity.cleanTicker;
  const dashboard = mapDashboardDecisionIntegrationFromFoundationBundle(
    company,
    foundationBundle,
  );

  const wacc = foundationBundle.wacc?.result.wacc ?? null;
  const costOfEquity = foundationBundle.wacc?.result.costOfEquity ?? null;
  const selectedBeta = foundationBundle.betaPolicy?.policy.selectedBeta ?? null;

  const officialIntrinsicValuePerShare =
    dashboard.intrinsicValuePerShare ??
    foundationBundle.intrinsicValue?.result.intrinsicValuePerShare ??
    null;

  const officialIntrinsicValueCurrency =
    dashboard.valuationCurrency ??
    foundationBundle.intrinsicValue?.result.valuationCurrency ??
    company.currencies.valuationCurrency ??
    null;

  return {
    cleanTicker,
    companyName: company.identity.companyName,
    fullTicker: company.identity.fullTicker,
    selectedBenchmark: company.identity.damodaranIndustrialBenchmark ?? "",
    valuationCurrency: company.currencies.valuationCurrency ?? null,
    reportingCurrency: company.currencies.reportingCurrency ?? null,
    tradingCurrency: company.currencies.tradingCurrency ?? null,
    countryOfRisk: company.identity.countryOfRisk,
    ismSectorDisplay,

    versioning: {
      schemaVersion: VALUATION_RESULT_SCHEMA_VERSION,
      engineVersion,
      calculatedAt,
      computeSource,
      runId,
      computeStatus: "complete",
      supersededAt: null,
    },

    fingerprints: {
      ...fingerprints,
      referenceDataStamp,
    },

    official: {
      officialIntrinsicValuePerShare,
      officialIntrinsicValueCurrency,
      currentSharePrice: dashboard.currentPrice,
      currentSharePriceCurrency: dashboard.priceCurrency,
      upsideDownsidePercent: dashboard.upsideDownsidePercent,
      marginOfSafetyPercent: dashboard.marginOfSafetyPercent,
      requiredMosPercent: dashboard.requiredMosPercent,
      entryPrice: dashboard.entryPrice,
      foundationDecisionOutcome: dashboard.foundationDecisionOutcome,
      foundationReadinessStatus: dashboard.status,
      reviewSeverity: dashboard.reviewSeverity,
      wacc,
      costOfEquity,
      selectedBeta,
    },

    dashboard: {
      status: dashboard.status,
      intrinsicValuePerShare: dashboard.intrinsicValuePerShare,
      currentPrice: dashboard.currentPrice,
      priceCurrency: dashboard.priceCurrency,
      upsideDownsidePercent: dashboard.upsideDownsidePercent,
      marginOfSafetyPercent: dashboard.marginOfSafetyPercent,
      requiredMosPercent: dashboard.requiredMosPercent,
      entryPrice: dashboard.entryPrice,
      foundationDecisionOutcome: dashboard.foundationDecisionOutcome,
      reviewSeverity: dashboard.reviewSeverity,
      missingInputs: dashboard.missingInputs,
      warnings: dashboard.warnings,
      sourceNotes: dashboard.sourceNotes,
      dashboardDecisionIntegrationStatus: dashboard.dashboardDecisionIntegrationStatus,
      intrinsicFoundationStatus: dashboard.intrinsicFoundationStatus,
      mosFoundationStatus: dashboard.mosFoundationStatus,
    },

    workspaceSnapshot: {
      selectedBenchmark: dashboard.selectedBenchmark,
      betaPolicyStatus: foundationBundle.betaPolicy?.policy.status ?? null,
      selectedBeta,
      waccStatus: foundationBundle.wacc?.result.status ?? null,
      wacc,
      intrinsicFoundationStatus: dashboard.intrinsicFoundationStatus,
      mosFoundationStatus: dashboard.mosFoundationStatus,
      foundationDecisionOutcome: dashboard.foundationDecisionOutcome,
      officialIntrinsicValuePerShare,
      currentSharePrice: dashboard.currentPrice,
    },

    foundation: toStoredFoundationBundle(foundationBundle),

    compute: {
      timingMs: foundationBundle.timingMs ?? null,
      totalMs: foundationBundle.totalMs ?? null,
      errorMessage: null,
    },

    openCompanyUrl: `/companies/${cleanTicker}`,
  };
}

export type BuildDashboardSnapshotInput = {
  valuationResult: ValuationResultDocument;
  legacyMockDecisionStatus?: string | null;
  companyLogoUrl?: string | null;
  websiteUrl?: string | null;
};

/**
 * Denormalized dashboard row derived from a valuation result document.
 */
export function buildDashboardSnapshotDocument(
  input: BuildDashboardSnapshotInput,
): ValuationDashboardSnapshotDocument {
  const { valuationResult, legacyMockDecisionStatus = null, companyLogoUrl = null, websiteUrl = null } =
    input;

  const readiness = valuationResult.official.foundationReadinessStatus;
  const readinessRank = READINESS_SORT_RANK[readiness] ?? 3;

  return {
    schemaVersion: DASHBOARD_SNAPSHOT_SCHEMA_VERSION,
    cleanTicker: valuationResult.cleanTicker,
    companyName: valuationResult.companyName,
    fullTicker: valuationResult.fullTicker,
    companyLogoUrl,
    websiteUrl,
    openCompanyUrl: valuationResult.openCompanyUrl,

    damodaranIndustrialBenchmark: valuationResult.selectedBenchmark,
    ismSectorDisplay: valuationResult.ismSectorDisplay,
    valuationCurrency: valuationResult.valuationCurrency,

    officialIntrinsicValuePerShare: valuationResult.official.officialIntrinsicValuePerShare,
    currentSharePrice: valuationResult.official.currentSharePrice,
    priceCurrency: valuationResult.official.currentSharePriceCurrency,

    upsideDownsidePercent: valuationResult.official.upsideDownsidePercent,
    marginOfSafetyPercent: valuationResult.official.marginOfSafetyPercent,
    requiredMosPercent: valuationResult.official.requiredMosPercent,
    entryPrice: valuationResult.official.entryPrice,

    foundationDecisionOutcome: valuationResult.official.foundationDecisionOutcome,
    foundationReadinessStatus: readiness,
    foundationReadinessSortRank: readinessRank,
    reviewSeverity: valuationResult.official.reviewSeverity,

    dashboardDecisionIntegrationStatus:
      valuationResult.dashboard.dashboardDecisionIntegrationStatus,

    legacyMockDecisionStatus,

    valuationResultId: valuationResult.cleanTicker,

    engineVersion: valuationResult.versioning.engineVersion,
    referenceDataStamp: valuationResult.fingerprints.referenceDataStamp,
    valuationInputFingerprint: valuationResult.fingerprints.valuationInputFingerprint,
    marketOverlayFingerprint: valuationResult.fingerprints.marketOverlayFingerprint,

    calculatedAt: valuationResult.versioning.calculatedAt,
    computeStatus: valuationResult.versioning.computeStatus,
    runId: valuationResult.versioning.runId,

    sortKey: buildSortKey(readiness, valuationResult.companyName),
  };
}

/**
 * Convenience: build both documents from one foundation compute (Phase B worker entrypoint).
 */
export function buildPersistedValuationArtifacts(
  input: BuildValuationResultDocumentInput & {
    legacyMockDecisionStatus?: string | null;
    companyLogoUrl?: string | null;
    websiteUrl?: string | null;
  },
): {
  valuationResult: ValuationResultDocument;
  dashboardSnapshot: ValuationDashboardSnapshotDocument;
} {
  const valuationResult = buildValuationResultDocument(input);
  const dashboardSnapshot = buildDashboardSnapshotDocument({
    valuationResult,
    legacyMockDecisionStatus: input.legacyMockDecisionStatus ?? null,
    companyLogoUrl: input.companyLogoUrl ?? null,
    websiteUrl: input.websiteUrl ?? null,
  });

  return { valuationResult, dashboardSnapshot };
}
