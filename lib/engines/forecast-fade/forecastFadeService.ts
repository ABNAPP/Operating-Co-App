import "server-only";

import type { CompanyDataModel } from "@/lib/types/company";
import type { ForecastFadeInput, ForecastFadeResult } from "@/lib/types/forecast-fade-engine";
import { getIndustryBenchmarkConfigByBenchmark } from "@/lib/firestore/repositories/sectorIndustryMappingRepository";
import { computeForecastFadeFromInput } from "@/lib/engines/forecast-fade/forecastFadeRules";

function countKeys(record: Record<string, unknown> | null | undefined) {
  return record ? Object.keys(record).length : 0;
}

function buildForecastAvailabilityFromCompany(company: CompanyDataModel) {
  const revenuePeriods = Object.keys(company.forecastData?.baseCaseRevenueGrowthByPeriod ?? {});
  const marginPeriods = Object.keys(company.forecastData?.baseCaseOperatingMarginByPeriod ?? {});

  const manualForecastYearsAvailable = Math.max(revenuePeriods.length, marginPeriods.length);
  const historicalYearsAvailable = company.availableHistoricalPeriods?.length ?? 0;

  return {
    manualForecastYearsAvailable,
    historicalYearsAvailable,
    hasRevenueForecast: revenuePeriods.length > 0,
    hasMarginForecast: marginPeriods.length > 0,
    hasReinvestmentInputs: countKeys(company.forecastData?.capexAsPercentRevenueByPeriod) > 0,
    hasTerminalAssumptions: Boolean(company.terminalValueInputs),
  };
}

export async function buildForecastFadeInputForCompany(
  company: CompanyDataModel,
): Promise<ForecastFadeInput> {
  const companyId = company.identity.cleanTicker;
  const selectedBenchmark = company.identity.damodaranIndustrialBenchmark ?? "";

  const config = selectedBenchmark
    ? await getIndustryBenchmarkConfigByBenchmark(selectedBenchmark)
    : { data: null, error: "Missing selected benchmark", source: "mock" as const };

  const availability = buildForecastAvailabilityFromCompany(company);

  return {
    companyId,
    selectedBenchmark,
    templateStatus: config.data?.status ?? null,
    defaultStageRecommendation: config.data?.defaultStageType ?? null,
    historyRecommendation: config.data?.historyRecommendation ?? null,
    cyclicalityFlag: config.data?.cyclicalityFlag ?? null,
    assetIntensity: config.data?.assetIntensity ?? null,
    regulatoryFlag: config.data?.regulatoryFlag ?? null,
    ...availability,
    notes: [
      "Forecast & Fade foundation only — recommendations/readiness only; no revenue/margin/FCFF math.",
      "Damodaran Industrial Benchmark is the primary industry anchor; ISM-sector is display-only.",
      config.error ? `Industry Benchmark Config lookup error: ${config.error}` : "",
    ].filter(Boolean),
  };
}

export async function computeForecastFadeForCompany(
  company: CompanyDataModel,
): Promise<{ input: ForecastFadeInput; result: ForecastFadeResult }> {
  const input = await buildForecastFadeInputForCompany(company);
  return { input, result: computeForecastFadeFromInput(input) };
}

