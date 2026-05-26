/**
 * Firm-to-Equity Bridge foundation QA — run: node scripts/qa-equity-bridge-foundation.mjs
 */
import { readFileSync } from "node:fs";
import { mockCompanies } from "../lib/mock-companies.ts";
import { computeReinvestmentFcffFromInput } from "../lib/engines/reinvestment-fcff/reinvestmentFcffMath.ts";
import { computeTerminalValueFromInput } from "../lib/engines/terminal-value/terminalValueMath.ts";
import { computeDcfPvFromInput } from "../lib/engines/dcf-pv/dcfPvMath.ts";
import { computeEquityBridgeFromInput } from "../lib/engines/equity-bridge/equityBridgeMath.ts";

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

function resolveTotalDebt(bridge) {
  const notes = [];
  const grossDebt = bridge.grossDebt;
  const leaseLiabilities = bridge.leaseLiabilities;

  if (!Number.isFinite(grossDebt)) {
    return { totalDebt: null, notes: ["Gross debt missing"] };
  }

  const lease = Number.isFinite(leaseLiabilities) ? leaseLiabilities : 0;
  notes.push("Total Debt = Gross Debt + Lease Liabilities (not net debt).");
  return { totalDebt: grossDebt + lease, notes };
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
  const totalDebtResolved = resolveTotalDebt(bridge);

  const otherNonEquityClaims =
    Number.isFinite(bridge.pensionDeficit) && Number.isFinite(bridge.otherClaims)
      ? bridge.pensionDeficit + bridge.otherClaims
      : Number.isFinite(bridge.pensionDeficit)
        ? bridge.pensionDeficit
        : Number.isFinite(bridge.otherClaims)
          ? bridge.otherClaims
          : null;

  return {
    companyId: company.identity.cleanTicker,
    selectedBenchmark: company.identity.damodaranIndustrialBenchmark ?? "",
    valueOfOperatingAssets: dcfPvResult.valueOfOperatingAssets,
    cashAndCashEquivalents: Number.isFinite(bridge.cashAndCashEquivalents)
      ? bridge.cashAndCashEquivalents
      : null,
    nonOperatingAssets: Number.isFinite(bridge.marketableSecurities)
      ? bridge.marketableSecurities
      : null,
    totalDebt: totalDebtResolved.totalDebt,
    preferredEquity: Number.isFinite(bridge.preferredEquity) ? bridge.preferredEquity : null,
    minorityInterest: Number.isFinite(bridge.minorityInterest) ? bridge.minorityInterest : null,
    otherNonEquityClaims,
    sourceNotes: [
      ...dcfPvResult.notes,
      ...totalDebtResolved.notes,
      "Firm-to-Equity Bridge foundation — mock/scaffold bridge inputs only.",
    ],
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

// 1) MSFT complete
{
  const input = buildEquityBridgeInputFromCompany(companies.MSFT, { omitChangeInNWC: false });
  const result = computeEquityBridgeFromInput(input);

  console.log(
    "MSFT equity bridge:",
    JSON.stringify({
      status: result.status,
      valueOfOperatingAssets: result.valueOfOperatingAssets,
      totalAdditions: result.totalAdditions,
      totalDeductions: result.totalDeductions,
      equityValue: result.equityValue,
    }),
  );

  assert(result.valueOfOperatingAssets !== null, "MSFT: expected Value of Operating Assets");
  assert(result.equityValue !== null, "MSFT: expected Equity Value");
  assert(result.totalAdditions !== null && result.totalDeductions !== null, "MSFT: expected bridge totals");

  const expected =
    result.valueOfOperatingAssets +
    result.totalAdditions -
    result.totalDeductions;
  assert(Math.abs(result.equityValue - expected) < 0.01, "MSFT: equity value formula mismatch");
}

// 2) DIS incomplete — no fake equity value
{
  const input = buildEquityBridgeInputFromCompany(companies.DIS, { omitChangeInNWC: true });
  const result = computeEquityBridgeFromInput(input);

  console.log(
    "DIS equity bridge:",
    JSON.stringify({
      status: result.status,
      valueOfOperatingAssets: result.valueOfOperatingAssets,
      equityValue: result.equityValue,
    }),
  );

  assert(result.equityValue === null, "DIS: expected Equity Value null when operating assets missing");
  assert(["Review", "Missing"].includes(result.status), `DIS: expected Review/Missing got ${result.status}`);
}

// 3) VOLV-B complete
{
  const input = buildEquityBridgeInputFromCompany(companies.VOLV_B, { omitChangeInNWC: false });
  const result = computeEquityBridgeFromInput(input);

  console.log(
    "VOLV-B equity bridge:",
    JSON.stringify({
      status: result.status,
      valueOfOperatingAssets: result.valueOfOperatingAssets,
      equityValue: result.equityValue,
    }),
  );

  assert(result.valueOfOperatingAssets !== null, "VOLV-B: expected Value of Operating Assets");
  assert(result.equityValue !== null, "VOLV-B: expected Equity Value");
}

// 4) Missing Value of Operating Assets
{
  const input = buildEquityBridgeInputFromCompany(companies.MSFT, { omitChangeInNWC: false });
  const broken = { ...input, valueOfOperatingAssets: null };
  const result = computeEquityBridgeFromInput(broken);

  console.log(
    "Missing operating assets:",
    JSON.stringify({ status: result.status, equityValue: result.equityValue }),
  );

  assert(result.equityValue === null, "Expected Equity Value null when operating assets missing");
  assert(result.status === "Missing", `Expected Missing got ${result.status}`);
}

console.log("qa-equity-bridge-foundation: all assertions passed");
