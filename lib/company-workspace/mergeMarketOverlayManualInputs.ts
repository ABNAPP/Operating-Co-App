import type { CompanyDataModel } from "@/lib/types/company";
import type { PersistedCompanyManualInputs } from "@/lib/types/company-manual-inputs";

/** Persisted override keys wired to MOS / market overlay only (Part 2B-2). */
export const MARKET_OVERLAY_WIRED_FIELD_KEYS = [
  "overrides.market.currentPrice",
  "overrides.decisionLayerInputs.minimumMOSForApprove",
] as const;

export type MarketOverlayWiredFieldKey = (typeof MARKET_OVERLAY_WIRED_FIELD_KEYS)[number];

export function isMarketOverlayWiringStatus(
  wiringStatus: PersistedCompanyManualInputs["wiringStatus"] | string | undefined,
): boolean {
  return wiringStatus === "market_overlay_wired";
}

/**
 * Apply saved manual inputs for market overlay only (current price + required MOS).
 * Does not merge benchmark, WACC, terminal, bridge, or other valuation inputs.
 */
export function mergeMarketOverlayManualInputs(
  baseCompany: CompanyDataModel,
  manualInputs: PersistedCompanyManualInputs | null | undefined,
): CompanyDataModel {
  if (!manualInputs || !isMarketOverlayWiringStatus(manualInputs.wiringStatus)) {
    return baseCompany;
  }

  const o = manualInputs.overrides;
  if (!o) {
    return baseCompany;
  }

  let next = baseCompany;

  if (o.market?.currentPrice !== undefined && Number.isFinite(o.market.currentPrice)) {
    next = {
      ...next,
      marketInputs: {
        ...next.marketInputs,
        currentPrice: o.market.currentPrice,
      },
    };
  }

  if (
    o.decisionLayerInputs?.minimumMOSForApprove !== undefined &&
    Number.isFinite(o.decisionLayerInputs.minimumMOSForApprove)
  ) {
    next = {
      ...next,
      decisionLayerInputs: {
        ...next.decisionLayerInputs,
        minimumMOSForApprove: o.decisionLayerInputs.minimumMOSForApprove,
      },
    };
  }

  return next;
}
