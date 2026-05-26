/**
 * Reinvestment / FCFF foundation QA — run: node scripts/qa-reinvestment-fcff-foundation.mjs
 */
import { readFileSync } from "node:fs";
import { mockCompanies } from "../lib/mock-companies.ts";
import { computeReinvestmentFcffFromInput } from "../lib/engines/reinvestment-fcff/reinvestmentFcffMath.ts";

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

function buildInput(company, { forecastYear, omitChangeInNWC, omitEBIT } = {}) {
  const selectedBenchmark = company.identity.damodaranIndustrialBenchmark ?? "";
  const rows = loadIndustryBenchmarkConfigFromSpec();
  const cyclicalNote = getCyclicalContextNoteForBenchmark(rows, selectedBenchmark);

  const latestRevenue = company.historicalData.incomeStatement.revenue.LATEST_FY;
  const growth =
    company.forecastData?.baseCaseRevenueGrowthByPeriod?.[forecastYear] ?? null;
  const revenue = growth !== null ? latestRevenue * (1 + growth) : null;
  const priorRevenue = latestRevenue ?? null;

  const margin =
    company.forecastData?.baseCaseOperatingMarginByPeriod?.[forecastYear] ?? null;
  const computedEbit = revenue !== null && margin !== null ? revenue * margin : null;
  const ebit = omitEBIT ? null : computedEbit;

  const taxRate = company.forecastInputs?.targetTaxRate ?? null;

  const capexPct =
    company.forecastData?.capexAsPercentRevenueByPeriod?.[forecastYear] ?? null;
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
    "Reinvestment / FCFF foundation — structure/math only; not connected to Terminal Value, intrinsic value, or Dashboard decisions.",
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
    changeInNonCashWorkingCapital: omitChangeInNWC
      ? null
      : changeInNonCashWorkingCapital,

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

// 1) MSFT complete input: Direct Method should compute NOPAT + reinvestment + FCFF.
{
  const input = buildInput(companies.MSFT, { forecastYear: "YEAR_PLUS_1" });
  const result = computeReinvestmentFcffFromInput(input);

  console.log("MSFT:", JSON.stringify({ status: result.status, nopat: result.nopat, reinvestment: result.reinvestment, fcff: result.fcff }));

  assert(result.nopat !== null, "MSFT: expected NOPAT to compute");
  assert(result.reinvestment !== null, "MSFT: expected reinvestment to compute");
  assert(result.fcff !== null, "MSFT: expected FCFF to compute");
}

// 2) DIS incomplete input: reinvestment inputs omitted => no fake FCFF.
{
  const input = buildInput(companies.DIS, { forecastYear: "YEAR_PLUS_1", omitChangeInNWC: true });
  const result = computeReinvestmentFcffFromInput(input);

  console.log("DIS:", JSON.stringify({ status: result.status, nopat: result.nopat, reinvestment: result.reinvestment, fcff: result.fcff }));

  assert(result.reinvestment === null, "DIS: expected reinvestment to be null due to missing non-cash working capital change");
  assert(result.fcff === null, "DIS: expected FCFF to remain null when reinvestment is missing");
  assert(result.status === "Review" || result.status === "Missing", "DIS: expected status Review/Missing");
}

// 3) VOLV-B complete input: should compute and include cyclicality context review note.
{
  const input = buildInput(companies.VOLV_B, { forecastYear: "YEAR_PLUS_1" });
  const result = computeReinvestmentFcffFromInput(input);

  console.log("VOLV-B:", JSON.stringify({ status: result.status, nopat: result.nopat, reinvestment: result.reinvestment, fcff: result.fcff }));

  assert(result.nopat !== null, "VOLV-B: expected NOPAT to compute");
  assert(result.reinvestment !== null, "VOLV-B: expected reinvestment to compute");
  assert(result.fcff !== null, "VOLV-B: expected FCFF to compute");
  assert(result.status === "Review", "VOLV-B: expected Review due to cyclical/high asset intensity context");
}

// 4) Missing EBIT: NOPAT null and FCFF null.
{
  const input = buildInput(companies.MSFT, { forecastYear: "YEAR_PLUS_1", omitEBIT: true });
  const result = computeReinvestmentFcffFromInput(input);

  console.log("Missing EBIT:", JSON.stringify({ status: result.status, nopat: result.nopat, reinvestment: result.reinvestment, fcff: result.fcff }));

  assert(result.nopat === null, "Expected NOPAT null when EBIT is missing");
  assert(result.fcff === null, "Expected FCFF null when NOPAT is missing");
  assert(result.status === "Missing", "Expected Missing status when EBIT/tax are incomplete");
}

console.log("qa-reinvestment-fcff-foundation: all assertions passed");

