import type { CompanyFoundationBundleResult } from "@/lib/engines/company-foundation/companyFoundationTypes";
import type { BetaPolicyFoundationBundle } from "@/lib/engines/company-foundation/companyFoundationTypes";
import type { ForecastFadeFoundationBundle } from "@/lib/engines/company-foundation/companyFoundationTypes";
import type { CompanyDataModel } from "@/lib/types/company";
import { resolveFoundationDisplayStatus } from "@/lib/utils/foundation-status-display";

export function getSnapshotBetaState(
  company: CompanyDataModel,
  betaBundle: BetaPolicyFoundationBundle | null,
) {
  return {
    lookup: betaBundle?.lookup ?? {
      selectedBenchmark: "",
      betaTableKey: null,
      betaTableKeyMode: null,
      datasetId: null,
      matched: false,
      matchType: "Missing" as const,
      betaReference: null,
      warnings: [],
      errors: ["No Damodaran Industrial Benchmark selected."],
    },
    readiness: betaBundle?.readiness ?? {
      selectedBenchmark: "",
      hasIndustryBenchmark: false,
      hasBetaPullKey: false,
      hasBetaDataset: false,
      hasMatchingBetaRow: false,
      hasUsableUnleveredBeta: false,
      status: "Not Applicable" as const,
      notes: ["Select a Damodaran Industrial Benchmark on the company sheet."],
    },
  };
}

export function getForecastFadeCardState(
  company: CompanyDataModel,
  forecastFadeBundle: ForecastFadeFoundationBundle | null,
) {
  return {
    input: forecastFadeBundle?.input ?? {
      companyId: company.identity.cleanTicker,
      selectedBenchmark: "",
      templateStatus: null,
      defaultStageRecommendation: null,
      historyRecommendation: null,
      cyclicalityFlag: null,
      assetIntensity: null,
      regulatoryFlag: null,
      manualForecastYearsAvailable: 0,
      historicalYearsAvailable: company.availableHistoricalPeriods?.length ?? 0,
      hasRevenueForecast: false,
      hasMarginForecast: false,
      hasReinvestmentInputs: false,
      hasTerminalAssumptions: false,
      notes: ["Select a Damodaran Industrial Benchmark before Forecast & Fade foundation can run."],
    },
    result: forecastFadeBundle?.result ?? {
      recommendedStageType: null,
      recommendedForecastYears: null,
      recommendedHistoryYears: null,
      fadeRequired: null,
      fadeStartYear: null,
      fadeToStableYear: null,
      cyclicalityReviewRequired: false,
      benchmarkReviewRequired: false,
      readinessStatus: "Not Applicable" as const,
      missingInputs: ["Damodaran Industrial Benchmark"],
      warnings: [],
      notes: [],
    },
  };
}

