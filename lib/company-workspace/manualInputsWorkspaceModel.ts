import type { CompanyDataModel } from "@/lib/types/company";

/** Serializable snapshot for Manual Inputs workspace (local draft only). */
export interface ManualInputsWorkspaceModel {
  cleanTicker: string;
  dataSource: "firestore" | "mock";
  lastUpdated: string;
  persistence?: {
    hasPersistedOverrides: boolean;
    savedAt: string | null;
    loadSource: "firestore" | "memory" | "none";
    wiringStatus: string;
  };
  identity: {
    companyName: string;
    fullTicker: string;
    cleanTicker: string;
    exchange: string;
    websiteUrl: string;
    countryOfRisk: string;
    ismSector: string;
    damodaranIndustrialBenchmark: string;
  };
  currencies: {
    reportingCurrency: string;
    valuationCurrency: string;
    tradingCurrency: string;
    fxPairToValuation: string;
    reviewStatus: string;
    note: string;
  };
  companySetup: {
    valuationDate: string;
  };
  market: {
    currentPrice: string;
    marketCapMillions: string;
    manualShareCountOverride: string;
    beta: string;
  };
  benchmark: {
    selected: string;
    ismSectorDisplay: string;
    templateStatus: string;
    universeOptions: string[];
  };
  financial: {
    revenueGrowthAssumption: string;
    targetOperatingMargin: string;
    targetTaxRate: string;
    targetReinvestmentRate: string;
    riskfreeRate: string;
    equityRiskPremium: string;
    countryRiskPremium: string;
    preTaxCostOfDebt: string;
    targetDebtToCapital: string;
    marginalTaxRate: string;
    marketDebtToEquity: string;
    selectedTaxRateBeta: string;
    waccPreTaxCostOfDebt: string;
    terminalGrowthRate: string;
    terminalMethod: string;
    terminalMargin: string;
  };
  bridge: {
    cashAndCashEquivalents: string;
    marketableSecurities: string;
    grossDebt: string;
    leaseLiabilities: string;
    minorityInterest: string;
    preferredEquity: string;
    pensionDeficit: string;
    otherClaims: string;
  };
  sharesAndMos: {
    selectedDilutedShares: string;
    shareUnit: string;
    selectedSharesSource: string;
    fxRateToValuationCurrency: string;
    minimumMOSForApprove: string;
    watchlistMOSFloor: string;
    analystOverrideNote: string;
  };
  historicalPlaceholder: {
    ltmRevenueMillions: string;
    ltmFcfMillions: string;
    periods: string;
  };
}

function numToDraft(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return "";
  }
  return String(value);
}

