/**
 * Terminal Value foundation QA — run: node scripts/qa-terminal-value-foundation.mjs
 */
import { readFileSync } from "node:fs";
import { mockCompanies } from "../lib/mock-companies.ts";
import { computeReinvestmentFcffFromInput } from "../lib/engines/reinvestment-fcff/reinvestmentFcffMath.ts";
import { computeTerminalValueFromInput } from "../lib/engines/terminal-value/terminalValueMath.ts";

function loadIndustryBenchmarkConfigFromSpec() {
  const text = readFileSync(
    "data/spec/Operating_Co_Template_Master_Specification_v1_5.txt",
    "utf8",
  );

  const marker = "Table - tblIndustryBenchmarkConfig";
  const markerIndex = text.indexOf(marker);
  if (markerIndex === -1) {
    throw new Error("Spec table marker not found: Table - tblIndustryBenchmarkConfig");
  }

  const header =
    "Damodaran Industrial Benchmark\rTemplate Status\rDefault Stage Recommendation\rHistory Recommendation\rCyclicality Flag\rAsset Intensity\rRegulatory Flag\r";
  const headerIndex = text.indexOf(header, markerIndex);
  if (headerIndex === -1) {
    throw new Error("Spec header not found for tblIndustryBenchmarkConfig");
  }

  const dataStart = headerIndex + header.length;
  const nextTableIndex = text.indexOf("Table - ", dataStart);
  if (nextTableIndex === -1) {
    throw new Error("Next table marker not found after tblIndustryBenchmarkConfig");
  }

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

function buildReinvestmentInput(company, { forecastYear, omitChangeInNWC, omitEBIT } = {}) {
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

  const capexPct =
    company.forecastData?.capexAsPercentRevenueByPeriod?.[forecastYear] ?? null;
  const capex = revenue !== null && capexPct !== null ? revenue * capexPct : null;

  const depLatest = company.historicalData.cashFlow.depreciationAndAmortization.LATEST_FY;
  const depreciationAmortization =
    revenue !== null && latestRevenue !== null && latestRevenue !== 0 ? revenue * (depLatest / latestRevenue) : null;

  const nonCashWcLatest = computeNonCashWorkingCapital(company, "LATEST_FY");
  const changeInNonCashWorkingCapital =
    revenue !== null && nonCashWcLatest !== null && latestRevenue !== 0
      ? revenue * (nonCashWcLatest / latestRevenue) - nonCashWcLatest
      : null;

  const sourceNotes = [
    "Reinvestment / FCFF foundation — structure/math only; not connected to Terminal Value, intrinsic value, or Dashboard decisions.",
    "Mock / foundation scaffold inputs — not live company data.",
  ];
  if (cyclicalNote) sourceNotes.push(cyclicalNote);

  const input = {
    companyId: company.identity.cleanTicker,
    selectedBenchmark,
    forecastYear,
    revenue,
    priorRevenue,
    ebit: omitEBIT ? null : ebit,
    taxRate,
    capex,
    depreciationAmortization,
    changeInNonCashWorkingCapital: omitChangeInNWC ? null : changeInNonCashWorkingCapital,
    salesToCapital: null,
    methodOverride: null,
    sourceNotes,
  };

  return input;
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

function buildTerminalInputFromCompany(company, { omitChangeInNWC } = {}) {
  const forecastYear = "YEAR_PLUS_1";

  const reinvestmentInput = buildReinvestmentInput(company, { forecastYear, omitChangeInNWC });
  const reinvestmentResult = computeReinvestmentFcffFromInput(reinvestmentInput);

  const stableGrowthRate = company.terminalValueInputs?.terminalGrowthRate ?? null;
  const stableWacc = company.valuationResult?.riskWaccResult?.wacc ?? null;

  const terminalInput = {
    companyId: company.identity.cleanTicker,
    selectedBenchmark: company.identity.damodaranIndustrialBenchmark ?? "",
    finalForecastYear: forecastYear,
    finalForecastFcff: reinvestmentResult.fcff,
    stableGrowthRate: Number.isFinite(stableGrowthRate) ? stableGrowthRate : null,
    stableWacc: Number.isFinite(stableWacc) ? stableWacc : null,
    terminalMethod: company.terminalValueInputs?.terminalMethod ?? null,
    forecastFadeStatus: "Ready",
    waccStatus: "Ready",
    fcffStatus: reinvestmentResult.status,
    sourceNotes: [
      ...reinvestmentInput.sourceNotes,
      "Terminal Value foundation calculates terminal FCFF and Gordon terminal value only. No DCF/PV discounting, no bridge, no intrinsic value, or Dashboard decision logic.",
      "Scaffold stable growth and terminal method come from company template inputs (terminalValueInputs) — not live company data.",
    ],
  };

  return { reinvestmentInput, reinvestmentResult, terminalInput };
}

// 1) MSFT complete input: Gordon terminal value should compute.
{
  const { terminalInput, reinvestmentResult } = buildTerminalInputFromCompany(companies.MSFT, {
    omitChangeInNWC: false,
  });
  const result = computeTerminalValueFromInput(terminalInput);

  console.log("MSFT terminal:", JSON.stringify({ status: result.status, terminalFcff: result.terminalFcff, terminalValue: result.terminalValue, reinvestmentStatus: reinvestmentResult.status }));

  assert(result.terminalFcff !== null, "MSFT: expected terminal FCFF to compute");
  assert(result.terminalValue !== null, "MSFT: expected Gordon terminal value to compute");
  assert(["Ready", "Review"].includes(result.status), `MSFT: unexpected status: ${result.status}`);
}

// 2) DIS incomplete input: no fake terminal value.
{
  const { terminalInput } = buildTerminalInputFromCompany(companies.DIS, { omitChangeInNWC: true });
  const result = computeTerminalValueFromInput(terminalInput);

  console.log("DIS terminal:", JSON.stringify({ status: result.status, terminalFcff: result.terminalFcff, terminalValue: result.terminalValue }));

  assert(result.terminalFcff === null, "DIS: expected terminal FCFF to remain null when FCFF foundation is incomplete");
  assert(result.terminalValue === null, "DIS: expected terminal value to remain null when FCFF is missing");
  assert(["Review", "Missing"].includes(result.status), `DIS: expected Review/Missing, got: ${result.status}`);
}

// 3) VOLV-B complete/cyclical input: terminal value calculates, and review note applies.
{
  const { terminalInput } = buildTerminalInputFromCompany(companies.VOLV_B, { omitChangeInNWC: false });
  const result = computeTerminalValueFromInput(terminalInput);

  console.log("VOLV-B terminal:", JSON.stringify({ status: result.status, terminalFcff: result.terminalFcff, terminalValue: result.terminalValue, warnings: result.warnings }));

  assert(result.terminalFcff !== null, "VOLV-B: expected terminal FCFF to compute");
  assert(result.terminalValue !== null, "VOLV-B: expected Gordon terminal value to compute with foundation inputs");
  assert(result.status === "Review", `VOLV-B: expected Review due to cyclical/high context, got: ${result.status}`);
  assert(
    result.notes.some((n) => /Cyclical \/ high asset intensity/i.test(n)),
    "VOLV-B: expected cyclical/high context note in terminal result notes",
  );
}

// 4) stable growth >= stable WACC: terminal value should be null with warning.
{
  const { terminalInput } = buildTerminalInputFromCompany(companies.MSFT, { omitChangeInNWC: false });
  const stableWacc = terminalInput.stableWacc;
  assert(stableWacc !== null, "MSFT: stableWacc expected");

  const brokenInput = {
    ...terminalInput,
    stableGrowthRate: stableWacc + 0.001,
  };
  const result = computeTerminalValueFromInput(brokenInput);

  console.log("MSFT spread invalid:", JSON.stringify({ status: result.status, terminalValue: result.terminalValue, warnings: result.warnings }));

  assert(result.terminalValue === null, "Expected terminal value null when stable growth >= stable WACC");
  assert(result.warnings.length > 0, "Expected warning when stable growth >= stable WACC");
}

// 5) missing final forecast FCFF: terminal value should be null.
{
  const { terminalInput } = buildTerminalInputFromCompany(companies.MSFT, { omitChangeInNWC: false });
  const missingInput = {
    ...terminalInput,
    finalForecastFcff: null,
  };
  const result = computeTerminalValueFromInput(missingInput);

  console.log("MSFT missing FCFF:", JSON.stringify({ status: result.status, terminalValue: result.terminalValue, missingInputs: result.missingInputs }));

  assert(result.terminalValue === null, "Expected terminal value null when final forecast FCFF is missing");
  assert(result.status === "Missing", `Expected Missing status, got: ${result.status}`);
}

// 6) Hybrid requested method: Gordon still computed for review, with not-implemented note.
{
  const { terminalInput } = buildTerminalInputFromCompany(companies.MSFT, { omitChangeInNWC: false });
  const hybridInput = {
    ...terminalInput,
    terminalMethod: "Hybrid",
  };
  const result = computeTerminalValueFromInput(hybridInput);

  assert(result.terminalValue !== null, "Hybrid QA: expected Gordon foundation output for review");
  assert(result.status === "Review", `Hybrid QA: expected Review, got: ${result.status}`);
  assert(
    result.warnings.some((w) => /Hybrid/i.test(w) || /not implemented/i.test(w)),
    "Hybrid QA: expected not-implemented warning",
  );
}

console.log("qa-terminal-value-foundation: all assertions passed");

