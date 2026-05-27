/**
 * Dashboard decision integration mapping QA — run:
 * node scripts/qa-dashboard-decision-integration-foundation.mjs
 */
import { readFileSync } from "node:fs";
import { mockCompanies } from "../lib/mock-companies.ts";
import { mapDashboardDecisionIntegrationFromFoundationBundle } from "../lib/engines/dashboard-decision/dashboardDecisionMapping.ts";
import { computeReinvestmentFcffFromInput } from "../lib/engines/reinvestment-fcff/reinvestmentFcffMath.ts";
import { computeTerminalValueFromInput } from "../lib/engines/terminal-value/terminalValueMath.ts";
import { computeDcfPvFromInput } from "../lib/engines/dcf-pv/dcfPvMath.ts";
import { computeEquityBridgeFromInput } from "../lib/engines/equity-bridge/equityBridgeMath.ts";
import { computeIntrinsicValueFromInput } from "../lib/engines/intrinsic-value/intrinsicValueMath.ts";
import { computeMosDecisionFromInput } from "../lib/engines/mos-decision/mosDecisionMath.ts";

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

function loadIndustryBenchmarkConfigFromSpec() {
  const text = readFileSync(
    "data/spec/Operating_Co_Template_Master_Specification_v1_5.txt",
    "utf8",
  );
  const marker = "Table - tblIndustryBenchmarkConfig";
  const markerIndex = text.indexOf(marker);
  if (markerIndex === -1) throw new Error("Spec table marker not found");

  const header =
    "Damodaran Industrial Benchmark\rTemplate Status\rDefault Stage Recommendation\rHistory Recommendation\rCyclicality Flag\rAsset Intensity\rRegulatory Flag\r";
  const headerIndex = text.indexOf(header, markerIndex);
  if (headerIndex === -1) throw new Error("Spec header not found");

  const dataStart = headerIndex + header.length;
  const nextTableIndex = text.indexOf("Table - ", dataStart);
  if (nextTableIndex === -1) throw new Error("Next table marker not found");

  const tableBody = text.slice(dataStart, nextTableIndex);
  const cells = tableBody.split("\r").map((v) => v.trim()).filter(Boolean);

  const rows = [];
  for (let i = 0; i + 6 < cells.length; i += 7) {
    rows.push({
      damodaranIndustrialBenchmark: cells[i],
      cyclicalityFlag: cells[i + 4],
      assetIntensity: cells[i + 5],
    });
  }
  return rows;
}

function getCyclicalContextNoteForBenchmark(rows, benchmark) {
  const row = rows.find((r) => r.damodaranIndustrialBenchmark === benchmark) ?? null;
  if (!row) return null;
  const cyc = String(row.cyclicalityFlag ?? "").toLowerCase();
  const assetIntensity = String(row.assetIntensity ?? "").toLowerCase();
  if (cyc.includes("cyclical") || cyc.includes("commodity") || assetIntensity === "high") {
    return "Cyclical / high asset intensity benchmark context — review reinvestment/FCFF structure.";
  }
  return null;
}

function computeNonCashWorkingCapital(company, periodKey) {
  const wc = company.historicalData.workingCapital;
  const receivables = wc.receivables[periodKey];
  const inventory = wc.inventory[periodKey];
  const accountsPayable = wc.accountsPayable[periodKey];
  const deferredRevenue = wc.deferredRevenue[periodKey];

  if (![receivables, inventory, accountsPayable, deferredRevenue].every((v) => Number.isFinite(v))) {
    return null;
  }
  return receivables + inventory - accountsPayable - deferredRevenue;
}

