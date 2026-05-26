export type ForecastFadeReadinessStatus = "Ready" | "Review" | "Missing" | "Not Applicable";

export type ForecastFadeStageType = "1-stage" | "2-stage" | "3-stage" | "n-stage" | "Unknown";

export interface ForecastFadeInput {
  companyId: string;
  selectedBenchmark: string;
  templateStatus: string | null;
  defaultStageRecommendation: string | null;
  historyRecommendation: string | null;
  cyclicalityFlag: string | null;
  assetIntensity: string | null;
  regulatoryFlag: string | null;
  manualForecastYearsAvailable: number;
  historicalYearsAvailable: number;
  hasRevenueForecast: boolean;
  hasMarginForecast: boolean;
  hasReinvestmentInputs: boolean;
  hasTerminalAssumptions: boolean;
  notes: string[];
}

export interface ForecastFadeResult {
  recommendedStageType: ForecastFadeStageType | null;
  recommendedForecastYears: number | null;
  recommendedHistoryYears: number | null;
  fadeRequired: boolean | null;
  fadeStartYear: number | null;
  fadeToStableYear: number | null;
  cyclicalityReviewRequired: boolean;
  benchmarkReviewRequired: boolean;
  readinessStatus: ForecastFadeReadinessStatus;
  missingInputs: string[];
  warnings: string[];
  notes: string[];
}