export function getWorkspaceFoundationCardsState(
  company: CompanyDataModel,
  foundationBundle: CompanyFoundationBundleResult | null,
) {
  const betaBundle = foundationBundle?.betaPolicy ?? null;
  const betaPolicy = betaBundle?.policy ?? {
    selectedUnleveredBeta: null,
    selectedLeveredBeta: null,
    selectedBeta: null,
    selectedBetaSource: "Review Required",
    selectedDebtToEquity: null,
    selectedTaxRate: null,
    releveringFormulaUsed: null,
    status: "Not Applicable" as const,
    warnings: [],
    errors: [],
    notes: [],
  };

  const waccBundle = foundationBundle?.wacc ?? null;
  const waccInput = waccBundle?.input ?? {
    companyId: company.identity.cleanTicker,
    selectedBenchmark: "",
    valuationCurrency: company.currencies.valuationCurrency,
    countryOfRisk: company.identity.countryOfRisk,
    selectedBeta: null,
    selectedBetaSource: null,
    riskfreeRate: null,
    riskfreeSource: null,
    equityRiskPremium: null,
    equityRiskPremiumSource: null,
    countryRiskPremium: null,
    countryRiskPremiumSource: null,
    selectedDebtToEquity: null,
    selectedDebtWeight: null,
    selectedEquityWeight: null,
    preTaxCostOfDebt: null,
    costOfDebtSource: null,
    selectedTaxRate: null,
    taxRateSource: null,
    manualOverrides: {},
    notes: ["Select a Damodaran Industrial Benchmark before WACC foundation can run."],
  };
  const waccReadiness = waccBundle?.readiness ?? {
    hasSelectedBeta: false,
    hasRiskfreeRate: false,
    hasERP: false,
    hasDebtEquityOrWeights: false,
    hasPreTaxCostOfDebt: false,
    hasTaxRate: false,
    status: "Not Applicable" as const,
    missingInputs: ["Damodaran Industrial Benchmark"],
    reviewFlags: [],
  };
  const waccResult = waccBundle?.result ?? {
    costOfEquity: null,
    afterTaxCostOfDebt: null,
    debtWeight: null,
    equityWeight: null,
    wacc: null,
    status: "Not Applicable" as const,
    warnings: [],
    errors: [],
    notes: [],
    sourceSummary: {},
  };

  const forecastFade = getForecastFadeCardState(company, foundationBundle?.forecastFade ?? null);
  const reinvestmentFcffBundle = foundationBundle?.reinvestmentFcff ?? null;
  const reinvestmentFcffInput = reinvestmentFcffBundle?.input ?? {
    companyId: company.identity.cleanTicker,
    selectedBenchmark: "",
    forecastYear: "",
    revenue: null,
    priorRevenue: null,
    ebit: null,
    taxRate: null,
    capex: null,
    depreciationAmortization: null,
    changeInNonCashWorkingCapital: null,
    salesToCapital: null,
    methodOverride: null,
    sourceNotes: ["Select a Damodaran Industrial Benchmark before Reinvestment / FCFF foundation can run."],
  };
  const reinvestmentFcffResult = reinvestmentFcffBundle?.result ?? {
    nopat: null,
    selectedReinvestmentMethod: null,
    reinvestment: null,
    fcff: null,
    status: "Not Applicable" as const,
    missingInputs: ["Damodaran Industrial Benchmark"],
    warnings: [],
    notes: [],
    methodComparison: {
      directAvailable: false,
      directReinvestment: null,
      salesToCapitalAvailable: false,
      salesToCapitalReinvestment: null,
      chosenMethod: null,
      comparisonNote: null,
    },
  };

  const terminalValueBundle = foundationBundle?.terminalValue ?? null;
  const terminalValueInput = terminalValueBundle?.input ?? {
    companyId: company.identity.cleanTicker,
    selectedBenchmark: "",
    finalForecastYear: "",
    finalForecastFcff: null,
    stableGrowthRate: null,
    stableWacc: null,
    terminalMethod: null,
    forecastFadeStatus: "Not Applicable" as const,
    waccStatus: "Not Applicable" as const,
    fcffStatus: "Not Applicable" as const,
    sourceNotes: ["Select a Damodaran Industrial Benchmark before Terminal Value foundation can run."],
  };
  const terminalValueResult = terminalValueBundle?.result ?? {
    terminalFcff: null,
    terminalValue: null,
    terminalMethodUsed: null,
    terminalSpread: null,
    status: "Not Applicable" as const,
    missingInputs: ["Damodaran Industrial Benchmark"],
    warnings: [],
    notes: [],
  };

  const dcfPvBundle = foundationBundle?.dcfPv ?? null;
  const dcfPvInput = dcfPvBundle?.input ?? {
    companyId: company.identity.cleanTicker,
    selectedBenchmark: "",
    forecastPeriods: [{ yearNumber: 1, forecastYear: "", fcff: null }],
    terminalYearNumber: 1,
    terminalValue: null,
    terminalValueStatus: "Not Applicable" as const,
    wacc: null,
    waccStatus: "Not Applicable" as const,
    sourceNotes: ["Select a Damodaran Industrial Benchmark before DCF / PV foundation can run."],
  };
  const dcfPvResult = dcfPvBundle?.result ?? {
    forecastPeriods: [
      {
        yearNumber: 1,
        forecastYear: "",
        fcff: null,
        wacc: null,
        discountFactor: null,
        pvFcff: null,
        status: "Not Applicable" as const,
        missingInputs: [],
        notes: [],
      },
    ],
    pvForecastFcff: null,
    pvTerminalValue: null,
    valueOfOperatingAssets: null,
    status: "Not Applicable" as const,
    missingInputs: ["Damodaran Industrial Benchmark"],
    warnings: [],
    notes: [],
  };

  const equityBridgeBundle = foundationBundle?.equityBridge ?? null;
  const equityBridgeInput = equityBridgeBundle?.input ?? {
    companyId: company.identity.cleanTicker,
    selectedBenchmark: "",
    valueOfOperatingAssets: null,
    cashAndCashEquivalents: null,
    nonOperatingAssets: null,
    totalDebt: null,
    preferredEquity: null,
    minorityInterest: null,
    otherNonEquityClaims: null,
    sourceNotes: ["Select a Damodaran Industrial Benchmark before Firm-to-Equity Bridge foundation can run."],
  };
  const equityBridgeResult = equityBridgeBundle?.result ?? {
    valueOfOperatingAssets: null,
    totalAdditions: null,
    totalDeductions: null,
    equityValue: null,
    status: "Not Applicable" as const,
    missingInputs: ["Damodaran Industrial Benchmark"],
    warnings: [],
    notes: [],
  };

  const intrinsicValueBundle = foundationBundle?.intrinsicValue ?? null;
  const intrinsicValueInput = intrinsicValueBundle?.input ?? {
    companyId: company.identity.cleanTicker,
    selectedBenchmark: "",
    equityValue: null,
    equityValueCurrency: company.currencies.valuationCurrency ?? null,
    selectedDilutedShares: null,
    shareUnit: null,
    selectedSharesSource: null,
    currentSharePrice: null,
    priceCurrency: null,
    fxRateToValuationCurrency: null,
    sourceNotes: ["Select a Damodaran Industrial Benchmark before Intrinsic Value / Share foundation can run."],
  };
  const intrinsicValueResult = intrinsicValueBundle?.result ?? {
    intrinsicValuePerShare: null,
    valuationCurrency: company.currencies.valuationCurrency ?? null,
    selectedDilutedShares: null,
    shareUnit: null,
    selectedSharesSource: null,
    status: "Not Applicable" as const,
    missingInputs: ["Damodaran Industrial Benchmark"],
    warnings: [],
    notes: [],
  };

  const mosDecisionBundle = foundationBundle?.mosDecision ?? null;
  const mosDecisionInput = mosDecisionBundle?.input ?? {
    companyId: company.identity.cleanTicker,
    selectedBenchmark: "",
    intrinsicValuePerShare: null,
    intrinsicValueCurrency: company.currencies.valuationCurrency ?? null,
    intrinsicStatus: null,
    currentSharePrice: null,
    priceCurrency: company.currencies.tradingCurrency ?? null,
    fxRateToValuationCurrency: null,
    requiredMOS: null,
    requiredMOSSource: null,
    sourceNotes: ["Select a Damodaran Industrial Benchmark before MOS / Decision foundation can run."],
  };
  const mosDecisionResult = mosDecisionBundle?.result ?? {
    upsideDownsidePercent: null,
    marginOfSafetyPercent: null,
    entryPrice: null,
    decisionOutcome: null,
    status: "Not Applicable" as const,
    missingInputs: ["Damodaran Industrial Benchmark"],
    warnings: [],
    notes: [],
  };

  return {
    selectedBenchmark: company.identity.damodaranIndustrialBenchmark ?? "",
    hasMockBetaPolicyInputs: Boolean(company.betaPolicyInputs),
    hasMockWaccScaffoldInputs: Boolean(company.waccFoundationInputs),
    betaPolicy,
    wacc: { input: waccInput, readiness: waccReadiness, result: waccResult },
    forecastFade,
    reinvestmentFcff: { input: reinvestmentFcffInput, result: reinvestmentFcffResult },
    terminalValue: { input: terminalValueInput, result: terminalValueResult },
    dcfPv: { input: dcfPvInput, result: dcfPvResult },
    equityBridge: { input: equityBridgeInput, result: equityBridgeResult },
    intrinsicValue: { input: intrinsicValueInput, result: intrinsicValueResult },
    mosDecision: { input: mosDecisionInput, result: mosDecisionResult },
    displayStatus: {
      wacc: resolveFoundationDisplayStatus(waccResult.status, []),
      reinvestment: resolveFoundationDisplayStatus(reinvestmentFcffResult.status, [waccResult.status]),
      terminal: resolveFoundationDisplayStatus(terminalValueResult.status, [
        waccResult.status,
        reinvestmentFcffResult.status,
      ]),
      dcf: resolveFoundationDisplayStatus(dcfPvResult.status, [
        waccResult.status,
        reinvestmentFcffResult.status,
        terminalValueResult.status,
      ]),
      equity: resolveFoundationDisplayStatus(equityBridgeResult.status, [
        dcfPvResult.status,
        waccResult.status,
      ]),
      intrinsic: resolveFoundationDisplayStatus(intrinsicValueResult.status, [
        equityBridgeResult.status,
        dcfPvResult.status,
        waccResult.status,
      ]),
      mos: resolveFoundationDisplayStatus(mosDecisionResult.status, [
        intrinsicValueResult.status,
        waccResult.status,
      ]),
    },
  };
}
