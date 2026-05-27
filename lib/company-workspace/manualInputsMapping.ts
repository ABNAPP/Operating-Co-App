import type { ManualInputsWorkspaceModel } from "@/lib/company-workspace/manualInputsWorkspaceModel";
import type { CurrencyCode } from "@/lib/types/currency";
import type {
  CompanyManualInputOverrides,
  CompanyManualInputsSavePayload,
} from "@/lib/types/company-manual-inputs";
import type { TerminalValueInputs } from "@/lib/types/inputs";

/** Map workspace draft strings → save payload (pre-sanitization). */
export function workspaceModelToSavePayload(
  model: ManualInputsWorkspaceModel,
): CompanyManualInputsSavePayload {
  const marketCapMillions = model.market.marketCapMillions.trim();
  const marketCapAbsolute = marketCapMillions
    ? Number(marketCapMillions.replace(",", ".")) * 1_000_000
    : undefined;

  const overrides: CompanyManualInputOverrides = {
    identity: {
      companyName: model.identity.companyName,
      exchange: model.identity.exchange,
      websiteUrl: model.identity.websiteUrl,
      countryOfRisk: model.identity.countryOfRisk,
      damodaranIndustrialBenchmark: model.benchmark.selected || model.identity.damodaranIndustrialBenchmark,
    },
    currencies: {
      reportingCurrency: model.currencies.reportingCurrency as CurrencyCode,
      valuationCurrency: model.currencies.valuationCurrency as CurrencyCode,
      tradingCurrency: model.currencies.tradingCurrency as CurrencyCode,
      fxPairToValuation: model.currencies.fxPairToValuation,
      note: model.currencies.note,
    },
    companySetup: {
      valuationDate: model.companySetup.valuationDate,
    },
    market: {
      currentPrice: model.market.currentPrice ? Number(model.market.currentPrice) : undefined,
      marketCap: Number.isFinite(marketCapAbsolute) ? marketCapAbsolute : undefined,
      manualShareCountOverride: model.market.manualShareCountOverride
        ? Number(model.market.manualShareCountOverride)
        : undefined,
      beta: model.market.beta ? Number(model.market.beta) : undefined,
    },
    forecastInputs: {
      revenueGrowthAssumption: toNum(model.financial.revenueGrowthAssumption),
      targetOperatingMargin: toNum(model.financial.targetOperatingMargin),
      targetTaxRate: toNum(model.financial.targetTaxRate),
      targetReinvestmentRate: toNum(model.financial.targetReinvestmentRate),
    },
    riskWaccInputs: {
      riskfreeRate: toNum(model.financial.riskfreeRate),
      equityRiskPremium: toNum(model.financial.equityRiskPremium),
      countryRiskPremium: toNum(model.financial.countryRiskPremium),
      preTaxCostOfDebt: toNum(model.financial.preTaxCostOfDebt),
      targetDebtToCapital: toNum(model.financial.targetDebtToCapital),
      marginalTaxRate: toNum(model.financial.marginalTaxRate),
      beta: toNum(model.market.beta),
    },
    betaPolicyInputs: {
      marketDebtToEquity: toNum(model.financial.marketDebtToEquity),
      selectedTaxRate: toNum(model.financial.selectedTaxRateBeta),
    },
    waccFoundationInputs: {
      preTaxCostOfDebt: toNum(model.financial.waccPreTaxCostOfDebt),
    },
    terminalValueInputs: {
      terminalGrowthRate: toNum(model.financial.terminalGrowthRate),
      terminalMargin: toNum(model.financial.terminalMargin),
      terminalMethod: model.financial.terminalMethod as TerminalValueInputs["terminalMethod"],
    },
    balanceSheetBridgeInputs: {
      cashAndCashEquivalents: toNum(model.bridge.cashAndCashEquivalents),
      marketableSecurities: toNum(model.bridge.marketableSecurities),
      grossDebt: toNum(model.bridge.grossDebt),
      leaseLiabilities: toNum(model.bridge.leaseLiabilities),
      minorityInterest: toNum(model.bridge.minorityInterest),
      preferredEquity: toNum(model.bridge.preferredEquity),
      pensionDeficit: toNum(model.bridge.pensionDeficit),
      otherClaims: toNum(model.bridge.otherClaims),
    },
    intrinsicValueFoundationInputs: {
      selectedDilutedShares: toNum(model.sharesAndMos.selectedDilutedShares),
      shareUnit: model.sharesAndMos.shareUnit as "millions" | "absolute",
      selectedSharesSource: model.sharesAndMos.selectedSharesSource,
      fxRateToValuationCurrency: toNum(model.sharesAndMos.fxRateToValuationCurrency),
    },
    decisionLayerInputs: {
      minimumMOSForApprove: toNum(model.sharesAndMos.minimumMOSForApprove),
      watchlistMOSFloor: toNum(model.sharesAndMos.watchlistMOSFloor),
      analystOverrideNote: model.sharesAndMos.analystOverrideNote,
    },
    historicalLtm: {
      revenue: toNum(model.historicalPlaceholder.ltmRevenueMillions),
      freeCashFlow: toNum(model.historicalPlaceholder.ltmFcfMillions),
    },
  };

  return { overrides, source: "user" };
}

