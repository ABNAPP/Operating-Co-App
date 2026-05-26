/**
 * Forecast & Fade foundation QA — run: node scripts/qa-forecast-fade-foundation.mjs
 */
import { readFileSync } from "node:fs";
import { mockCompanies } from "../lib/mock-companies.ts";
import { computeForecastFadeFromInput } from "../lib/engines/forecast-fade/forecastFadeRules.ts";

function loadBenchmarkConfigTableFromSpec() {
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
  const cells = tableBody.split("\r").map((value) => value.trim()).filter(Boolean);

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

function buildInputFromCompany(company, configRow) {
  const revenuePeriods = Object.keys(company.forecastData?.baseCaseRevenueGrowthByPeriod ?? {});
  const marginPeriods = Object.keys(company.forecastData?.baseCaseOperatingMarginByPeriod ?? {});

  return {
    companyId: company.identity.cleanTicker,
    selectedBenchmark: company.identity.damodaranIndustrialBenchmark ?? "",
    templateStatus: configRow?.templateStatus ?? null,
    defaultStageRecommendation: configRow?.defaultStageRecommendation ?? null,
    historyRecommendation: configRow?.historyRecommendation ?? null,
    cyclicalityFlag: configRow?.cyclicalityFlag ?? null,
    assetIntensity: configRow?.assetIntensity ?? null,
    regulatoryFlag: configRow?.regulatoryFlag ?? null,
    manualForecastYearsAvailable: Math.max(revenuePeriods.length, marginPeriods.length),
    historicalYearsAvailable: company.availableHistoricalPeriods?.length ?? 0,
    hasRevenueForecast: revenuePeriods.length > 0,
    hasMarginForecast: marginPeriods.length > 0,
    hasReinvestmentInputs: Object.keys(company.forecastData?.capexAsPercentRevenueByPeriod ?? {}).length > 0,
    hasTerminalAssumptions: Boolean(company.terminalValueInputs),
    notes: ["QA script input build — service integration tested separately."],
  };
}

async function runCase(cleanTicker) {
  const company = mockCompanies.find((row) => row.identity.cleanTicker === cleanTicker);
  if (!company) {
    throw new Error(`Missing mock company: ${cleanTicker}`);
  }

  const benchmark = company.identity.damodaranIndustrialBenchmark;
  const table = loadBenchmarkConfigTableFromSpec();
  const configRow = table.find((row) => row.damodaranIndustrialBenchmark === benchmark) ?? null;
  const input = buildInputFromCompany(company, configRow);
  const result = computeForecastFadeFromInput(input);

  console.log(
    JSON.stringify({
      company: cleanTicker,
      benchmark,
      templateStatus: input.templateStatus,
      stage: result.recommendedStageType,
      forecastYears: result.recommendedForecastYears,
      historyYears: result.recommendedHistoryYears,
      readiness: result.readinessStatus,
      cyclicalityReviewRequired: result.cyclicalityReviewRequired,
      benchmarkReviewRequired: result.benchmarkReviewRequired,
      missingInputs: result.missingInputs,
      warnings: result.warnings,
    }),
  );

  if (!result.recommendedStageType) {
    throw new Error(`${cleanTicker}: expected recommended stage type`);
  }
  if (!result.recommendedHistoryYears) {
    throw new Error(`${cleanTicker}: expected recommended history years`);
  }
  if (!["Ready", "Review", "Missing", "Not Applicable"].includes(result.readinessStatus)) {
    throw new Error(`${cleanTicker}: unexpected readiness status: ${result.readinessStatus}`);
  }

  return { input, result };
}

await runCase("MSFT");
await runCase("DIS");
await runCase("VOLV-B");

// Missing / invalid benchmark
const missingInput = {
  companyId: "MISSING",
  selectedBenchmark: "Nonexistent Industry XYZ",
  templateStatus: null,
  defaultStageRecommendation: null,
  historyRecommendation: null,
  cyclicalityFlag: null,
  assetIntensity: null,
  regulatoryFlag: null,
  manualForecastYearsAvailable: 0,
  historicalYearsAvailable: 0,
  hasRevenueForecast: false,
  hasMarginForecast: false,
  hasReinvestmentInputs: false,
  hasTerminalAssumptions: false,
  notes: [],
};
const missingResult = computeForecastFadeFromInput(missingInput);
if (missingResult.readinessStatus !== "Missing") {
  throw new Error(`Missing benchmark case should be Missing, got: ${missingResult.readinessStatus}`);
}
console.log("qa-forecast-fade-foundation: missing benchmark assertion passed");

