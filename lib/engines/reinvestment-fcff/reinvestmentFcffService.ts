import "server-only";

import type { CompanyDataModel } from "@/lib/types/company";
import type { ForecastPeriod } from "@/lib/types/periods";
import type { ReinvestmentFcffInput, ReinvestmentFcffResult } from "@/lib/types/reinvestment-fcff-engine";
import { computeReinvestmentFcffFromInput } from "@/lib/engines/reinvestment-fcff/reinvestmentFcffMath";
import { getIndustryBenchmarkConfigByBenchmark } from "@/lib/firestore/repositories/sectorIndustryMappingRepository";

function pickForecastYear(company: CompanyDataModel): ForecastPeriod {
  const years = Object.keys(company.forecastData?.baseCaseRevenueGrowthByPeriod ?? {}) as ForecastPeriod[];
  if (years.includes("YEAR_PLUS_1")) return "YEAR_PLUS_1";
  return years[0] ?? "YEAR_PLUS_1";
}

function computeNonCashWorkingCapital(company: CompanyDataModel, period: "LATEST_FY"): number | null {
  const wc = company.historicalData.workingCapital;
  const receivables = wc.receivables[period];
  const inventory = wc.inventory[period];
  const accountsPayable = wc.accountsPayable[period];

  // deferredRevenue is treated as a non-cash working capital component in this foundation.
  // If missing, we consider the change-in-NWC unavailable.
  const deferredRevenue = wc.deferredRevenue[period];
  if (
    !Number.isFinite(receivables) ||
    !Number.isFinite(inventory) ||
    !Number.isFinite(accountsPayable) ||
    deferredRevenue === undefined
  ) {
    return null;
  }

  return receivables + inventory - accountsPayable - deferredRevenue;
}

export async function buildReinvestmentFcffInputForCompany(
  company: CompanyDataModel,
): Promise<ReinvestmentFcffInput> {
  const forecastYear = pickForecastYear(company);
  const selectedBenchmark = company.identity.damodaranIndustrialBenchmark ?? "";

  const latestRevenue = company.historicalData.incomeStatement.revenue.LATEST_FY;
  const growth = company.forecastData?.baseCaseRevenueGrowthByPeriod?.[forecastYear] ?? null;
  const revenue = Number.isFinite(growth) ? latestRevenue * (1 + (growth as number)) : null;

  const priorRevenue = latestRevenue ?? null;

  const margin = company.forecastData?.baseCaseOperatingMarginByPeriod?.[forecastYear] ?? null;
  const ebit = revenue !== null && margin !== null ? revenue * margin : null;

  const taxRate = company.forecastInputs?.targetTaxRate ?? null;

  const capexPct = company.forecastData?.capexAsPercentRevenueByPeriod?.[forecastYear] ?? null;
  const capex = revenue !== null && capexPct !== null ? revenue * capexPct : null;

  // Foundation proxy: scale historical depreciation ratio into the forecast year.
  const depLatest = company.historicalData.cashFlow.depreciationAndAmortization.LATEST_FY;
  const depreciationAmortization =
    revenue !== null && latestRevenue !== null && latestRevenue !== 0 ? revenue * (depLatest / latestRevenue) : null;

  // Foundation proxy: scale historical non-cash working capital ratio into the forecast year.
  const nonCashWcLatest = computeNonCashWorkingCapital(company, "LATEST_FY");
  const changeInNonCashWorkingCapital =
    revenue !== null && nonCashWcLatest !== null && latestRevenue !== 0
      ? revenue * (nonCashWcLatest / latestRevenue) - nonCashWcLatest
      : null;

  // For foundation QA scaffold: explicitly omit non-cash working capital change on Disney
  // to test Review/Missing behavior.
  const changeInNonCashWorkingCapitalScaffold =
    company.identity.cleanTicker === "DIS" ? null : changeInNonCashWorkingCapital;

  const sourceNotes: string[] = [
    "Reinvestment / FCFF foundation — structure/math only; not connected to Terminal Value, intrinsic value, or Dashboard decisions.",
    "Mock / foundation scaffold inputs — not live company data.",
  ];

  const config = selectedBenchmark
    ? await getIndustryBenchmarkConfigByBenchmark(selectedBenchmark)
    : { data: null, error: null, source: "mock" as const };

  if (config.data) {
    const cyclicalityFlag = config.data.cyclicalityFlag ?? "";
    const assetIntensity = config.data.assetIntensity ?? "";
    if (/(cyclical|commodity)/i.test(cyclicalityFlag) || assetIntensity.toLowerCase() === "high") {
      sourceNotes.push("Cyclical / high asset intensity benchmark context — review reinvestment/FCFF structure.");
    }
  }

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
    changeInNonCashWorkingCapital: changeInNonCashWorkingCapitalScaffold,

    salesToCapital: null,
    methodOverride: null,
    sourceNotes,
  };
}

export async function computeReinvestmentFcffForCompany(company: CompanyDataModel): Promise<{
  input: ReinvestmentFcffInput;
  result: ReinvestmentFcffResult;
}> {
  const input = await buildReinvestmentFcffInputForCompany(company);
  return { input, result: computeReinvestmentFcffFromInput(input) };
}

export function computeReinvestmentFcffFromInputWrapper(input: ReinvestmentFcffInput): ReinvestmentFcffResult {
  return computeReinvestmentFcffFromInput(input);
}