function toNum(raw: string): number | undefined {
  const trimmed = raw.trim();
  if (!trimmed) return undefined;
  const parsed = Number(trimmed.replace(",", "."));
  return Number.isFinite(parsed) ? parsed : undefined;
}

/** Strip empty override branches before persistence. */
export function pruneEmptyOverrides(
  overrides: CompanyManualInputOverrides,
): CompanyManualInputOverrides {
  const pruned: CompanyManualInputOverrides = {};

  if (overrides.identity && Object.keys(overrides.identity).length > 0) {
    pruned.identity = overrides.identity;
  }
  if (overrides.currencies && Object.keys(overrides.currencies).length > 0) {
    pruned.currencies = overrides.currencies;
  }
  if (overrides.companySetup && Object.keys(overrides.companySetup).length > 0) {
    pruned.companySetup = overrides.companySetup;
  }
  if (overrides.market && Object.keys(overrides.market).length > 0) {
    pruned.market = overrides.market;
  }
  if (overrides.forecastInputs && Object.keys(overrides.forecastInputs).length > 0) {
    pruned.forecastInputs = overrides.forecastInputs;
  }
  if (overrides.riskWaccInputs && Object.keys(overrides.riskWaccInputs).length > 0) {
    pruned.riskWaccInputs = overrides.riskWaccInputs;
  }
  if (overrides.betaPolicyInputs && Object.keys(overrides.betaPolicyInputs).length > 0) {
    pruned.betaPolicyInputs = overrides.betaPolicyInputs;
  }
  if (overrides.waccFoundationInputs && Object.keys(overrides.waccFoundationInputs).length > 0) {
    pruned.waccFoundationInputs = overrides.waccFoundationInputs;
  }
  if (overrides.terminalValueInputs && Object.keys(overrides.terminalValueInputs).length > 0) {
    pruned.terminalValueInputs = overrides.terminalValueInputs;
  }
  if (overrides.balanceSheetBridgeInputs && Object.keys(overrides.balanceSheetBridgeInputs).length > 0) {
    pruned.balanceSheetBridgeInputs = overrides.balanceSheetBridgeInputs;
  }
  if (
    overrides.intrinsicValueFoundationInputs &&
    Object.keys(overrides.intrinsicValueFoundationInputs).length > 0
  ) {
    pruned.intrinsicValueFoundationInputs = overrides.intrinsicValueFoundationInputs;
  }
  if (overrides.decisionLayerInputs && Object.keys(overrides.decisionLayerInputs).length > 0) {
    pruned.decisionLayerInputs = overrides.decisionLayerInputs;
  }
  if (overrides.historicalLtm && Object.keys(overrides.historicalLtm).length > 0) {
    pruned.historicalLtm = overrides.historicalLtm;
  }

  return pruned;
}
