import { notFound } from "next/navigation";
import { BackLink } from "@/components/back-link";
import { ValuationEnginesStatusCard } from "@/components/valuation-engines-status-card";
import { getCompanyByCleanTicker } from "@/lib/firestore/repositories/companiesRepository";
import {
  getBenchmarkDataPullKeysTable,
  getDamodaranIndustryUniverse,
  getIndustryBenchmarkConfigTable,
  getIndustryISMDisplayMapTable,
} from "@/lib/firestore/repositories/sectorIndustryMappingRepository";
import { BetaPolicyCard } from "@/components/beta-policy-card";
import { BetaReferenceCard } from "@/components/beta-reference-card";
import { ForecastFadeFoundationCard } from "@/components/forecast-fade-foundation-card";
import { ReinvestmentFcffFoundationCard } from "@/components/reinvestment-fcff-foundation-card";
import { TerminalValueFoundationCard } from "@/components/terminal-value-foundation-card";
import { DcfPvFoundationCard } from "@/components/dcf-pv-foundation-card";
import { EquityBridgeFoundationCard } from "@/components/equity-bridge-foundation-card";
import { IntrinsicValueFoundationCard } from "@/components/intrinsic-value-foundation-card";
import { WaccFoundationCard } from "@/components/wacc-foundation-card";
import { computeBetaPolicyForCompany } from "@/lib/engines/beta/betaPolicyService";
import { computeForecastFadeForCompany } from "@/lib/engines/forecast-fade/forecastFadeService";
import { computeReinvestmentFcffForCompany } from "@/lib/engines/reinvestment-fcff/reinvestmentFcffService";
import { computeTerminalValueForCompany } from "@/lib/engines/terminal-value/terminalValueService";
import { computeDcfPvForCompany } from "@/lib/engines/dcf-pv/dcfPvService";
import { computeEquityBridgeForCompany } from "@/lib/engines/equity-bridge/equityBridgeService";
import { computeIntrinsicValueForCompany } from "@/lib/engines/intrinsic-value/intrinsicValueService";
import { computeWaccForCompany } from "@/lib/engines/wacc/waccService";
import {
  formatAmountMillions,
  formatPercent,
  formatPerShare,
} from "@/lib/utils/formatters";

const workspaceSections = [
  "Snapshot",
  "Inputs",
  "Historical Data",
  "Forecast Data",
  "Valuation Engines",
  "Review & Decision",
  "Notes / Sources",
];

