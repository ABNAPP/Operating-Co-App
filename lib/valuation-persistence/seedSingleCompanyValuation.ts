import "server-only";

import { resolveFoundationBundleCompanies } from "@/lib/company-workspace/resolveFoundationBundleCompanies";
import {
  buildMarketOverlayFingerprint,
  buildValuationFoundationFingerprint,
} from "@/lib/engines/company-foundation/companyFoundationFingerprint";
import { getCachedCompanyFoundationBundle } from "@/lib/engines/company-foundation/companyFoundationCacheService";
import { resolveFoundationReferenceDataStamp } from "@/lib/engines/company-foundation/foundationReferenceStamp";
import { buildPersistedValuationArtifacts } from "@/lib/firestore/mappers/valuationResultDocumentMapper";
import { getCompanyByCleanTicker } from "@/lib/firestore/repositories/companiesRepository";
import { getDashboardRows } from "@/lib/firestore/repositories/dashboardRepository";
import { upsertValuationArtifactsPairAdmin } from "@/lib/firestore/repositories/valuationDashboardAdminRepository";
import { getMockCompanyByTicker } from "@/lib/mock-companies";
import type { ValuationDashboardSnapshotDocument } from "@/lib/types/dashboard-snapshot-firestore";
import type { ValuationResultDocument } from "@/lib/types/valuation-results-firestore";

export const DEFAULT_DEV_SEED_TICKER = "MSFT";

export type SeedSingleCompanyValuationOptions = {
  cleanTicker?: string;
  /** Force full recompute (bypass in-memory foundation cache). */
  refresh?: boolean;
};

export type SeedSingleCompanyValuationResult = {
  success: boolean;
  cleanTicker: string;
  companySource: "firestore" | "mock";
  companyName: string;
  selectedBenchmark: string;
  referenceDataStamp: string;
  valuationInputFingerprint: string;
  marketOverlayFingerprint: string;
  officialIntrinsicValuePerShare: number | null;
  foundationDecisionOutcome: string;
  foundationReadinessStatus: string;
  computeTotalMs: number | null;
  firestore: {
    valuationResultsPath: string;
    dashboardRowsPath: string;
    writeOk: boolean;
    error: string | null;
  };
  valuationResult: ValuationResultDocument;
  dashboardSnapshot: ValuationDashboardSnapshotDocument;
  errors: string[];
};

function manualInputsRevision(
  savedAt: string | undefined,
  wiringStatus: string | undefined,
): string | null {
  if (!savedAt) return null;
  return `${savedAt}|${wiringStatus ?? "unknown"}`;
}

/**
 * Runs the full foundation pipeline for one company and persists
 * `valuationResults/{cleanTicker}` + `dashboardRows/{cleanTicker}` via Firebase Admin.
 */
export async function seedSingleCompanyValuation(
  options?: SeedSingleCompanyValuationOptions,
): Promise<SeedSingleCompanyValuationResult> {
  const cleanTicker = (options?.cleanTicker ?? DEFAULT_DEV_SEED_TICKER).trim().toUpperCase();
  const errors: string[] = [];

  const companyResult = await getCompanyByCleanTicker(cleanTicker);
  let company = companyResult.data;
  let companySource = companyResult.source;

  if (!company) {
    company = getMockCompanyByTicker(cleanTicker) ?? null;
    companySource = company ? "mock" : companySource;
  }

  if (!company) {
    return {
      success: false,
      cleanTicker,
      companySource: "mock",
      companyName: "",
      selectedBenchmark: "",
      referenceDataStamp: "",
      valuationInputFingerprint: "",
      marketOverlayFingerprint: "",
      officialIntrinsicValuePerShare: null,
      foundationDecisionOutcome: "N/A",
      foundationReadinessStatus: "Missing",
      computeTotalMs: null,
      firestore: {
        valuationResultsPath: `valuationResults/${cleanTicker}`,
        dashboardRowsPath: `dashboardRows/${cleanTicker}`,
        writeOk: false,
        error: `Company not found: ${cleanTicker}`,
      },
      valuationResult: {} as ValuationResultDocument,
      dashboardSnapshot: {} as ValuationDashboardSnapshotDocument,
      errors: [`Company not found: ${cleanTicker}`],
    };
  }

  const { baseCompany, marketOverlayCompany, persistedManualInputs } =
    await resolveFoundationBundleCompanies(company);

  const referenceDataStamp = await resolveFoundationReferenceDataStamp();
  const valuationInputFingerprint = buildValuationFoundationFingerprint(
    baseCompany,
    referenceDataStamp,
  );
  const marketOverlayFingerprint = buildMarketOverlayFingerprint(marketOverlayCompany);

  const foundationBundle = await getCachedCompanyFoundationBundle(company, {
    refresh: options?.refresh !== false,
    referenceDataStamp,
  });

  const legacyRows = await getDashboardRows();
  const legacyRow = legacyRows.data.find((row) => row.ticker === cleanTicker);

  const { valuationResult, dashboardSnapshot } = buildPersistedValuationArtifacts({
    company,
    foundationBundle,
    fingerprints: {
      valuationInputFingerprint,
      marketOverlayFingerprint,
      referenceDataStamp,
      companyDocumentLastUpdated: company.lastUpdated,
      manualInputsRevision: manualInputsRevision(
        persistedManualInputs?.savedAt,
        persistedManualInputs?.wiringStatus,
      ),
    },
    referenceDataStamp,
    computeSource: "nextjs-request",
    runId: `dev-seed-${Date.now()}`,
    legacyMockDecisionStatus: legacyRow?.decisionStatus ?? null,
    companyLogoUrl: company.identity.logoUrl ?? null,
    websiteUrl: company.identity.websiteUrl ?? null,
    ismSectorDisplay: company.identity.ismSector ?? null,
  });

  const write = await upsertValuationArtifactsPairAdmin({
    valuationResult,
    dashboardSnapshot,
  });

  if (!write.ok) {
    errors.push(write.error ?? "Unknown Firestore write error.");
  }

  if (!company.identity.damodaranIndustrialBenchmark?.trim()) {
    errors.push("No Damodaran Industrial Benchmark selected — foundation bundle may be empty.");
  }

  return {
    success: write.ok,
    cleanTicker,
    companySource,
    companyName: company.identity.companyName,
    selectedBenchmark: company.identity.damodaranIndustrialBenchmark ?? "",
    referenceDataStamp,
    valuationInputFingerprint,
    marketOverlayFingerprint,
    officialIntrinsicValuePerShare: valuationResult.official.officialIntrinsicValuePerShare,
    foundationDecisionOutcome: valuationResult.official.foundationDecisionOutcome,
    foundationReadinessStatus: valuationResult.official.foundationReadinessStatus,
    computeTotalMs: valuationResult.compute.totalMs,
    firestore: {
      valuationResultsPath: `valuationResults/${cleanTicker}`,
      dashboardRowsPath: `dashboardRows/${cleanTicker}`,
      writeOk: write.ok,
      error: write.error ?? null,
    },
    valuationResult,
    dashboardSnapshot,
    errors,
  };
}