function buildReinvestmentInput(company, { forecastYear, omitChangeInNWC } = {}) {
  const selectedBenchmark = company.identity.damodaranIndustrialBenchmark ?? "";
  const rows = loadIndustryBenchmarkConfigFromSpec();
  const cyclicalNote = getCyclicalContextNoteForBenchmark(rows, selectedBenchmark);

  const latestRevenue = company.historicalData.incomeStatement.revenue.LATEST_FY;
  const growth = company.forecastData?.baseCaseRevenueGrowthByPeriod?.[forecastYear] ?? null;
  const revenue = growth !== null ? latestRevenue * (1 + growth) : null;

  const margin = company.forecastData?.baseCaseOperatingMarginByPeriod?.[forecastYear] ?? null;
  const ebit = revenue !== null && margin !== null ? revenue * margin : null;

  const taxRate = company.forecastInputs?.targetTaxRate ?? null;

  const capexPct = company.forecastData?.capexAsPercentRevenueByPeriod?.[forecastYear] ?? null;
  const capex = revenue !== null && capexPct !== null ? revenue * capexPct : null;

  const depLatest = company.historicalData.cashFlow.depreciationAndAmortization.LATEST_FY;
  const depreciationAmortization =
    revenue !== null && latestRevenue !== null && latestRevenue !== 0
      ? revenue * (depLatest / latestRevenue)
      : null;

  const nonCashWcLatest = computeNonCashWorkingCapital(company, "LATEST_FY");
  const changeInNonCashWorkingCapital =
    revenue !== null && nonCashWcLatest !== null && latestRevenue !== 0
      ? revenue * (nonCashWcLatest / latestRevenue) - nonCashWcLatest
      : null;

  const sourceNotes = [
    "Reinvestment / FCFF foundation — structure/math only.",
    "Mock / foundation scaffold inputs — not live company data.",
  ];
  if (cyclicalNote) sourceNotes.push(cyclicalNote);

  return {
    companyId: company.identity.cleanTicker,
    selectedBenchmark,
    forecastYear,
    revenue,
    priorRevenue: latestRevenue ?? null,
    ebit,
    taxRate,
    capex,
    depreciationAmortization,
    changeInNonCashWorkingCapital: omitChangeInNWC ? null : changeInNonCashWorkingCapital,
    salesToCapital: null,
    methodOverride: null,
    sourceNotes,
  };
}

function buildEquityBridgeInputFromCompany(company, { omitChangeInNWC } = {}) {
  const forecastYear = "YEAR_PLUS_1";
  const reinvestmentInput = buildReinvestmentInput(company, { forecastYear, omitChangeInNWC });
  const reinvestmentResult = computeReinvestmentFcffFromInput(reinvestmentInput);

  const terminalInput = {
    companyId: company.identity.cleanTicker,
    selectedBenchmark: company.identity.damodaranIndustrialBenchmark ?? "",
    finalForecastYear: forecastYear,
    finalForecastFcff: reinvestmentResult.fcff,
    stableGrowthRate: company.terminalValueInputs?.terminalGrowthRate ?? null,
    stableWacc: company.valuationResult?.riskWaccResult?.wacc ?? null,
    terminalMethod: company.terminalValueInputs?.terminalMethod ?? null,
    forecastFadeStatus: "Ready",
    waccStatus: "Review",
    fcffStatus: reinvestmentResult.status,
    sourceNotes: [...reinvestmentInput.sourceNotes],
  };
  const terminalResult = computeTerminalValueFromInput(terminalInput);

  const dcfPvInput = {
    companyId: company.identity.cleanTicker,
    selectedBenchmark: company.identity.damodaranIndustrialBenchmark ?? "",
    forecastPeriods: [{ yearNumber: 1, forecastYear, fcff: reinvestmentResult.fcff }],
    terminalYearNumber: 1,
    terminalValue: terminalResult.terminalValue,
    terminalValueStatus: terminalResult.status,
    wacc: terminalInput.stableWacc,
    waccStatus: terminalInput.waccStatus,
    sourceNotes: [
      ...terminalInput.sourceNotes,
      "DCF/PV foundation calculates discounting only (PV of forecast FCFF + PV of terminal value).",
    ],
  };

  const dcfPvResult = computeDcfPvFromInput(dcfPvInput);
  const bridge = company.balanceSheetBridgeInputs;
  const grossDebt = bridge.grossDebt;
  const lease = Number.isFinite(bridge.leaseLiabilities) ? bridge.leaseLiabilities : 0;
  const totalDebt = Number.isFinite(grossDebt) ? grossDebt + lease : null;

  const otherNonEquityClaims =
    Number.isFinite(bridge.pensionDeficit) && Number.isFinite(bridge.otherClaims)
      ? bridge.pensionDeficit + bridge.otherClaims
      : Number.isFinite(bridge.pensionDeficit)
        ? bridge.pensionDeficit
        : Number.isFinite(bridge.otherClaims)
          ? bridge.otherClaims
          : null;

  const equityBridgeInput = {
    companyId: company.identity.cleanTicker,
    selectedBenchmark: company.identity.damodaranIndustrialBenchmark ?? "",
    valueOfOperatingAssets: dcfPvResult.valueOfOperatingAssets,
    cashAndCashEquivalents: Number.isFinite(bridge.cashAndCashEquivalents)
      ? bridge.cashAndCashEquivalents
      : null,
    nonOperatingAssets: Number.isFinite(bridge.marketableSecurities)
      ? bridge.marketableSecurities
      : null,
    totalDebt,
    preferredEquity: Number.isFinite(bridge.preferredEquity) ? bridge.preferredEquity : null,
    minorityInterest: Number.isFinite(bridge.minorityInterest) ? bridge.minorityInterest : null,
    otherNonEquityClaims,
    sourceNotes: [...dcfPvResult.notes],
  };

  const equityBridgeResult = computeEquityBridgeFromInput(equityBridgeInput);
  return { equityBridgeResult };
}

