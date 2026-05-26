import "server-only";
import type { DamodaranBenchmarkToIsmSectorRow } from "@/lib/types";

export interface BenchmarkEngineDefaults {
  defaultStageType: string;
  cyclicalityFlag: string;
  defaultHistoryRequirement: string;
  defaultNormalizationNeed: NonNullable<DamodaranBenchmarkToIsmSectorRow["defaultNormalizationNeed"]>;
  defaultStableMarginRule: string;
  defaultStableRocRule: string;
  defaultSalesToCapitalRule: string;
  forecastFadeRuleHint: string;
  terminalReadinessHint: string;
  sectorWarning: string;
  requiredReviewReason: string;
  engineDefaultSource: NonNullable<DamodaranBenchmarkToIsmSectorRow["engineDefaultSource"]>;
  relatedSecondaryBenchmarks: string[];
  fallbackBenchmark: string | null;
}

const BASE_DEFAULTS: BenchmarkEngineDefaults = {
  defaultStageType: "Review Required",
  cyclicalityFlag: "Review Required",
  defaultHistoryRequirement: "Standard 4Y+LTM",
  defaultNormalizationNeed: "Review Required",
  defaultStableMarginRule: "Use benchmark median with analyst review.",
  defaultStableRocRule: "Use benchmark ROC with analyst review.",
  defaultSalesToCapitalRule: "Use benchmark sales-to-capital with analyst review.",
  forecastFadeRuleHint: "Future Forecast/Fade rule mapping required.",
  terminalReadinessHint: "Terminal readiness requires analyst sign-off.",
  sectorWarning: "Broad benchmark; recommendations only.",
  requiredReviewReason: "Benchmark requires analyst validation before engine defaults are trusted.",
  engineDefaultSource: "Benchmark candidate logic",
  relatedSecondaryBenchmarks: [],
  fallbackBenchmark: null,
};

function withOverrides(
  overrides: Partial<BenchmarkEngineDefaults>,
): BenchmarkEngineDefaults {
  return {
    ...BASE_DEFAULTS,
    ...overrides,
    relatedSecondaryBenchmarks:
      overrides.relatedSecondaryBenchmarks ?? BASE_DEFAULTS.relatedSecondaryBenchmarks,
  };
}

