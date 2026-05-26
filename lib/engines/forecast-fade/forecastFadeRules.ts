import type {
  ForecastFadeInput,
  ForecastFadeResult,
  ForecastFadeStageType,
} from "@/lib/types/forecast-fade-engine";

function normalizeText(value: string | null) {
  return (value ?? "").trim();
}

function parseFirstYearCount(text: string): number | null {
  const match = text.match(/(\d+)\s*Y/i);
  if (!match) return null;
  const value = Number(match[1]);
  return Number.isFinite(value) ? value : null;
}

export function interpretStageRecommendation(value: string | null): {
  stageType: ForecastFadeStageType;
  recommendedForecastYears: number | null;
  fadeRequired: boolean | null;
  fadeStartYear: number | null;
  fadeToStableYear: number | null;
  warnings: string[];
} {
  const text = normalizeText(value).toLowerCase();
  if (!text) {
    return {
      stageType: "Unknown",
      recommendedForecastYears: null,
      fadeRequired: null,
      fadeStartYear: null,
      fadeToStableYear: null,
      warnings: ["Default stage recommendation is missing."],
    };
  }

  const stageType: ForecastFadeStageType = text.includes("3-stage")
    ? "3-stage"
    : text.includes("2-stage")
      ? "2-stage"
      : text.includes("1-stage")
        ? "1-stage"
        : text.includes("n-stage")
          ? "n-stage"
          : "Unknown";

  if (stageType === "Unknown") {
    return {
      stageType,
      recommendedForecastYears: null,
      fadeRequired: null,
      fadeStartYear: null,
      fadeToStableYear: null,
      warnings: [`Unrecognized default stage recommendation: "${normalizeText(value)}".`],
    };
  }

  const recommendedForecastYears =
    stageType === "1-stage"
      ? 5
      : stageType === "2-stage"
        ? 7
        : stageType === "3-stage" || stageType === "n-stage"
          ? 10
          : null;

  const fadeRequired = stageType !== "1-stage";
  const fadeStartYear = fadeRequired ? 4 : null;
  const fadeToStableYear = fadeRequired ? recommendedForecastYears : null;

  return {
    stageType,
    recommendedForecastYears,
    fadeRequired,
    fadeStartYear,
    fadeToStableYear,
    warnings: [],
  };
}

export function interpretHistoryRecommendation(value: string | null): {
  recommendedHistoryYears: number | null;
  warnings: string[];
} {
  const text = normalizeText(value);
  if (!text) {
    return {
      recommendedHistoryYears: null,
      warnings: ["History recommendation is missing."],
    };
  }
  const years = parseFirstYearCount(text);
  if (!years) {
    return {
      recommendedHistoryYears: null,
      warnings: [`Unrecognized history recommendation: "${text}".`],
    };
  }
  return { recommendedHistoryYears: years, warnings: [] };
}

export function isCyclicalityReviewRequired(params: {
  cyclicalityFlag: string | null;
  assetIntensity: string | null;
}): boolean {
  const cyclicality = normalizeText(params.cyclicalityFlag).toLowerCase();
  const assetIntensity = normalizeText(params.assetIntensity).toLowerCase();

  if (
    cyclicality.includes("high") ||
    cyclicality.includes("commodity") ||
    cyclicality.includes("cyclic")
  ) {
    return true;
  }

  if (assetIntensity === "high") {
    return true;
  }

  return false;
}

