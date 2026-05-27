/**
 * MOS / Decision Layer foundation QA — run: node scripts/qa-mos-decision-foundation.mjs
 */
import { readFileSync } from "node:fs";
import { mockCompanies } from "../lib/mock-companies.ts";
import { computeReinvestmentFcffFromInput } from "../lib/engines/reinvestment-fcff/reinvestmentFcffMath.ts";
import { computeTerminalValueFromInput } from "../lib/engines/terminal-value/terminalValueMath.ts";
import { computeDcfPvFromInput } from "../lib/engines/dcf-pv/dcfPvMath.ts";
import { computeEquityBridgeFromInput } from "../lib/engines/equity-bridge/equityBridgeMath.ts";
import { computeIntrinsicValueFromInput } from "../lib/engines/intrinsic-value/intrinsicValueMath.ts";
import { computeMosDecisionFromInput } from "../lib/engines/mos-decision/mosDecisionMath.ts";

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
  return { equityBridgeInput, equityBridgeResult };
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

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

const companies = {
  MSFT: mockCompanies.find((c) => c.identity.cleanTicker === "MSFT"),
  DIS: mockCompanies.find((c) => c.identity.cleanTicker === "DIS"),
  VOLV_B: mockCompanies.find((c) => c.identity.cleanTicker === "VOLV-B"),
};

if (!companies.MSFT || !companies.DIS || !companies.VOLV_B) {
  throw new Error("Missing required mock companies: MSFT/DIS/VOLV-B");
}

function buildMosInputFromIntrinsic(company, intrinsicInput, intrinsicResult, overrides = {}) {
  const requiredMOS = company.decisionLayerInputs?.minimumMOSForApprove ?? null;

  return {
    companyId: company.identity.cleanTicker,
    selectedBenchmark: company.identity.damodaranIndustrialBenchmark ?? "",

    intrinsicValuePerShare: intrinsicResult.intrinsicValuePerShare,
    intrinsicValueCurrency: intrinsicResult.valuationCurrency ?? company.currencies.valuationCurrency ?? null,
    intrinsicStatus: intrinsicResult.status,

    currentSharePrice: company.marketInputs?.currentPrice ?? null,
    priceCurrency: company.currencies.tradingCurrency ?? null,
    fxRateToValuationCurrency: intrinsicInput.fxRateToValuationCurrency ?? null,

    requiredMOS,
    requiredMOSSource: "DecisionLayerInputs.minimumMOSForApprove (scaffold)",

    sourceNotes: [
      ...intrinsicInput.sourceNotes,
      ...intrinsicResult.notes,
      "MOS / Decision Layer foundation calculates upside/downside and entry price only.",
    ],
    ...overrides,
  };
}

// 1) MSFT complete
{
  const company = companies.MSFT;
  const intrinsicInput = buildIntrinsicInputFromCompany(company, { omitChangeInNWC: false });
  const intrinsicResult = computeIntrinsicValueFromInput(intrinsicInput);

  const mosInput = buildMosInputFromIntrinsic(company, intrinsicInput, intrinsicResult);
  const result = computeMosDecisionFromInput(mosInput);

  console.log(
    "MSFT MOS/Decision:",
    JSON.stringify({
      status: result.status,
      upsideDownside: result.upsideDownsidePercent,
      mos: result.marginOfSafetyPercent,
      entryPrice: result.entryPrice,
      decisionOutcome: result.decisionOutcome,
    }),
  );

  assert(result.status === "Ready", `MSFT: expected Ready got ${result.status}`);
  assert(result.entryPrice !== null, "MSFT: expected entry price when required MOS exists");
  assert(result.decisionOutcome !== null, "MSFT: expected decision outcome when required MOS exists");
  assert(result.marginOfSafetyPercent !== null, "MSFT: expected MOS percent");

  const expectedUpside =
    (intrinsicResult.intrinsicValuePerShare - mosInput.currentSharePrice) / mosInput.currentSharePrice;
  assert(Math.abs(result.upsideDownsidePercent - expectedUpside) < 1e-9, "MSFT: upside/downside mismatch");
}

