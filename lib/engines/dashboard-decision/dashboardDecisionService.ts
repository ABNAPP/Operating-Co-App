import "server-only";

import { getCachedCompanyFoundationBundle } from "@/lib/engines/company-foundation/companyFoundationCacheService";
import { resolveFoundationReferenceDataStamp } from "@/lib/engines/company-foundation/foundationReferenceStamp";
import type { CompanyFoundationBundle } from "@/lib/engines/company-foundation/companyFoundationTypes";
import { mapDashboardDecisionIntegrationFromFoundationBundle } from "@/lib/engines/dashboard-decision/dashboardDecisionMapping";
import type { CompanyDataModel } from "@/lib/types/company";
import type { DashboardDecisionIntegrationResult } from "@/lib/types/dashboard-decision-engine";

/**
 * Maps a pre-computed foundation bundle to dashboard decision integration output.
 * Does not start the valuation chain when the bundle is already provided.
 */
export function buildDashboardDecisionIntegrationFromFoundationBundle(
  company: CompanyDataModel,
  foundationBundle: CompanyFoundationBundle,
): DashboardDecisionIntegrationResult {
  return mapDashboardDecisionIntegrationFromFoundationBundle(company, foundationBundle);
}

export type BuildDashboardDecisionIntegrationOptions = {
  foundationBundle?: CompanyFoundationBundle;
  refresh?: boolean;
  referenceDataStamp?: string;
};

/**
 * Builds dashboard decision integration output from foundation results only.
 * When `foundationBundle` is omitted, computes the bundle once via `computeCompanyFoundationBundle`.
 */
export async function buildDashboardDecisionIntegrationForCompany(
  company: CompanyDataModel,
  options?: BuildDashboardDecisionIntegrationOptions,
): Promise<DashboardDecisionIntegrationResult> {
  const foundationBundle =
    options?.foundationBundle ??
    (await getCachedCompanyFoundationBundle(company, {
      refresh: options?.refresh,
      referenceDataStamp: options?.referenceDataStamp,
    }));
  return mapDashboardDecisionIntegrationFromFoundationBundle(company, foundationBundle);
}

export type DashboardLegacyMockContext = {
  decisionStatus: string;
  openCompanyUrl: string;
};

export type DashboardFoundationPresentationRow = {
  integration: DashboardDecisionIntegrationResult;
  legacyMockDecision: string | null;
  openCompanyUrl: string;
};

export type BuildDashboardFoundationPresentationRowsOptions = {
  /** Preserve dashboard row order (e.g. legacy dashboard tickers). */
  orderTickers?: string[];
  legacyByTicker?: Map<string, DashboardLegacyMockContext>;
  refresh?: boolean;
  /** Shared reference stamp for all rows in one Dashboard request. */
  referenceDataStamp?: string;
};

/**
 * One foundation bundle per company, then mapping only — used by Dashboard UI.
 * Does not perform valuation math in the presentation layer.
 */
export async function buildDashboardFoundationPresentationRows(
  companies: CompanyDataModel[],
  options?: BuildDashboardFoundationPresentationRowsOptions,
): Promise<DashboardFoundationPresentationRow[]> {
  const companyByTicker = new Map(
    companies.map((company) => [company.identity.cleanTicker, company]),
  );
  const tickers =
    options?.orderTickers ?? companies.map((company) => company.identity.cleanTicker);

  const referenceDataStamp =
    options?.referenceDataStamp ?? (await resolveFoundationReferenceDataStamp());

  const rowResults = await Promise.all(
    tickers.map(async (ticker): Promise<DashboardFoundationPresentationRow | null> => {
      const company = companyByTicker.get(ticker);
      if (!company) return null;

      const foundationBundle = await getCachedCompanyFoundationBundle(company, {
        refresh: options?.refresh,
        referenceDataStamp,
      });
      const integration = mapDashboardDecisionIntegrationFromFoundationBundle(
        company,
        foundationBundle,
      );

      const legacy = options?.legacyByTicker?.get(ticker);

      return {
        integration,
        legacyMockDecision:
          legacy?.decisionStatus ??
          company.valuationResult?.decisionResult?.decisionStatus ??
          null,
        openCompanyUrl:
          legacy?.openCompanyUrl ?? `/companies/${company.identity.cleanTicker}`,
      };
    }),
  );

  return rowResults.filter((row): row is DashboardFoundationPresentationRow => row !== null);
}