function buildIntrinsicInputFromCompany(company, { omitChangeInNWC } = {}) {
  const { equityBridgeResult } = buildEquityBridgeInputFromCompany(company, { omitChangeInNWC });
  const scaffold = company.intrinsicValueFoundationInputs ?? null;

  const sourceNotes = [
    "Intrinsic Value / Share foundation — mock/scaffold inputs only.",
    ...(scaffold?.notes ? [scaffold.notes] : []),
    ...(equityBridgeResult.notes ?? []),
  ];

  return {
    companyId: company.identity.cleanTicker,
    selectedBenchmark: company.identity.damodaranIndustrialBenchmark ?? "",
    equityValue: equityBridgeResult.equityValue,
    equityValueCurrency: company.currencies.valuationCurrency ?? null,
    selectedDilutedShares: scaffold?.selectedDilutedShares ?? null,
    shareUnit: scaffold?.shareUnit ?? null,
    selectedSharesSource: scaffold?.selectedSharesSource ?? null,
    currentSharePrice: scaffold?.currentSharePrice ?? company.marketInputs?.currentPrice ?? null,
    priceCurrency: scaffold?.priceCurrency ?? company.currencies.tradingCurrency ?? null,
    fxRateToValuationCurrency: scaffold?.fxRateToValuationCurrency ?? 1,
    sourceNotes,
  };
}

function buildMosInputFromIntrinsic(company, intrinsicInput, intrinsicResult, overrides = {}) {
  const requiredMOS = company.decisionLayerInputs?.minimumMOSForApprove ?? null;

  return {
    companyId: company.identity.cleanTicker,
    selectedBenchmark: company.identity.damodaranIndustrialBenchmark ?? "",
    intrinsicValuePerShare: intrinsicResult.intrinsicValuePerShare,
    intrinsicValueCurrency:
      intrinsicResult.valuationCurrency ?? company.currencies.valuationCurrency ?? null,
    intrinsicStatus: intrinsicResult.status,
    currentSharePrice: company.marketInputs?.currentPrice ?? null,
    priceCurrency: company.currencies.tradingCurrency ?? null,
    fxRateToValuationCurrency: intrinsicInput.fxRateToValuationCurrency ?? null,
    requiredMOS,
    requiredMOSSource: requiredMOS !== null ? "DecisionLayerInputs.minimumMOSForApprove (scaffold)" : null,
    sourceNotes: [
      ...intrinsicInput.sourceNotes,
      ...intrinsicResult.notes,
      "MOS / Decision Layer foundation calculates upside/downside and entry price only.",
    ],
    ...overrides,
  };
}

function buildFoundationBundleForCompany(company, { omitChangeInNWC } = {}) {
  const intrinsicInput = buildIntrinsicInputFromCompany(company, { omitChangeInNWC });
  const intrinsicResult = computeIntrinsicValueFromInput(intrinsicInput);
  const mosInput = buildMosInputFromIntrinsic(company, intrinsicInput, intrinsicResult);
  const mosResult = computeMosDecisionFromInput(mosInput);

  return {
    betaPolicy: null,
    wacc: null,
    forecastFade: null,
    reinvestmentFcff: null,
    terminalValue: null,
    dcfPv: null,
    equityBridge: null,
    intrinsicValue: { input: intrinsicInput, result: intrinsicResult },
    mosDecision: { input: mosInput, result: mosResult },
  };
}

const companies = {
  MSFT: mockCompanies.find((c) => c.identity.cleanTicker === "MSFT"),
  DIS: mockCompanies.find((c) => c.identity.cleanTicker === "DIS"),
  VOLV_B: mockCompanies.find((c) => c.identity.cleanTicker === "VOLV-B"),
};

if (!companies.MSFT || !companies.DIS || !companies.VOLV_B) {
  throw new Error("Missing required mock companies: MSFT/DIS/VOLV-B");
}

