/**
 * DCF / PV foundation QA — run: node scripts/qa-dcf-pv-foundation.mjs
 */
import { readFileSync } from "node:fs";
import { mockCompanies } from "../lib/mock-companies.ts";
import { computeReinvestmentFcffFromInput } from "../lib/engines/reinvestment-fcff/reinvestmentFcffMath.ts";
import { computeTerminalValueFromInput } from "../lib/engines/terminal-value/terminalValueMath.ts";
import { computeDcfPvFromInput } from "../lib/engines/dcf-pv/dcfPvMath.ts";

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
      templateStatus: cells[i + 1],
      defaultStageRecommendation: cells[i + 2],
      historyRecommendation: cells[i + 3],
      cyclicalityFlag: cells[i + 4],
      assetIntensity: cells[i + 5],
      regulatoryFlag: cells[i + 6],
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
  const priorRevenue = latestRevenue ?? null;

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
    "Reinvestment / FCFF foundation — structure/math only; no terminal value, intrinsic value, or dashboard decisions.",
    "Mock / foundation scaffold inputs — not live company data.",
  ];
  if (cyclicalNote) sourceNotes.push(cyclicalNote);

  return {
    companyId: company.identity.cleanTicker,
    selectedBenchmark,
    forecastYear,
    revenue,
    priorRevenue,
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

function buildDcfPvInputFromReinvestmentAndTerminal({ company, omitChangeInNWC } = {}) {
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
    sourceNotes: [
      ...reinvestmentInput.sourceNotes,
      "Terminal Value foundation calculates terminal FCFF and Gordon terminal value only. No DCF/PV discounting, no bridge, no intrinsic value, or Dashboard decision logic.",
      "Scaffold stable growth and terminal method come from company template inputs (terminalValueInputs) — not live company data.",
    ],
  };

  const terminalResult = computeTerminalValueFromInput(terminalInput);

  const dcfPvInput = {
    companyId: company.identity.cleanTicker,
    selectedBenchmark: company.identity.damodaranIndustrialBenchmark ?? "",
    forecastPeriods: [
      {
        yearNumber: 1,
        forecastYear,
        fcff: reinvestmentResult.fcff,
      },
    ],
    terminalYearNumber: 1,
    terminalValue: terminalResult.terminalValue,
    terminalValueStatus: terminalResult.status,
    wacc: terminalInput.stableWacc,
    waccStatus: terminalInput.waccStatus,
    sourceNotes: [
      ...terminalInput.sourceNotes,
      "DCF/PV foundation calculates discounting only (PV of forecast FCFF + PV of terminal value).",
      "No equity bridge, equity value, intrinsic value, or Dashboard decision logic in this phase.",
    ],
  };

  return { reinvestmentResult, terminalResult, dcfPvInput };
}

// 1) MSFT complete
{
  const { dcfPvInput, terminalResult, reinvestmentResult } = buildDcfPvInputFromReinvestmentAndTerminal({
    company: companies.MSFT,
    omitChangeInNWC: false,
  });
  const result = computeDcfPvFromInput(dcfPvInput);

  console.log("MSFT DCF/PV:", JSON.stringify({ status: result.status, pvFcff: result.pvForecastFcff, pvTerminal: result.pvTerminalValue, valueOfOperatingAssets: result.valueOfOperatingAssets }));

  assert(result.pvForecastFcff !== null, "MSFT: expected PV of forecast FCFF");
  assert(result.pvTerminalValue !== null, "MSFT: expected PV of terminal value");
  assert(result.valueOfOperatingAssets !== null, "MSFT: expected operating assets value");
  assert(["Ready", "Review"].includes(result.status), `MSFT: unexpected status ${result.status}`);
  assert(result.forecastPeriods[0].discountFactor !== null, "MSFT: expected discount factor to be computed");
  assert(result.forecastPeriods[0].pvFcff !== null, "MSFT: expected pvFcff to be computed");
  assert(reinvestmentResult.fcff !== null, "MSFT: reinvestment fcff should be computed");
  assert(terminalResult.terminalValue !== null, "MSFT: terminal value should be computed");
}

