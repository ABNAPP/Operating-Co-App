import type { CompanyDataModel } from "@/lib/types/company";

export const FOUNDATION_ENGINE_VERSION = "foundation-v1";

export function stableSerialize(value: unknown): string {
  if (value === null || value === undefined) {
    return "null";
  }
  if (typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableSerialize(item)).join(",")}]`;
  }
  const record = value as Record<string, unknown>;
  const keys = Object.keys(record).sort();
  return `{${keys.map((key) => `${JSON.stringify(key)}:${stableSerialize(record[key])}`).join(",")}}`;
}

/** Inputs that drive Beta → Intrinsic valuation foundation (excludes live market price / MOS threshold). */
export function buildValuationFoundationFingerprint(
  company: CompanyDataModel,
  referenceDataStamp: string,
): string {
  const payload = {
    engineVersion: FOUNDATION_ENGINE_VERSION,
    referenceDataStamp,
    companyId: company.identity.cleanTicker,
    lastUpdated: company.lastUpdated,
    benchmark: company.identity.damodaranIndustrialBenchmark,
    countryOfRisk: company.identity.countryOfRisk,
    valuationCurrency: company.currencies.valuationCurrency,
    reportingCurrency: company.currencies.reportingCurrency,
    betaPolicyInputs: company.betaPolicyInputs ?? null,
    waccFoundationInputs: company.waccFoundationInputs ?? null,
    riskWaccInputs: company.riskWaccInputs,
    forecastInputs: company.forecastInputs,
    forecastData: company.forecastData,
    terminalValueInputs: company.terminalValueInputs,
    balanceSheetBridgeInputs: company.balanceSheetBridgeInputs,
    debtDetailInputs: company.debtDetailInputs,
    leaseInputs: company.leaseInputs,
    intrinsicValueFoundationInputs: company.intrinsicValueFoundationInputs
      ? {
          selectedDilutedShares: company.intrinsicValueFoundationInputs.selectedDilutedShares,
          shareUnit: company.intrinsicValueFoundationInputs.shareUnit,
          selectedSharesSource: company.intrinsicValueFoundationInputs.selectedSharesSource,
          priceCurrency: company.intrinsicValueFoundationInputs.priceCurrency,
          fxRateToValuationCurrency:
            company.intrinsicValueFoundationInputs.fxRateToValuationCurrency,
          notes: company.intrinsicValueFoundationInputs.notes,
        }
      : null,
    historicalLtm: {
      revenue: company.historicalData.incomeStatement.revenue.LTM,
      ebit: company.historicalData.incomeStatement.ebit.LTM,
      depreciation: company.historicalData.cashFlow.depreciationAndAmortization.LTM,
    },
  };

  return stableSerialize(payload);
}

/** Inputs that drive MOS / market decision overlay only. */
export function buildMarketOverlayFingerprint(company: CompanyDataModel): string {
  const scaffold = company.intrinsicValueFoundationInputs;
  const payload = {
    engineVersion: FOUNDATION_ENGINE_VERSION,
    companyId: company.identity.cleanTicker,
    currentSharePrice: company.marketInputs.currentPrice,
    tradingCurrency: company.currencies.tradingCurrency,
    decisionLayerInputs: company.decisionLayerInputs,
    scaffoldCurrentSharePrice: scaffold?.currentSharePrice ?? null,
    scaffoldFxRate: scaffold?.fxRateToValuationCurrency ?? null,
  };

  return stableSerialize(payload);
}
