import "server-only";

import { mergeMarketOverlayManualInputs } from "@/lib/company-workspace/mergeMarketOverlayManualInputs";
import { loadCompanyManualInputs } from "@/lib/company-workspace/manualInputsPersistenceService";
import type { CompanyDataModel } from "@/lib/types/company";
import type { PersistedCompanyManualInputs } from "@/lib/types/company-manual-inputs";

export type FoundationBundleCompanyContext = {
  /** Base company from `companies` collection — drives valuation foundation fingerprint. */
  baseCompany: CompanyDataModel;
  /** Base + market-overlay manual inputs — drives MOS / market fingerprint only. */
  marketOverlayCompany: CompanyDataModel;
  persistedManualInputs: PersistedCompanyManualInputs | null;
};

/**
 * Resolves base vs market-overlay company for foundation cache.
 * Valuation engines use `baseCompany`; MOS overlay uses `marketOverlayCompany`.
 */
export async function resolveFoundationBundleCompanies(
  baseCompany: CompanyDataModel,
): Promise<FoundationBundleCompanyContext> {
  const loaded = await loadCompanyManualInputs(baseCompany.identity.cleanTicker);
  const marketOverlayCompany = mergeMarketOverlayManualInputs(baseCompany, loaded.data);

  return {
    baseCompany,
    marketOverlayCompany,
    persistedManualInputs: loaded.data,
  };
}