export default async function CompanyWorkspacePage({
  params,
}: {
  params: Promise<{ cleanTicker: string }>;
}) {
  const { cleanTicker } = await params;
  const { data: company, source } = await getCompanyByCleanTicker(cleanTicker);

  if (!company) {
    notFound();
  }

  const [benchmarkUniverse, benchmarkConfigTable, ismDisplayMapTable, pullKeysTable] =
    await Promise.all([
      getDamodaranIndustryUniverse(),
      getIndustryBenchmarkConfigTable(),
      getIndustryISMDisplayMapTable(),
      getBenchmarkDataPullKeysTable(),
    ]);

  const selectedBenchmark = company.identity.damodaranIndustrialBenchmark ?? "";
  const benchmarkConfig =
    benchmarkConfigTable.data.find((row) => row.damodaranIndustrialBenchmark === selectedBenchmark) ??
    null;
  const selectedIsmRow =
    ismDisplayMapTable.data.find((row) => row.damodaranIndustrialBenchmark === selectedBenchmark) ??
    null;
  const pullKeys =
    pullKeysTable.data.find((row) => row.damodaranIndustrialBenchmark === selectedBenchmark) ?? null;

  const betaBundle = selectedBenchmark
    ? await computeBetaPolicyForCompany(company)
    : null;
  const betaLookup = betaBundle?.lookup ?? {
    selectedBenchmark: "",
    betaTableKey: null,
    betaTableKeyMode: null,
    datasetId: null,
    matched: false,
    matchType: "Missing" as const,
    betaReference: null,
    warnings: [],
    errors: ["No Damodaran Industrial Benchmark selected."],
  };
  const betaReadiness = betaBundle?.readiness ?? {
    selectedBenchmark: "",
    hasIndustryBenchmark: false,
    hasBetaPullKey: false,
    hasBetaDataset: false,
    hasMatchingBetaRow: false,
    hasUsableUnleveredBeta: false,
    status: "Not Applicable" as const,
    notes: ["Select a Damodaran Industrial Benchmark on the company sheet."],
  };
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
  const hasMockBetaPolicyInputs = Boolean(company.betaPolicyInputs);

  const waccBundle = selectedBenchmark ? await computeWaccForCompany(company) : null;
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
  const hasMockWaccScaffoldInputs = Boolean(company.waccFoundationInputs);

  const forecastFadeBundle = selectedBenchmark
    ? await computeForecastFadeForCompany(company)
    : null;
  const forecastFadeInput = forecastFadeBundle?.input ?? {
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
  };
  const forecastFadeResult = forecastFadeBundle?.result ?? {
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
  };

  const reinvestmentFcffBundle = selectedBenchmark
    ? await computeReinvestmentFcffForCompany(company)
    : null;
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

  const terminalValueBundle = selectedBenchmark
    ? await computeTerminalValueForCompany(company)
    : null;
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

  const dcfPvBundle = selectedBenchmark
    ? await computeDcfPvForCompany(company)
    : null;
  const dcfPvInput = dcfPvBundle?.input ?? {
    companyId: company.identity.cleanTicker,
    selectedBenchmark: "",
    forecastPeriods: [
      {
        yearNumber: 1,
        forecastYear: "",
        fcff: null,
      },
    ],
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

  const equityBridgeBundle = selectedBenchmark
    ? await computeEquityBridgeForCompany(company)
    : null;
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

  const intrinsicValueBundle = selectedBenchmark
    ? await computeIntrinsicValueForCompany(company)
    : null;
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
  return (
    <section className="pageSection">
      <div>
        <BackLink href="/companies" label="Back to Companies" />
        <h2 className="sectionHeading">Company Workspace</h2>
        <p className="sectionSubheading">
          {company.identity.companyName} ({company.identity.fullTicker}) company-specific
          valuation engine results workspace. Data source:{" "}
          {source === "firestore" ? "Firestore" : "Mock"}.
        </p>
      </div>

      <div className="panel">
        <p>
          Global Valuation Engine logic will remain shared, while this workspace stores
          company-specific output paths and review status.
        </p>
      </div>

      <div className="tabsRow" aria-label="Workspace sections">
        {workspaceSections.map((section) => (
          <span key={section} className="tabPill">
            {section}
          </span>
        ))}
      </div>

      <div className="cardGrid">
        <article className="card">
          <h3 className="cardTitle">Snapshot</h3>
          <p className="cardMeta">Country of risk: {company.identity.countryOfRisk}</p>
          <p className="cardMeta">Website: {company.identity.websiteUrl}</p>
          <p className="cardMeta">
            Currency: {company.currencies.reportingCurrency} /{" "}
            {company.currencies.valuationCurrency}
          </p>
        </article>
        <article className="card">
          <h3 className="cardTitle">Inputs</h3>
          <p className="cardMeta">
            Current price:{" "}
            {formatPerShare(company.marketInputs.currentPrice, {
              currency: company.currencies.valuationCurrency,
            })}
          </p>
          <p className="cardMeta">
            Market cap (m):{" "}
            {formatAmountMillions(company.marketInputs.marketCap, {
              valueScale: "absolute",
              currency: company.currencies.valuationCurrency,
            })}
          </p>
          <p className="cardMeta">
            Riskfree rate: {formatPercent(company.riskWaccInputs.riskfreeRate)}
          </p>
        </article>
        <article className="card">
          <h3 className="cardTitle">Industry Benchmark Config Scaffold</h3>
          <p className="cardMeta">
            Benchmark-first scaffold only. No beta/WACC/FCFF calculation is executed from this
            mapping in this phase.
          </p>
          <label className="cardMeta" htmlFor="benchmark-select">
            Selected Damodaran Industrial Benchmark (Primary)
          </label>
          <select id="benchmark-select" defaultValue={selectedBenchmark} disabled>
            <option value="">Select benchmark</option>
            {benchmarkUniverse.data.map((row) => (
              <option key={row.id} value={row.damodaranIndustrialBenchmark}>
                {row.damodaranIndustrialBenchmark}
              </option>
            ))}
          </select>
          <p className="cardMeta" style={{ marginTop: "0.5rem" }}>
            Current selection: {selectedBenchmark || "Mapping Required"}
          </p>
          <p className="cardMeta">
            ISM-sector (Derived display-only):{" "}
            {selectedIsmRow?.ismSectorDisplay ?? "Mapping Required"}
          </p>
          <p className="cardMeta">
            ISM display use: {selectedIsmRow?.use ?? "Display only - no model-driving effect"}
          </p>
          <p className="cardMeta">
            Template Status: {benchmarkConfig?.templateStatus ?? "Review Required"}
          </p>
          <p className="cardMeta">
            Default Stage Recommendation:{" "}
            {benchmarkConfig?.defaultStageRecommendation ?? "Review Required"}
          </p>
          <p className="cardMeta">
            History Recommendation: {benchmarkConfig?.historyRecommendation ?? "Review Required"}
          </p>
          <p className="cardMeta">
            Cyclicality Flag: {benchmarkConfig?.cyclicalityFlag ?? "Review Required"}
          </p>
          <p className="cardMeta">
            Asset Intensity: {benchmarkConfig?.assetIntensity ?? "Review Required"}
          </p>
          <p className="cardMeta">
            Regulatory Flag: {benchmarkConfig?.regulatoryFlag ?? "Review Required"}
          </p>
          <p className="cardMeta">
            Pull Keys (tblBenchmarkDataPullKeys):{" "}
            {pullKeys
              ? `${pullKeys.betaTableKey}, ${pullKeys.marginTableKey}, ${pullKeys.reinvestmentTableKey}`
              : "Mapping Required"}
          </p>
          <p className="cardMeta">
            No valuation math is derived from this section in this phase.
          </p>
          <p className="cardMeta">
            Stage/history/cyclicality fields are support context from exact v1.5 tables.
          </p>
          <p className="cardMeta">ISM-sector is display-only and not a primary driver input.</p>
          <p className="cardMeta">
            Configured benchmark universe count: {benchmarkUniverse.data.length}
          </p>
        </article>
        <BetaReferenceCard
          selectedBenchmark={selectedBenchmark}
          lookup={betaLookup}
          readiness={betaReadiness}
        />
        <BetaPolicyCard policy={betaPolicy} showMockCapitalNote={hasMockBetaPolicyInputs} />
        <WaccFoundationCard
          input={waccInput}
          readiness={waccReadiness}
          result={waccResult}
          showMockScaffoldNote={hasMockWaccScaffoldInputs}
        />
        <ForecastFadeFoundationCard input={forecastFadeInput} result={forecastFadeResult} />
        <ReinvestmentFcffFoundationCard
          input={reinvestmentFcffInput}
          result={reinvestmentFcffResult}
        />
        <TerminalValueFoundationCard
          input={terminalValueInput}
          result={terminalValueResult}
        />
        <DcfPvFoundationCard input={dcfPvInput} result={dcfPvResult} />
        <EquityBridgeFoundationCard input={equityBridgeInput} result={equityBridgeResult} />
        <IntrinsicValueFoundationCard
          input={intrinsicValueInput}
          result={intrinsicValueResult}
        />
        <article className="card">
          <h3 className="cardTitle">Historical Data</h3>
          <p className="cardMeta">Periods: {company.availableHistoricalPeriods.join(", ")}</p>
          <p className="cardMeta">
            LTM Revenue (m):{" "}
            {formatAmountMillions(company.historicalData.incomeStatement.revenue.LTM, {
              currency: company.currencies.reportingCurrency,
            })}
          </p>
          <p className="cardMeta">
            LTM FCF (m):{" "}
            {formatAmountMillions(company.historicalData.cashFlow.freeCashFlow.LTM, {
              currency: company.currencies.reportingCurrency,
            })}
          </p>
        </article>
        <article className="card">
          <h3 className="cardTitle">Forecast Data</h3>
          <p className="cardMeta">
            Y+1 growth:{" "}
            {formatPercent(company.forecastData.baseCaseRevenueGrowthByPeriod.YEAR_PLUS_1)}
          </p>
          <p className="cardMeta">
            Y+3 margin:{" "}
            {formatPercent(company.forecastData.baseCaseOperatingMarginByPeriod.YEAR_PLUS_3)}
          </p>
          <p className="cardMeta">{company.forecastData.narrative}</p>
        </article>
        <ValuationEnginesStatusCard />
        <article className="card">
          <h3 className="cardTitle">Review & Decision</h3>
          <p className="cardMeta">Worst severity: {company.reviewSummary.worstSeverity}</p>
          <p className="cardMeta">
            Decision: {company.valuationResult.decisionResult.decisionStatus}
          </p>
          <p className="cardMeta">{company.valuationResult.decisionResult.statusNote}</p>
        </article>
        <article className="card">
          <h3 className="cardTitle">Notes / Sources</h3>
          <p className="cardMeta">Phase 2 uses mock placeholders only.</p>
          <p className="cardMeta">No API calls, Firestore, or valuation formulas yet.</p>
        </article>
      </div>

      <div className="panel">
        <p>
          <strong>Decision status:</strong>{" "}
          {company.valuationResult.decisionResult.decisionStatus}
        </p>
        <p>
          <strong>Review flag:</strong> {company.reviewSummary.worstSeverity}
        </p>
        <p>
          <strong>Status note:</strong> {company.valuationResult.decisionResult.statusNote}
        </p>
        <p>
          <strong>Last updated:</strong> {company.lastUpdated}
        </p>
      </div>
    </section>
  );
}