// 2) DIS incomplete: no fake MOS/decision
{
  const company = companies.DIS;
  const intrinsicInput = buildIntrinsicInputFromCompany(company, { omitChangeInNWC: true });
  const intrinsicResult = computeIntrinsicValueFromInput(intrinsicInput);
  const mosInput = buildMosInputFromIntrinsic(company, intrinsicInput, intrinsicResult);

  const result = computeMosDecisionFromInput(mosInput);

  console.log(
    "DIS MOS/Decision:",
    JSON.stringify({
      status: result.status,
      entryPrice: result.entryPrice,
      decisionOutcome: result.decisionOutcome,
    }),
  );

  assert(result.status === "Missing", `DIS: expected Missing got ${result.status}`);
  assert(result.entryPrice === null, "DIS: entry price must be null when intrinsic missing");
  assert(result.decisionOutcome === null, "DIS: decision must be null when intrinsic missing");
  assert(result.marginOfSafetyPercent === null, "DIS: MOS percent must be null when intrinsic missing");
}

// 3) VOLV-B complete but may be Review due to upstream context
{
  const company = companies.VOLV_B;
  const intrinsicInput = buildIntrinsicInputFromCompany(company, { omitChangeInNWC: false });
  const intrinsicResult = computeIntrinsicValueFromInput(intrinsicInput);
  const mosInput = buildMosInputFromIntrinsic(company, intrinsicInput, intrinsicResult);

  const result = computeMosDecisionFromInput(mosInput);

  console.log(
    "VOLV-B MOS/Decision:",
    JSON.stringify({
      status: result.status,
      entryPrice: result.entryPrice,
      decisionOutcome: result.decisionOutcome,
    }),
  );

  assert(intrinsicResult.intrinsicValuePerShare !== null, "VOLV-B: expected intrinsic value per share");
  assert(result.marginOfSafetyPercent !== null, "VOLV-B: expected MOS percent when intrinsic/current exist");
  assert(result.entryPrice !== null, "VOLV-B: expected entry price when required MOS exists");
  if (intrinsicResult.status === "Review") {
    assert(result.status === "Review", "VOLV-B: expected Review when intrinsic status is Review");
  }
}

// 4) Missing current price
{
  const company = companies.MSFT;
  const intrinsicInput = buildIntrinsicInputFromCompany(company, { omitChangeInNWC: false });
  const intrinsicResult = computeIntrinsicValueFromInput(intrinsicInput);
  const mosInput = buildMosInputFromIntrinsic(company, intrinsicInput, intrinsicResult, {
    currentSharePrice: null,
  });

  const result = computeMosDecisionFromInput(mosInput);
  console.log("Missing current price:", JSON.stringify({ status: result.status }));
  assert(result.status === "Missing", `Expected Missing got ${result.status}`);
  assert(result.marginOfSafetyPercent === null, "Expected null MOS when current price missing");
  assert(result.entryPrice === null, "Expected null entry price when current price missing");
}

// 5) current price <= 0
{
  const company = companies.MSFT;
  const intrinsicInput = buildIntrinsicInputFromCompany(company, { omitChangeInNWC: false });
  const intrinsicResult = computeIntrinsicValueFromInput(intrinsicInput);
  const mosInput = buildMosInputFromIntrinsic(company, intrinsicInput, intrinsicResult, {
    currentSharePrice: 0,
  });

  const result = computeMosDecisionFromInput(mosInput);
  console.log("Invalid current price:", JSON.stringify({ status: result.status }));
  assert(["Missing", "Review"].includes(result.status), `Expected Missing/Review got ${result.status}`);
  assert(result.marginOfSafetyPercent === null, "Expected null MOS when current price invalid");
  assert(result.entryPrice === null, "Expected null entry price when current price invalid");
}

// 6) Missing required MOS: no fake entry price / final decision
{
  const company = companies.MSFT;
  const intrinsicInput = buildIntrinsicInputFromCompany(company, { omitChangeInNWC: false });
  const intrinsicResult = computeIntrinsicValueFromInput(intrinsicInput);
  const mosInput = buildMosInputFromIntrinsic(company, intrinsicInput, intrinsicResult, {
    requiredMOS: null,
    requiredMOSSource: null,
  });

  const result = computeMosDecisionFromInput(mosInput);
  console.log(
    "Missing required MOS:",
    JSON.stringify({ status: result.status, entryPrice: result.entryPrice, outcome: result.decisionOutcome }),
  );

  assert(result.status === "Review", `Expected Review got ${result.status}`);
  assert(result.entryPrice === null, "Expected entry price null when required MOS missing");
  assert(result.decisionOutcome === null, "Expected decision outcome null when required MOS missing");
  assert(result.marginOfSafetyPercent !== null, "Expected MOS percent still computable without required MOS");
}

console.log("qa-mos-decision-foundation: all assertions passed");