// 1) MSFT — maps intrinsic/MOS/entry from precomputed bundle (mapping-only path).
{
  const company = companies.MSFT;
  const bundle = buildFoundationBundleForCompany(company, { omitChangeInNWC: false });
  const mapped = mapDashboardDecisionIntegrationFromFoundationBundle(company, bundle);

  console.log(
    "MSFT dashboard integration:",
    JSON.stringify({
      status: mapped.status,
      intrinsicValuePerShare: mapped.intrinsicValuePerShare,
      entryPrice: mapped.entryPrice,
      foundationDecisionOutcome: mapped.foundationDecisionOutcome,
      dashboardDecisionIntegrationStatus: mapped.dashboardDecisionIntegrationStatus,
    }),
  );

  assert(mapped.dashboardDecisionIntegrationStatus === "Foundation", "MSFT: expected Foundation layer status");
  assert(mapped.status === "Ready", `MSFT: expected Ready got ${mapped.status}`);
  assert(mapped.intrinsicValuePerShare !== null, "MSFT: intrinsic must be mapped from bundle");
  assert(mapped.entryPrice === bundle.mosDecision.result.entryPrice, "MSFT: entry price must match MOS bundle");
  assert(mapped.foundationDecisionOutcome === bundle.mosDecision.result.decisionOutcome, "MSFT: outcome must match MOS");
  assert(mapped.marginOfSafetyPercent === bundle.mosDecision.result.marginOfSafetyPercent, "MSFT: MOS must match");
}

// 2) DIS — Missing / N/A, no fake decision.
{
  const company = companies.DIS;
  const bundle = buildFoundationBundleForCompany(company, { omitChangeInNWC: true });
  const mapped = mapDashboardDecisionIntegrationFromFoundationBundle(company, bundle);

  console.log(
    "DIS dashboard integration:",
    JSON.stringify({
      status: mapped.status,
      foundationDecisionOutcome: mapped.foundationDecisionOutcome,
      entryPrice: mapped.entryPrice,
    }),
  );

  assert(mapped.status === "Missing", `DIS: expected Missing got ${mapped.status}`);
  assert(mapped.foundationDecisionOutcome === "N/A", "DIS: outcome must be N/A");
  assert(mapped.entryPrice === null, "DIS: entry price must be null");
}

// 3) VOLV-B — Review can propagate from upstream/cyclical MOS context.
{
  const company = companies.VOLV_B;
  const bundle = buildFoundationBundleForCompany(company, { omitChangeInNWC: false });
  const mapped = mapDashboardDecisionIntegrationFromFoundationBundle(company, bundle);

  console.log(
    "VOLV-B dashboard integration:",
    JSON.stringify({
      status: mapped.status,
      mosFoundationStatus: mapped.mosFoundationStatus,
      reviewSeverity: mapped.reviewSeverity,
      foundationDecisionOutcome: mapped.foundationDecisionOutcome,
    }),
  );

  assert(mapped.status === "Review", `VOLV-B: expected Review got ${mapped.status}`);
  assert(mapped.mosFoundationStatus === "Review", "VOLV-B: MOS foundation status should be Review");
  assert(
    mapped.reviewSeverity === "Review Required" || mapped.reviewSeverity === "Not Ready",
    "VOLV-B: review severity should reflect foundation Review",
  );
}

// 4) Missing intrinsic in bundle → Missing / N/A.
{
  const company = companies.MSFT;
  const bundle = buildFoundationBundleForCompany(company, { omitChangeInNWC: false });
  bundle.intrinsicValue.result.intrinsicValuePerShare = null;
  bundle.intrinsicValue.result.status = "Missing";
  bundle.mosDecision = {
    input: {
      ...bundle.mosDecision.input,
      intrinsicValuePerShare: null,
      intrinsicStatus: "Missing",
    },
    result: computeMosDecisionFromInput({
      ...bundle.mosDecision.input,
      intrinsicValuePerShare: null,
      intrinsicStatus: "Missing",
    }),
  };

  const mapped = mapDashboardDecisionIntegrationFromFoundationBundle(company, bundle);
  assert(mapped.status === "Missing", `Missing intrinsic: expected Missing got ${mapped.status}`);
  assert(mapped.foundationDecisionOutcome === "N/A", "Missing intrinsic: outcome must be N/A");
}

// 5) Missing MOS/current price → Missing/Review, no fake decision.
{
  const company = companies.MSFT;
  const bundle = buildFoundationBundleForCompany(company, { omitChangeInNWC: false });
  bundle.mosDecision = {
    input: {
      ...bundle.mosDecision.input,
      currentSharePrice: null,
    },
    result: computeMosDecisionFromInput({
      ...bundle.mosDecision.input,
      currentSharePrice: null,
    }),
  };

  const mapped = mapDashboardDecisionIntegrationFromFoundationBundle(company, bundle);
  assert(
    mapped.status === "Missing" || mapped.status === "Review",
    `Missing price: expected Missing/Review got ${mapped.status}`,
  );
  assert(mapped.foundationDecisionOutcome === "N/A", "Missing price: outcome must be N/A");
}