export function buildManualInputsWorkspaceModel(
  company: CompanyDataModel,
  options: {
    dataSource: "firestore" | "mock";
    benchmarkUniverse: string[];
    ismSectorDisplay: string;
    templateStatus: string;
    persistence?: ManualInputsWorkspaceModel["persistence"];
  },
): ManualInputsWorkspaceModel {
  const beta = company.betaPolicyInputs;
  const wacc = company.waccFoundationInputs;
  const intrinsic = company.intrinsicValueFoundationInputs;
  const terminal = company.terminalValueInputs;
  const decision = company.decisionLayerInputs;
  const forecast = company.forecastInputs;
  const risk = company.riskWaccInputs;
  const bridge = company.balanceSheetBridgeInputs;

  return {
    cleanTicker: company.identity.cleanTicker,
    dataSource: options.dataSource,
    lastUpdated: company.lastUpdated,
    persistence: options.persistence,
    identity: {
      companyName: company.identity.companyName,
      fullTicker: company.identity.fullTicker,
      cleanTicker: company.identity.cleanTicker,
      exchange: company.identity.exchange,
      websiteUrl: company.identity.websiteUrl,
      countryOfRisk: company.identity.countryOfRisk,
      ismSector: company.identity.ismSector,
      damodaranIndustrialBenchmark: company.identity.damodaranIndustrialBenchmark ?? "",
    },
    currencies: {
      reportingCurrency: company.currencies.reportingCurrency,
      valuationCurrency: company.currencies.valuationCurrency,
      tradingCurrency: company.currencies.tradingCurrency,
      fxPairToValuation: company.currencies.fxPairToValuation ?? "",
      reviewStatus: company.currencies.reviewStatus,
      note: company.currencies.note ?? "",
    },
    companySetup: {
      valuationDate: company.companySetupInputs.valuationDate,
    },
    market: {
      currentPrice: numToDraft(company.marketInputs.currentPrice),
      marketCapMillions: numToDraft(company.marketInputs.marketCap / 1_000_000),
      manualShareCountOverride: numToDraft(company.marketInputs.manualShareCountOverride),
      beta: numToDraft(company.marketInputs.beta ?? risk.beta),
    },
    benchmark: {
      selected: company.identity.damodaranIndustrialBenchmark ?? "",
      ismSectorDisplay: options.ismSectorDisplay,
      templateStatus: options.templateStatus,
      universeOptions: options.benchmarkUniverse,
    },
    financial: {
      revenueGrowthAssumption: numToDraft(forecast.revenueGrowthAssumption),
      targetOperatingMargin: numToDraft(forecast.targetOperatingMargin),
      targetTaxRate: numToDraft(forecast.targetTaxRate),
      targetReinvestmentRate: numToDraft(forecast.targetReinvestmentRate),
      riskfreeRate: numToDraft(risk.riskfreeRate),
      equityRiskPremium: numToDraft(risk.equityRiskPremium),
      countryRiskPremium: numToDraft(risk.countryRiskPremium),
      preTaxCostOfDebt: numToDraft(risk.preTaxCostOfDebt),
      targetDebtToCapital: numToDraft(risk.targetDebtToCapital),
      marginalTaxRate: numToDraft(risk.marginalTaxRate),
      marketDebtToEquity: numToDraft(beta?.marketDebtToEquity),
      selectedTaxRateBeta: numToDraft(beta?.selectedTaxRate),
      waccPreTaxCostOfDebt: numToDraft(wacc?.preTaxCostOfDebt ?? risk.preTaxCostOfDebt),
      terminalGrowthRate: numToDraft(terminal.terminalGrowthRate),
      terminalMethod: terminal.terminalMethod ?? "",
      terminalMargin: numToDraft(terminal.terminalMargin),
    },
    bridge: {
      cashAndCashEquivalents: numToDraft(bridge.cashAndCashEquivalents),
      marketableSecurities: numToDraft(bridge.marketableSecurities),
      grossDebt: numToDraft(bridge.grossDebt),
      leaseLiabilities: numToDraft(bridge.leaseLiabilities),
      minorityInterest: numToDraft(bridge.minorityInterest),
      preferredEquity: numToDraft(bridge.preferredEquity),
      pensionDeficit: numToDraft(bridge.pensionDeficit),
      otherClaims: numToDraft(bridge.otherClaims),
    },
    sharesAndMos: {
      selectedDilutedShares: numToDraft(intrinsic?.selectedDilutedShares),
      shareUnit: intrinsic?.shareUnit ?? "millions",
      selectedSharesSource: intrinsic?.selectedSharesSource ?? "",
      fxRateToValuationCurrency: numToDraft(intrinsic?.fxRateToValuationCurrency ?? 1),
      minimumMOSForApprove: numToDraft(decision.minimumMOSForApprove),
      watchlistMOSFloor: numToDraft(decision.watchlistMOSFloor),
      analystOverrideNote: decision.analystOverrideNote ?? "",
    },
    historicalPlaceholder: {
      ltmRevenueMillions: numToDraft(company.historicalData.incomeStatement.revenue.LTM),
      ltmFcfMillions: numToDraft(company.historicalData.cashFlow.freeCashFlow.LTM),
      periods: company.availableHistoricalPeriods.join(", "),
    },
  };
}