export function computeForecastFadeReadiness(input: ForecastFadeInput): {
  readinessStatus: ForecastFadeResult["readinessStatus"];
  missingInputs: string[];
  warnings: string[];
  benchmarkReviewRequired: boolean;
  cyclicalityReviewRequired: boolean;
} {
  const missingInputs: string[] = [];
  const warnings: string[] = [];

  if (!normalizeText(input.selectedBenchmark)) {
    missingInputs.push("selected benchmark");
  }
  if (!normalizeText(input.templateStatus)) {
    missingInputs.push("template status");
  }
  if (!normalizeText(input.defaultStageRecommendation)) {
    missingInputs.push("default stage recommendation");
  }
  if (!normalizeText(input.historyRecommendation)) {
    missingInputs.push("history recommendation");
  }
  if (!normalizeText(input.cyclicalityFlag)) {
    missingInputs.push("cyclicality flag");
  }
  if (!normalizeText(input.assetIntensity)) {
    missingInputs.push("asset intensity");
  }
  if (!normalizeText(input.regulatoryFlag)) {
    missingInputs.push("regulatory flag");
  }

  const templateStatus = normalizeText(input.templateStatus).toLowerCase();
  if (templateStatus.includes("excluded")) {
    return {
      readinessStatus: "Not Applicable",
      missingInputs: [],
      warnings: ["Benchmark is excluded / special review and is not eligible for template defaults."],
      benchmarkReviewRequired: true,
      cyclicalityReviewRequired: false,
    };
  }

  const benchmarkReviewRequired =
    templateStatus.includes("review") || templateStatus.includes("mapping") || templateStatus.includes("special");

  const cyclicalityReviewRequired = isCyclicalityReviewRequired({
    cyclicalityFlag: input.cyclicalityFlag,
    assetIntensity: input.assetIntensity,
  });

  if (missingInputs.length > 0) {
    return {
      readinessStatus: "Missing",
      missingInputs,
      warnings,
      benchmarkReviewRequired: true,
      cyclicalityReviewRequired,
    };
  }

  if (!input.hasRevenueForecast || !input.hasMarginForecast) {
    warnings.push(
      "Forecast scaffold inputs are incomplete; this phase only recommends structure and readiness (no forecast math).",
    );
  }

  if (cyclicalityReviewRequired) {
    warnings.push("Cyclicality / capital intensity suggests forecast and fade structure requires review.");
  }

  return {
    readinessStatus: !input.hasRevenueForecast || !input.hasMarginForecast ? "Review" : "Ready",
    missingInputs,
    warnings,
    benchmarkReviewRequired,
    cyclicalityReviewRequired,
  };
}

export function computeForecastFadeFromInput(input: ForecastFadeInput): ForecastFadeResult {
  const notes = [...input.notes];

  const readiness = computeForecastFadeReadiness(input);
  if (readiness.readinessStatus === "Missing") {
    return {
      recommendedStageType: null,
      recommendedForecastYears: null,
      recommendedHistoryYears: null,
      fadeRequired: null,
      fadeStartYear: null,
      fadeToStableYear: null,
      cyclicalityReviewRequired: readiness.cyclicalityReviewRequired,
      benchmarkReviewRequired: true,
      readinessStatus: "Missing",
      missingInputs: readiness.missingInputs,
      warnings: readiness.warnings,
      notes,
    };
  }

  if (readiness.readinessStatus === "Not Applicable") {
    return {
      recommendedStageType: null,
      recommendedForecastYears: null,
      recommendedHistoryYears: null,
      fadeRequired: null,
      fadeStartYear: null,
      fadeToStableYear: null,
      cyclicalityReviewRequired: false,
      benchmarkReviewRequired: true,
      readinessStatus: "Not Applicable",
      missingInputs: [],
      warnings: readiness.warnings,
      notes,
    };
  }

  const stage = interpretStageRecommendation(input.defaultStageRecommendation);
  const history = interpretHistoryRecommendation(input.historyRecommendation);

  const warnings = [
    ...readiness.warnings,
    ...stage.warnings,
    ...history.warnings,
    ...(readiness.benchmarkReviewRequired
      ? ["Benchmark template status is not fully approved; forecast/fade outputs require review."]
      : []),
  ];

  const readinessStatus: ForecastFadeResult["readinessStatus"] =
    readiness.readinessStatus === "Ready" && (stage.stageType === "Unknown" || history.recommendedHistoryYears === null)
      ? "Review"
      : readiness.readinessStatus === "Review" || stage.stageType === "Unknown" || history.recommendedHistoryYears === null
        ? "Review"
        : "Ready";

  return {
    recommendedStageType: stage.stageType,
    recommendedForecastYears: stage.recommendedForecastYears,
    recommendedHistoryYears: history.recommendedHistoryYears,
    fadeRequired: stage.fadeRequired,
    fadeStartYear: stage.fadeStartYear,
    fadeToStableYear: stage.fadeToStableYear,
    cyclicalityReviewRequired: readiness.cyclicalityReviewRequired,
    benchmarkReviewRequired: readiness.benchmarkReviewRequired,
    readinessStatus,
    missingInputs: [],
    warnings,
    notes,
  };
}