// 6) Precomputed bundle path is synchronous mapping-only (no foundation service import in mapping module).
{
  const mappingSource = readFileSync(
    "lib/engines/dashboard-decision/dashboardDecisionMapping.ts",
    "utf8",
  );
  assert(
    !mappingSource.includes("computeCompanyFoundationBundle"),
    "Mapping module must not call computeCompanyFoundationBundle",
  );
  assert(
    !mappingSource.includes("computeMosDecisionForCompany"),
    "Mapping module must not call MOS service",
  );
  assert(
    !mappingSource.includes("computeIntrinsicValueForCompany"),
    "Mapping module must not call intrinsic service",
  );

  const company = companies.MSFT;
  const bundle = buildFoundationBundleForCompany(company, { omitChangeInNWC: false });
  const mapped = mapDashboardDecisionIntegrationFromFoundationBundle(company, bundle);
  assert(mapped.cleanTicker === "MSFT", "Precomputed bundle mapping should return company id");
}

function assertNoForbiddenOfficialDecisionWording(mapped, label) {
  const outcome = String(mapped.foundationDecisionOutcome ?? "");
  assert(
    outcome === "Above Required MOS" || outcome === "Below Required MOS" || outcome === "N/A",
    `${label}: foundation outcome must be MOS foundation values only`,
  );
  assert(!/approve|watchlist|buy|sell|hold/i.test(outcome), `${label}: outcome must not be Buy/Sell/Hold or legacy mock`);
  const guardrailFields = [mapped.status, mapped.dashboardDecisionIntegrationStatus].join(" ");
  assert(!/gateway|hard gate|shadow valuation/i.test(guardrailFields.toLowerCase()), `${label}: no gateway/hard gate/shadow valuation status`);
}

// 7) Dashboard presentation fields — MSFT (Ready, intrinsic/MOS/entry/outcome).
{
  const company = companies.MSFT;
  const bundle = buildFoundationBundleForCompany(company, { omitChangeInNWC: false });
  const mapped = mapDashboardDecisionIntegrationFromFoundationBundle(company, bundle);

  assert(mapped.dashboardDecisionIntegrationStatus === "Foundation", "MSFT dashboard: Foundation layer");
  assert(mapped.intrinsicValuePerShare !== null, "MSFT dashboard: intrinsic required");
  assert(mapped.entryPrice !== null, "MSFT dashboard: entry price required");
  assert(mapped.foundationDecisionOutcome !== "N/A", "MSFT dashboard: foundation outcome required");
  assertNoForbiddenOfficialDecisionWording(mapped, "MSFT dashboard");
}

// 8) DIS — Missing / N/A, no fake official decision.
{
  const company = companies.DIS;
  const bundle = buildFoundationBundleForCompany(company, { omitChangeInNWC: true });
  const mapped = mapDashboardDecisionIntegrationFromFoundationBundle(company, bundle);

  assert(mapped.status === "Missing", `DIS dashboard: expected Missing got ${mapped.status}`);
  assert(mapped.foundationDecisionOutcome === "N/A", "DIS dashboard: outcome N/A");
  assert(mapped.entryPrice === null, "DIS dashboard: no fake entry price");
  assertNoForbiddenOfficialDecisionWording(mapped, "DIS dashboard");
}

// 9) VOLV-B — Review from upstream/cyclical MOS context.
{
  const company = companies.VOLV_B;
  const bundle = buildFoundationBundleForCompany(company, { omitChangeInNWC: false });
  const mapped = mapDashboardDecisionIntegrationFromFoundationBundle(company, bundle);

  assert(mapped.status === "Review", `VOLV-B dashboard: expected Review got ${mapped.status}`);
  assertNoForbiddenOfficialDecisionWording(mapped, "VOLV-B dashboard");
}

// 10) Legacy mock decision is separate from foundation outcome (presentation contract).
{
  const company = companies.MSFT;
  const bundle = buildFoundationBundleForCompany(company, { omitChangeInNWC: false });
  const mapped = mapDashboardDecisionIntegrationFromFoundationBundle(company, bundle);
  const legacyMock = company.valuationResult?.decisionResult?.decisionStatus ?? "Approve";

  assert(
    legacyMock !== mapped.foundationDecisionOutcome,
    "Legacy mock decision must not equal foundation MOS outcome",
  );
  assert(
    mapped.foundationDecisionOutcome === "Below Required MOS" ||
      mapped.foundationDecisionOutcome === "Above Required MOS",
    "MSFT foundation outcome remains MOS foundation wording",
  );
}

console.log("qa-dashboard-decision-integration-foundation: all assertions passed");