// 2) DIS incomplete: no fake PV / operating assets value
{
  const { dcfPvInput } = buildDcfPvInputFromReinvestmentAndTerminal({
    company: companies.DIS,
    omitChangeInNWC: true,
  });
  const result = computeDcfPvFromInput(dcfPvInput);

  console.log("DIS DCF/PV:", JSON.stringify({ status: result.status, pvFcff: result.pvForecastFcff, pvTerminal: result.pvTerminalValue, valueOfOperatingAssets: result.valueOfOperatingAssets }));

  assert(result.pvForecastFcff === null, "DIS: expected pvForecastFcff null when forecast FCFF missing");
  assert(result.pvTerminalValue === null, "DIS: expected pvTerminalValue null when terminal value missing");
  assert(result.valueOfOperatingAssets === null, "DIS: expected operating assets value null when terminal/forecast PV missing");
  assert(["Review", "Missing"].includes(result.status), `DIS: expected Review/Missing got ${result.status}`);
}

// 3) VOLV-B cyclical/high: PV computes but is flagged for review
{
  const { dcfPvInput } = buildDcfPvInputFromReinvestmentAndTerminal({
    company: companies.VOLV_B,
    omitChangeInNWC: false,
  });
  const result = computeDcfPvFromInput(dcfPvInput);

  console.log("VOLV-B DCF/PV:", JSON.stringify({ status: result.status, pvFcff: result.pvForecastFcff, pvTerminal: result.pvTerminalValue, valueOfOperatingAssets: result.valueOfOperatingAssets, notes: result.notes }));

  assert(result.pvForecastFcff !== null, "VOLV-B: expected pvForecastFcff computed");
  assert(result.pvTerminalValue !== null, "VOLV-B: expected pvTerminalValue computed");
  assert(result.valueOfOperatingAssets !== null, "VOLV-B: expected operating assets value computed");
  assert(result.status === "Review", `VOLV-B: expected Review, got ${result.status}`);
  assert(
    result.notes.some((n) => /Cyclical \/ high asset-intensity review context applies/i.test(n)),
    "VOLV-B: expected cyclical/high review note in PV output",
  );
}

// 4) Missing WACC: PV outputs must be null; Missing/Review status; no crash
{
  const { dcfPvInput } = buildDcfPvInputFromReinvestmentAndTerminal({
    company: companies.MSFT,
    omitChangeInNWC: false,
  });
  const broken = {
    ...dcfPvInput,
    wacc: null,
    waccStatus: "Missing",
  };
  const result = computeDcfPvFromInput(broken);

  console.log("Missing WACC DCF/PV:", JSON.stringify({ status: result.status, pvFcff: result.pvForecastFcff, pvTerminal: result.pvTerminalValue }));

  assert(result.pvForecastFcff === null, "Expected pvForecastFcff null when WACC missing");
  assert(result.pvTerminalValue === null, "Expected pvTerminalValue null when WACC missing");
  assert(result.valueOfOperatingAssets === null, "Expected operating assets value null when WACC missing");
  assert(["Missing", "Review"].includes(result.status), `Expected Missing/Review got ${result.status}`);
}

// 5) Invalid WACC or yearNumber: safe Review/Missing; no crash
{
  const { dcfPvInput } = buildDcfPvInputFromReinvestmentAndTerminal({
    company: companies.MSFT,
    omitChangeInNWC: false,
  });
  const broken = {
    ...dcfPvInput,
    wacc: 0,
    waccStatus: "Review",
  };
  const result = computeDcfPvFromInput(broken);

  console.log("Invalid WACC DCF/PV:", JSON.stringify({ status: result.status, pvFcff: result.pvForecastFcff, pvTerminal: result.pvTerminalValue, warnings: result.warnings }));

  assert(result.pvForecastFcff === null, "Expected pvForecastFcff null when WACC invalid");
  assert(result.pvTerminalValue === null, "Expected pvTerminalValue null when WACC invalid");
  assert(result.valueOfOperatingAssets === null, "Expected operating assets value null when WACC invalid");
  assert(result.status === "Review" || result.status === "Missing", `Expected Review/Missing got ${result.status}`);
}

console.log("qa-dcf-pv-foundation: all assertions passed");