export function getBenchmarkEngineDefaults(
  benchmark: string,
): BenchmarkEngineDefaults {
  const b = benchmark.toLowerCase();

  if (
    b.includes("bank") ||
    b.includes("insurance") ||
    b.includes("brokerage") ||
    b.includes("asset management") ||
    b.includes("reinsurance")
  ) {
    return withOverrides({
      defaultStageType: "Not Applicable",
      cyclicalityFlag: "Excluded",
      defaultHistoryRequirement: "Not Applicable",
      defaultNormalizationNeed: "Review Required",
      defaultStableMarginRule: "Outside standard Operating Co FCFF template.",
      defaultStableRocRule: "Outside standard Operating Co FCFF template.",
      defaultSalesToCapitalRule: "Outside standard Operating Co FCFF template.",
      forecastFadeRuleHint: "No Forecast/Fade default; excluded from standard flow.",
      terminalReadinessHint: "Excluded / Special Review.",
      sectorWarning: "Financial benchmark is outside standard Operating Co FCFF model.",
      requiredReviewReason: "Financial/insurance business model requires separate engine path.",
      engineDefaultSource: "Manual review required",
    });
  }

  if (b.includes("reit") || b.includes("real estate")) {
    return withOverrides({
      defaultStageType: "Not Applicable",
      cyclicalityFlag: "Special Review",
      defaultHistoryRequirement: "Extended history preferred",
      defaultNormalizationNeed: "Review Required",
      defaultStableMarginRule: "REIT/NAV profile requires specialized treatment.",
      defaultStableRocRule: "REIT/NAV profile requires specialized treatment.",
      defaultSalesToCapitalRule: "REIT/NAV profile requires specialized treatment.",
      forecastFadeRuleHint: "Do not apply default Forecast/Fade without REIT-specific logic.",
      terminalReadinessHint: "Special review required before terminal assumptions.",
      sectorWarning: "Real estate/REIT benchmark outside standard FCFF pathway.",
      requiredReviewReason: "REIT/NAV-driven models require special handling.",
      engineDefaultSource: "Manual review required",
    });
  }

  if (b.includes("utility") || b === "power") {
    return withOverrides({
      defaultStageType: "2-stage FCFF",
      cyclicalityFlag: "Low",
      defaultHistoryRequirement: "Standard 4Y+LTM",
      defaultNormalizationNeed: "Watch",
      defaultStableMarginRule: "Use regulated utility stable margin with jurisdiction review.",
      defaultStableRocRule: "Use stable regulated ROC with jurisdiction review.",
      defaultSalesToCapitalRule: "Use utility benchmark sales-to-capital with asset-intensity review.",
      forecastFadeRuleHint: "Fade toward stable regulated profile in future engine.",
      terminalReadinessHint: "Terminal ready only after regulation/jurisdiction review.",
      sectorWarning: "Regulated utility economics vary by jurisdiction.",
      requiredReviewReason: "Review required for regulated returns and tariff regime.",
    });
  }

  if (
    b.includes("oil/gas") ||
    b.includes("coal") ||
    b.includes("metals") ||
    b.includes("precious") ||
    b === "steel"
  ) {
    return withOverrides({
      defaultStageType: "Cyclical normalized FCFF",
      cyclicalityFlag: "Commodity",
      defaultHistoryRequirement: "Extended 10Y preferred",
      defaultNormalizationNeed: "Commodity normalization",
      defaultStableMarginRule: "Normalize margin over commodity cycle.",
      defaultStableRocRule: "Normalize ROC across cycle; avoid spot-year anchoring.",
      defaultSalesToCapitalRule: "Use cycle-adjusted sales-to-capital benchmark.",
      forecastFadeRuleHint: "Future fade should use cycle-normalized baseline.",
      terminalReadinessHint: "Terminal assumptions require cycle normalization review.",
      sectorWarning: "Commodity exposure can distort spot-year economics.",
      requiredReviewReason: "Commodity/cycle risk requires normalization review.",
    });
  }

  if (
    b.includes("construction") ||
    b.includes("homebuilding") ||
    b.includes("building materials")
  ) {
    return withOverrides({
      defaultStageType: "Cyclical normalized FCFF",
      cyclicalityFlag: "Cyclical",
      defaultHistoryRequirement: "Extended history preferred",
      defaultNormalizationNeed: "Cyclical normalization",
      defaultStableMarginRule: "Normalize construction-cycle margins.",
      defaultStableRocRule: "Normalize ROC across build cycles.",
      defaultSalesToCapitalRule: "Use cycle-adjusted sales-to-capital.",
      forecastFadeRuleHint: "Fade assumptions should include construction-cycle mean reversion.",
      terminalReadinessHint: "Terminal readiness after cycle normalization checks.",
      sectorWarning: "Construction demand cycles can skew short windows.",
      requiredReviewReason: "Cyclical sector requires normalization review.",
    });
  }

  if (
    b.includes("software") ||
    b.includes("semiconductor") ||
    b.includes("computer services") ||
    b.includes("information services")
  ) {
    return withOverrides({
      defaultStageType: "3-stage FCFF",
      cyclicalityFlag: "Medium",
      defaultHistoryRequirement: "Standard 4Y+LTM (extend if high volatility)",
      defaultNormalizationNeed: "Watch",
      defaultStableMarginRule: "Use stable software/tech margin benchmark with competition review.",
      defaultStableRocRule: "Use stable ROC benchmark with reinvestment discipline review.",
      defaultSalesToCapitalRule: "Use software/tech sales-to-capital benchmark with scale review.",
      forecastFadeRuleHint: "Future fade should account for growth deceleration patterns.",
      terminalReadinessHint: "Terminal readiness requires durable margin/ROC checks.",
      sectorWarning: "Growth and reinvestment profiles can change rapidly.",
      requiredReviewReason: "High-growth tech benchmarks require analyst stage validation.",
    });
  }

  if (
    b.includes("food") ||
    b.includes("beverage") ||
    b.includes("tobacco") ||
    b.includes("household")
  ) {
    return withOverrides({
      defaultStageType: "2-stage FCFF",
      cyclicalityFlag: "Low",
      defaultHistoryRequirement: "Standard 4Y+LTM",
      defaultNormalizationNeed: "Watch",
      defaultStableMarginRule: "Use defensive-sector stable margin benchmark.",
      defaultStableRocRule: "Use defensive-sector stable ROC benchmark.",
      defaultSalesToCapitalRule: "Use defensive-sector sales-to-capital benchmark.",
      forecastFadeRuleHint: "Fade toward stable defensive profile in future engine.",
      terminalReadinessHint: "Terminal ready after regulatory/product-mix checks.",
      sectorWarning: "Regulatory and product-mix effects can still require adjustments.",
      requiredReviewReason: "Review required for product/regulatory mix.",
    });
  }

  if (
    b.includes("drug") ||
    b.includes("healthcare") ||
    b.includes("hospital")
  ) {
    return withOverrides({
      defaultStageType: "3-stage FCFF",
      cyclicalityFlag: "Medium",
      defaultHistoryRequirement: "Standard 4Y+LTM (extend if loss/R&D heavy)",
      defaultNormalizationNeed: "Review Required",
      defaultStableMarginRule: "Use healthcare benchmark margin with pipeline/reimbursement review.",
      defaultStableRocRule: "Use healthcare benchmark ROC with R&D capitalization review.",
      defaultSalesToCapitalRule: "Use healthcare sales-to-capital benchmark with model review.",
      forecastFadeRuleHint: "Fade logic should consider R&D and patent-cycle effects.",
      terminalReadinessHint: "Terminal readiness requires pipeline durability review.",
      sectorWarning: "Healthcare economics vary by reimbursement/pipeline profile.",
      requiredReviewReason: "Healthcare benchmark requires analyst review for normalization and stage.",
    });
  }

  if (
    b.includes("diversified") ||
    b.includes("total market") ||
    b.includes("business & consumer services")
  ) {
    return withOverrides({
      defaultStageType: "Review Required",
      cyclicalityFlag: "Review Required",
      defaultHistoryRequirement: "Review Required",
      defaultNormalizationNeed: "Review Required",
      defaultStableMarginRule: "Do not auto-apply; mixed benchmark composition.",
      defaultStableRocRule: "Do not auto-apply; mixed benchmark composition.",
      defaultSalesToCapitalRule: "Do not auto-apply; mixed benchmark composition.",
      forecastFadeRuleHint: "Needs custom forecast/fade design.",
      terminalReadinessHint: "Not terminal-ready without benchmark decomposition.",
      sectorWarning: "Broad/diversified benchmark should not be treated as clean default.",
      requiredReviewReason: "Broad benchmark requires manual decomposition and mapping review.",
      engineDefaultSource: "Manual review required",
    });
  }

  return BASE_DEFAULTS;
}
