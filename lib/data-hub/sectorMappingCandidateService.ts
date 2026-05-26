import "server-only";
import { getDamodaranCoverageMatrix, getDamodaranIndustryMasterList } from "@/lib/firestore/repositories/damodaranDataRepository";
import { validateSectorMappingsAgainstDamodaranMaster } from "@/lib/data-hub/sectorBenchmarkValidationService";
import { SECTOR_MAPPING_SOURCE_NAME, SECTOR_MAPPING_SOURCE_UPDATE_DATE, SECTOR_MAPPING_SOURCE_URL } from "@/lib/data-hub/sectorIndustryMappingFoundationService";
import type {
  ISMSectorRow,
  SectorIndustryMappingRow,
  SectorMappingCandidateGuideRow,
  SectorMappingReadinessRow,
} from "@/lib/types";

// Legacy internal helper service:
// kept for compatibility and review workflows only.
// Benchmark-first Industry Benchmark Config is the primary valuation reference system.
type CandidateStatus =
  | "Mapping Required"
  | "Review Required"
  | "Excluded / Special Review"
  | "OK";

interface CandidateDefinition {
  primary: string | null;
  secondary: string | null;
  fallback: string | null;
  stage: string;
  cyclicality: string;
  preferredStatus: CandidateStatus;
  reviewFlag: "Mapping Required" | "Review Required" | "Ready" | "Excluded / Special Review";
  warning: string;
  notes: string;
  allowOkWhenStrong?: boolean;
}

interface CandidateGenerationResult {
  updatedMappings: SectorIndustryMappingRow[];
  candidateGuideRows: SectorMappingCandidateGuideRow[];
  readinessRows: SectorMappingReadinessRow[];
  summary: {
    success: boolean;
    rowsEvaluated: number;
    candidatesGenerated: number;
    primaryValidCount: number;
    primaryInvalidCount: number;
    mappingRequiredCount: number;
    reviewRequiredCount: number;
    okCount: number;
    excludedSpecialReviewCount: number;
    warnings: string[];
    errors: string[];
  };
}

const SOURCE_BASIS =
  "Master Specification v1.4 + Damodaran Industry Master List + Damodaran imported datasets + analyst/business mapping logic. Legacy Google Sheet mapping is context only.";

const candidateDefinitions: Record<string, CandidateDefinition> = {
  "Apparel, Leather & Allied Products": {
    primary: "Apparel",
    secondary: "Shoe",
    fallback: "Total Market (without financials)",
    stage: "3-stage FCFF",
    cyclicality: "Medium",
    preferredStatus: "Review Required",
    reviewFlag: "Review Required",
    warning: "Consumer discretionary demand sensitivity.",
    notes: "Tobacco-specific splits require analyst review.",
  },
  "Chemical Products": {
    primary: "Chemical (Specialty)",
    secondary: "Chemical (Basic)",
    fallback: "Chemical (Diversified)",
    stage: "3-stage FCFF",
    cyclicality: "Cyclical",
    preferredStatus: "Review Required",
    reviewFlag: "Review Required",
    warning: "Commodity/specialty mix can materially shift benchmark fit.",
    notes: "Review for feedstock and margin-cycle exposure.",
  },
  "Computer & Electronic Products": {
    primary: "Electronics (General)",
    secondary: "Semiconductor",
    fallback: "Computers/Peripherals",
    stage: "3-stage FCFF",
    cyclicality: "Cyclical",
    preferredStatus: "Review Required",
    reviewFlag: "Review Required",
    warning: "Subsector cyclicality and innovation cadence require review.",
    notes: "Hardware/software blend should be analyst-confirmed.",
  },
  "Electrical Equipment, Appliances & Components": {
    primary: "Electrical Equipment",
    secondary: "Electronics (General)",
    fallback: "Household Products",
    stage: "3-stage FCFF",
    cyclicality: "Medium",
    preferredStatus: "Review Required",
    reviewFlag: "Review Required",
    warning: "Industrial vs household mix can alter benchmark suitability.",
    notes: "Use secondary/fallback when product mix is diversified.",
  },
  "Fabricated Metal Products": {
    primary: "Steel",
    secondary: "Metals & Mining",
    fallback: "Building Materials",
    stage: "Cyclical normalized FCFF",
    cyclicality: "Cyclical",
    preferredStatus: "Review Required",
    reviewFlag: "Review Required",
    warning: "Cyclical, input-cost-sensitive sector.",
    notes: "Coverage should be checked before assigning table keys.",
  },
  "Food, Beverage & Tobacco Products": {
    primary: "Food Processing",
    secondary: "Beverage (Soft)",
    fallback: "Beverage (Alcoholic)",
    stage: "2-stage FCFF",
    cyclicality: "Low",
    preferredStatus: "Review Required",
    reviewFlag: "Review Required",
    warning: "Defensive sector with product-category nuances.",
    notes: "Tobacco-heavy profiles require analyst override.",
  },
  "Furniture & Related Products": {
    primary: "Furn/Home Furnishings",
    secondary: null,
    fallback: "Total Market (without financials)",
    stage: "3-stage FCFF",
    cyclicality: "Medium",
    preferredStatus: "Review Required",
    reviewFlag: "Review Required",
    warning: "Consumer cycle linkage requires demand normalization review.",
    notes: "Can be upgraded to OK if direct benchmark and coverage are strong.",
    allowOkWhenStrong: true,
  },
  Machinery: {
    primary: "Machinery",
    secondary: null,
    fallback: "Total Market (without financials)",
    stage: "3-stage FCFF",
    cyclicality: "Cyclical",
    preferredStatus: "Review Required",
    reviewFlag: "Review Required",
    warning: "Capex cycle and backlog volatility should be reviewed.",
    notes: "Can be OK for narrow machinery peers with complete coverage.",
    allowOkWhenStrong: true,
  },
  "Miscellaneous Manufacturing": {
    primary: "Diversified",
    secondary: "Business & Consumer Services",
    fallback: "Total Market (without financials)",
    stage: "3-stage FCFF",
    cyclicality: "Review Required",
    preferredStatus: "Mapping Required",
    reviewFlag: "Mapping Required",
    warning: "Broad category; automatic confidence is low.",
    notes: "Often requires manual benchmark split before model usage.",
  },
  "Nonmetallic Mineral Products": {
    primary: "Building Materials",
    secondary: "Construction Supplies",
    fallback: "Total Market (without financials)",
    stage: "Cyclical normalized FCFF",
    cyclicality: "Cyclical",
    preferredStatus: "Review Required",
    reviewFlag: "Review Required",
    warning: "Construction-cycle sensitivity requires review.",
    notes: "Validate project mix before using a single benchmark.",
  },
  "Paper Products": {
    primary: "Paper/Forest Products",
    secondary: "Packaging & Container",
    fallback: "Total Market (without financials)",
    stage: "3-stage FCFF",
    cyclicality: "Medium",
    preferredStatus: "Review Required",
    reviewFlag: "Review Required",
    warning: "Demand and pulp-cost cycles require analyst review.",
    notes: "Packaging-heavy models may prefer secondary benchmark.",
  },
  "Petroleum & Coal Products": {
    primary: "Oil/Gas (Integrated)",
    secondary: "Oil/Gas (Production and Exploration)",
    fallback: "Coal & Related Energy",
    stage: "Cyclical normalized FCFF",
    cyclicality: "Commodity",
    preferredStatus: "Review Required",
    reviewFlag: "Review Required",
    warning: "Commodity-cycle and reserve economics require review.",
    notes: "Keep under special cyclical review workflow.",
  },
  "Plastics & Rubber Products": {
    primary: "Rubber& Tires",
    secondary: "Chemical (Specialty)",
    fallback: "Packaging & Container",
    stage: "3-stage FCFF",
    cyclicality: "Medium",
    preferredStatus: "Review Required",
    reviewFlag: "Review Required",
    warning: "Input-price and end-market mix should be reviewed.",
    notes: "Rubber/tire vs specialty chemical profile can differ materially.",
  },
  "Primary Metals": {
    primary: "Metals & Mining",
    secondary: "Steel",
    fallback: "Precious Metals",
    stage: "Cyclical normalized FCFF",
    cyclicality: "Commodity",
    preferredStatus: "Review Required",
    reviewFlag: "Review Required",
    warning: "Commodity and cycle exposure require review.",
    notes: "Use caution when benchmarking diversified metal portfolios.",
  },
  "Printing & Related Support Activities": {
    primary: "Publishing & Newspapers",
    secondary: "Business & Consumer Services",
    fallback: "Total Market (without financials)",
    stage: "3-stage FCFF",
    cyclicality: "Medium",
    preferredStatus: "Review Required",
    reviewFlag: "Review Required",
    warning: "Secular decline and service mix require review.",
    notes: "Digital-transition effects should be considered.",
  },
  "Textile Mills": {
    primary: "Apparel",
    secondary: "Furn/Home Furnishings",
    fallback: "Total Market (without financials)",
    stage: "3-stage FCFF",
    cyclicality: "Medium",
    preferredStatus: "Review Required",
    reviewFlag: "Review Required",
    warning: "Global supply chain cyclicality requires review.",
    notes: "Use with analyst view on brand vs commodity positioning.",
  },
  "Transportation Equipment": {
    primary: "Auto & Truck",
    secondary: "Aerospace/Defense",
    fallback: "Auto Parts",
    stage: "Cyclical normalized FCFF",
    cyclicality: "Cyclical",
    preferredStatus: "Review Required",
    reviewFlag: "Review Required",
    warning: "Sub-industry variance requires review.",
    notes: "Defense/auto split must be analyst-confirmed.",
  },
  "Wood Products": {
    primary: "Paper/Forest Products",
    secondary: "Building Materials",
    fallback: "Homebuilding",
    stage: "Cyclical normalized FCFF",
    cyclicality: "Cyclical",
    preferredStatus: "Review Required",
    reviewFlag: "Review Required",
    warning: "Housing-cycle exposure requires review.",
    notes: "Use secondary/fallback where construction linkage dominates.",
  },
  "Accommodation & Food Services": {
    primary: "Restaurant/Dining",
    secondary: "Hotel/Gaming",
    fallback: "Total Market (without financials)",
    stage: "3-stage FCFF",
    cyclicality: "Medium",
    preferredStatus: "Review Required",
    reviewFlag: "Review Required",
    warning: "Consumer spending and travel cycle risk require review.",
    notes: "Franchise-heavy models may differ from asset-heavy lodging.",
  },
  "Agriculture, Forestry, Fishing & Hunting": {
    primary: "Farming/Agriculture",
    secondary: "Paper/Forest Products",
    fallback: "Total Market (without financials)",
    stage: "Cyclical normalized FCFF",
    cyclicality: "Commodity",
    preferredStatus: "Review Required",
    reviewFlag: "Review Required",
    warning: "Commodity/weather dependencies require review.",
    notes: "Coverage must be checked before benchmark-key assignment.",
  },
  "Arts, Entertainment & Recreation": {
    primary: "Entertainment",
    secondary: "Recreation",
    fallback: "Software (Entertainment)",
    stage: "3-stage FCFF",
    cyclicality: "Medium",
    preferredStatus: "Review Required",
    reviewFlag: "Review Required",
    warning: "Content/IP vs venue models require review.",
    notes: "Use secondary where live recreation dominates.",
  },
  Construction: {
    primary: "Engineering/Construction",
    secondary: "Construction Supplies",
    fallback: "Homebuilding",
    stage: "Cyclical normalized FCFF",
    cyclicality: "Cyclical",
    preferredStatus: "Review Required",
    reviewFlag: "Review Required",
    warning: "Project cycle and capital intensity require review.",
    notes: "Keep as review-required even with direct benchmark hit.",
  },
  "Educational Services": {
    primary: "Education",
    secondary: null,
    fallback: "Total Market (without financials)",
    stage: "3-stage FCFF",
    cyclicality: "Low",
    preferredStatus: "Review Required",
    reviewFlag: "Review Required",
    warning: "Regulation and mix effects require review.",
    notes: "Can be OK for narrow direct benchmark with strong coverage.",
    allowOkWhenStrong: true,
  },
  "Finance & Insurance": {
    primary: null,
    secondary: null,
    fallback: null,
    stage: "Not Applicable",
    cyclicality: "Excluded",
    preferredStatus: "Excluded / Special Review",
    reviewFlag: "Excluded / Special Review",
    warning: "Outside standard Operating Co template.",
    notes: "Financial institutions are excluded from normal mapping.",
  },
  "Health Care & Social Assistance": {
    primary: "Healthcare Support Services",
    secondary: "Healthcare Products",
    fallback: "Hospitals/Healthcare Facilities",
    stage: "3-stage FCFF",
    cyclicality: "Medium",
    preferredStatus: "Review Required",
    reviewFlag: "Review Required",
    warning: "Subsector differences require review.",
    notes: "Product/service/provider mix can shift benchmark suitability.",
  },
  Information: {
    primary: "Software (System & Application)",
    secondary: "Computer Services",
    fallback: "Software (Internet)",
    stage: "3-stage FCFF",
    cyclicality: "Medium",
    preferredStatus: "Review Required",
    reviewFlag: "Review Required",
    warning: "High-growth/mature mix requires review.",
    notes: "Primary benchmark aligns with common operating-co software profile.",
  },
  "Management of Companies & Support Services": {
    primary: "Business & Consumer Services",
    secondary: "Diversified",
    fallback: "Total Market (without financials)",
    stage: "3-stage FCFF",
    cyclicality: "Review Required",
    preferredStatus: "Mapping Required",
    reviewFlag: "Mapping Required",
    warning: "Potential holding-company character requires review.",
    notes: "Do not auto-upgrade to OK without analyst classification.",
  },
  Mining: {
    primary: "Metals & Mining",
    secondary: "Precious Metals",
    fallback: "Coal & Related Energy",
    stage: "Cyclical normalized FCFF",
    cyclicality: "Commodity",
    preferredStatus: "Review Required",
    reviewFlag: "Review Required",
    warning: "Commodity exposure requires review.",
    notes: "Reserve life and cost curve differences matter.",
  },
  "Other Services": {
    primary: "Business & Consumer Services",
    secondary: "Office Equipment & Services",
    fallback: "Total Market (without financials)",
    stage: "3-stage FCFF",
    cyclicality: "Review Required",
    preferredStatus: "Mapping Required",
    reviewFlag: "Mapping Required",
    warning: "Broad bucket requires analyst refinement.",
    notes: "Keep mapping-required unless narrow profile is identified.",
  },
  "Professional, Scientific & Technical Services": {
    primary: "Business & Consumer Services",
    secondary: "Computer Services",
    fallback: "Information Services",
    stage: "3-stage FCFF",
    cyclicality: "Medium",
    preferredStatus: "Review Required",
    reviewFlag: "Review Required",
    warning: "Service mix heterogeneity requires review.",
    notes: "Primary/secondary choice depends on tech-intensity profile.",
  },
  "Public Administration": {
    primary: null,
    secondary: null,
    fallback: null,
    stage: "Not Set",
    cyclicality: "Review Required",
    preferredStatus: "Mapping Required",
    reviewFlag: "Mapping Required",
    warning: "Usually not listed operating company sector.",
    notes: "Requires explicit analyst exception before mapping.",
  },
  "Real Estate, Rental & Leasing": {
    primary: null,
    secondary: null,
    fallback: null,
    stage: "Not Applicable",
    cyclicality: "Review Required",
    preferredStatus: "Excluded / Special Review",
    reviewFlag: "Excluded / Special Review",
    warning: "REIT/NAV-driven real estate is outside standard Operating Co scope.",
    notes: "Operating leasing cases require analyst review.",
  },
  "Retail Trade": {
    primary: "Retail (General)",
    secondary: "Retail (Special Lines)",
    fallback: "Retail (Grocery and Food)",
    stage: "3-stage FCFF",
    cyclicality: "Medium",
    preferredStatus: "Review Required",
    reviewFlag: "Review Required",
    warning: "Category mix and channel exposure require review.",
    notes: "Apply analyst judgment for specialty vs broadline profiles.",
  },
  "Transportation & Warehousing": {
    primary: "Transportation",
    secondary: "Transportation (Railroads)",
    fallback: "Trucking",
    stage: "Cyclical normalized FCFF",
    cyclicality: "Cyclical",
    preferredStatus: "Review Required",
    reviewFlag: "Review Required",
    warning: "Logistics cycle and operating leverage require review.",
    notes: "Rail/truck mix should drive secondary benchmark usage.",
  },
  Utilities: {
    primary: "Utility (General)",
    secondary: "Utility (Water)",
    fallback: "Power",
    stage: "2-stage FCFF",
    cyclicality: "Low",
    preferredStatus: "Review Required",
    reviewFlag: "Review Required",
    warning: "Regulated assumptions require analyst review.",
    notes: "Keep review-required despite stable profile.",
  },
  "Wholesale Trade": {
    primary: "Retail (Distributors)",
    secondary: "Food Wholesalers",
    fallback: "Business & Consumer Services",
    stage: "3-stage FCFF",
    cyclicality: "Medium",
    preferredStatus: "Review Required",
    reviewFlag: "Review Required",
    warning: "Distributor economics vary by end-market.",
    notes: "Validate benchmark with inventory-turn and margin profile.",
  },
  "Custom / Other Operating Co": {
    primary: null,
    secondary: null,
    fallback: "Total Market (without financials)",
    stage: "Not Set",
    cyclicality: "Review Required",
    preferredStatus: "Mapping Required",
    reviewFlag: "Mapping Required",
    warning: "Custom sector needs analyst-defined benchmark candidate.",
    notes: "Fallback is reference-only when validated.",
  },
  "Management of Companies & Enterprises": {
    primary: "Diversified",
    secondary: "Business & Consumer Services",
    fallback: "Total Market (without financials)",
    stage: "3-stage FCFF",
    cyclicality: "Review Required",
    preferredStatus: "Mapping Required",
    reviewFlag: "Mapping Required",
    warning: "Potential investment/holding structure; review required.",
    notes: "Optional sector support when present.",
  },
  "Waste Management and Remediation Services": {
    primary: "Environmental & Waste Services",
    secondary: null,
    fallback: "Total Market (without financials)",
    stage: "3-stage FCFF",
    cyclicality: "Low",
    preferredStatus: "Review Required",
    reviewFlag: "Review Required",
    warning: "Coverage and regulatory profile should be reviewed.",
    notes: "Can be OK with direct benchmark and strong coverage.",
    allowOkWhenStrong: true,
  },
};

function sanitizeBenchmark(candidate: string | null, exactNames: Set<string>): string | null {
  if (!candidate) {
    return null;
  }
  return exactNames.has(candidate) ? candidate : null;
}

function hasValue(value: string | null | undefined) {
  return Boolean(value && value.trim().length > 0);
}

function prefersExisting(existingValue: string | null, overwrite: boolean) {
  return !overwrite && hasValue(existingValue);
}

export async function generateSectorMappingCandidates(params: {
  ismRows: ISMSectorRow[];
  mappingRows: SectorIndustryMappingRow[];
  overwrite?: boolean;
}): Promise<CandidateGenerationResult> {
  const overwrite = params.overwrite ?? false;
  const now = new Date().toISOString();
  const warnings: string[] = [];
  const errors: string[] = [];

  const [masterRows, coverageRows] = await Promise.all([
    getDamodaranIndustryMasterList(),
    getDamodaranCoverageMatrix(),
  ]);

  const masterNames = masterRows.data.map((row) => row.industryName).filter(Boolean);
  const exactNames = new Set(masterNames);
  const coverageByIndustry = new Map(coverageRows.data.map((row) => [row.industryName, row]));

  const mappingBySector = new Map(params.mappingRows.map((row) => [row.ismSector, row]));
  const candidateGuideRows: SectorMappingCandidateGuideRow[] = [];
  const updatedMappings: SectorIndustryMappingRow[] = [];
  let candidatesGenerated = 0;

  for (const sector of params.ismRows) {
    const existing = mappingBySector.get(sector.ismSector);
    if (!existing) {
      continue;
    }

    const definition = candidateDefinitions[sector.ismSector];
    if (!definition) {
      warnings.push(`${sector.ismSector}: no candidate definition found; keeping mapping-required state.`);
      updatedMappings.push({
        ...existing,
        mappingDirection: "ISM_TO_BENCHMARK_HELPER",
      });
      candidateGuideRows.push({
        id: `sector_candidate_${existing.id}`,
        ismSector: sector.ismSector,
        candidatePrimaryBenchmark: null,
        candidateSecondaryBenchmark: null,
        candidateFallbackBenchmark: null,
        suggestedPrimaryBenchmark: null,
        defaultStatus: "Mapping Required",
        reason: "No candidate rule available for this ISM-sector.",
        sourceBasis: SOURCE_BASIS,
        notes: "Requires manual analyst mapping in next phase.",
        importedLastUpdated: now,
      });
      continue;
    }

    const validatedPrimary = sanitizeBenchmark(definition.primary, exactNames);
    const validatedSecondary = sanitizeBenchmark(definition.secondary, exactNames);
    const validatedFallback = sanitizeBenchmark(definition.fallback, exactNames);
    if (definition.primary && !validatedPrimary) {
      warnings.push(`${sector.ismSector}: candidate primary "${definition.primary}" not found in Damodaran Industry Master List.`);
    }
    if (definition.secondary && !validatedSecondary) {
      warnings.push(`${sector.ismSector}: candidate secondary "${definition.secondary}" not found in Damodaran Industry Master List.`);
    }
    if (definition.fallback && !validatedFallback) {
      warnings.push(`${sector.ismSector}: candidate fallback "${definition.fallback}" not found in Damodaran Industry Master List.`);
    }

    const nextPrimary = prefersExisting(existing.primaryDamodaranIndustrialBenchmark, overwrite)
      ? existing.primaryDamodaranIndustrialBenchmark
      : validatedPrimary;
    const nextSecondary = prefersExisting(existing.secondaryDamodaranIndustrialBenchmark, overwrite)
      ? existing.secondaryDamodaranIndustrialBenchmark
      : validatedSecondary;
    const nextFallback = prefersExisting(existing.fallbackDamodaranIndustrialBenchmark, overwrite)
      ? existing.fallbackDamodaranIndustrialBenchmark
      : validatedFallback;

    if (definition.preferredStatus === "Excluded / Special Review") {
      updatedMappings.push({
        ...existing,
        mappingDirection: "ISM_TO_BENCHMARK_HELPER",
        primaryDamodaranIndustrialBenchmark: nextPrimary,
        secondaryDamodaranIndustrialBenchmark: nextSecondary,
        fallbackDamodaranIndustrialBenchmark: nextFallback,
        betaTableKey: null,
        marginTableKey: null,
        reinvestmentTableKey: null,
        workingCapitalTableKey: null,
        growthRocTableKey: null,
        multiplesTableKey: null,
        defaultStageType: definition.stage,
        cyclicalityFlag: definition.cyclicality,
        sectorWarning: definition.warning,
        mappingReviewFlag: "Excluded / Special Review",
        status: "Excluded / Special Review",
        sourceName: SECTOR_MAPPING_SOURCE_NAME,
        sourceUrl: SECTOR_MAPPING_SOURCE_URL,
        sourceUpdateDate: SECTOR_MAPPING_SOURCE_UPDATE_DATE,
        importedLastUpdated: now,
        notes: definition.notes,
      });
      candidateGuideRows.push({
        id: `sector_candidate_${existing.id}`,
        ismSector: sector.ismSector,
        candidatePrimaryBenchmark: validatedPrimary,
        candidateSecondaryBenchmark: validatedSecondary,
        candidateFallbackBenchmark: validatedFallback,
        suggestedPrimaryBenchmark: validatedPrimary,
        defaultStatus: "Excluded / Special Review",
        reason: definition.warning,
        sourceBasis: SOURCE_BASIS,
        notes: definition.notes,
        importedLastUpdated: now,
      });
      continue;
    }

    const coverage = nextPrimary ? coverageByIndustry.get(nextPrimary) : null;
    const hasCoreCoverage = Boolean(
      coverage &&
        coverage.betaAvailable &&
        coverage.marginAvailable &&
        coverage.capexAvailable &&
        coverage.workingCapitalAvailable &&
        coverage.fundgrEbAvailable &&
        coverage.multiplesAvailable,
    );

    const finalStatus: CandidateStatus =
      !nextPrimary
        ? definition.preferredStatus === "Review Required" ? "Mapping Required" : definition.preferredStatus
        : definition.allowOkWhenStrong && hasCoreCoverage && definition.preferredStatus !== "Mapping Required"
          ? "OK"
          : definition.preferredStatus === "OK"
            ? "Review Required"
            : definition.preferredStatus;

    const finalReviewFlag =
      finalStatus === "OK"
        ? "Ready"
        : finalStatus === "Review Required"
            ? "Review Required"
            : "Mapping Required";

    if (nextPrimary && exactNames.has(nextPrimary)) {
      candidatesGenerated += 1;
    }

    const shouldFillKeys = Boolean(nextPrimary && exactNames.has(nextPrimary) && coverage);
    const nextBetaKey = shouldFillKeys && coverage?.betaAvailable ? nextPrimary : null;
    const nextMarginKey = shouldFillKeys && coverage?.marginAvailable ? nextPrimary : null;
    const nextReinvestmentKey = shouldFillKeys && coverage?.fundgrEbAvailable ? nextPrimary : null;
    const nextWorkingCapitalKey = shouldFillKeys && coverage?.workingCapitalAvailable ? nextPrimary : null;
    const nextGrowthRocKey = shouldFillKeys && coverage?.fundgrEbAvailable ? nextPrimary : null;
    const nextMultiplesKey = shouldFillKeys && coverage?.multiplesAvailable ? nextPrimary : null;

    if (shouldFillKeys && !nextBetaKey) {
      warnings.push(`${sector.ismSector}: beta key left blank due to missing coverage for primary benchmark.`);
    }
    if (shouldFillKeys && !nextMarginKey) {
      warnings.push(`${sector.ismSector}: margin key left blank due to missing coverage for primary benchmark.`);
    }
    if (shouldFillKeys && !nextReinvestmentKey) {
      warnings.push(`${sector.ismSector}: reinvestment key left blank due to missing coverage for primary benchmark.`);
    }
    if (shouldFillKeys && !nextWorkingCapitalKey) {
      warnings.push(`${sector.ismSector}: working capital key left blank due to missing coverage for primary benchmark.`);
    }
    if (shouldFillKeys && !nextMultiplesKey) {
      warnings.push(`${sector.ismSector}: multiples key left blank due to missing coverage for primary benchmark.`);
    }

    updatedMappings.push({
      ...existing,
      mappingDirection: "ISM_TO_BENCHMARK_HELPER",
      primaryDamodaranIndustrialBenchmark: nextPrimary,
      secondaryDamodaranIndustrialBenchmark: nextSecondary,
      fallbackDamodaranIndustrialBenchmark: nextFallback,
      betaTableKey: prefersExisting(existing.betaTableKey, overwrite) ? existing.betaTableKey : nextBetaKey,
      marginTableKey: prefersExisting(existing.marginTableKey, overwrite) ? existing.marginTableKey : nextMarginKey,
      reinvestmentTableKey: prefersExisting(existing.reinvestmentTableKey, overwrite)
        ? existing.reinvestmentTableKey
        : nextReinvestmentKey,
      workingCapitalTableKey: prefersExisting(existing.workingCapitalTableKey, overwrite)
        ? existing.workingCapitalTableKey
        : nextWorkingCapitalKey,
      growthRocTableKey: prefersExisting(existing.growthRocTableKey, overwrite)
        ? existing.growthRocTableKey
        : nextGrowthRocKey,
      multiplesTableKey: prefersExisting(existing.multiplesTableKey, overwrite)
        ? existing.multiplesTableKey
        : nextMultiplesKey,
      defaultStageType: definition.stage,
      cyclicalityFlag: definition.cyclicality,
      defaultStableMarginRule: nextPrimary ? "Converge toward validated benchmark stable margin over horizon." : "Not Set",
      defaultStableRocRule: nextPrimary ? "Converge toward validated benchmark stable ROC over horizon." : "Not Set",
      defaultSalesToCapitalRule: nextPrimary ? "Anchor stable sales-to-capital to validated benchmark." : "Not Set",
      sectorWarning: definition.warning,
      mappingReviewFlag: finalReviewFlag,
      status: finalStatus,
      sourceName: SECTOR_MAPPING_SOURCE_NAME,
      sourceUrl: SECTOR_MAPPING_SOURCE_URL,
      sourceUpdateDate: SECTOR_MAPPING_SOURCE_UPDATE_DATE,
      importedLastUpdated: now,
      notes: definition.notes,
    });

    candidateGuideRows.push({
      id: `sector_candidate_${existing.id}`,
      ismSector: sector.ismSector,
      candidatePrimaryBenchmark: validatedPrimary,
      candidateSecondaryBenchmark: validatedSecondary,
      candidateFallbackBenchmark: validatedFallback,
      suggestedPrimaryBenchmark: nextPrimary ?? validatedPrimary,
      defaultStatus: finalStatus,
      reason: definition.warning,
      sourceBasis: SOURCE_BASIS,
      notes: definition.notes,
      importedLastUpdated: now,
    });
  }

  const validation = await validateSectorMappingsAgainstDamodaranMaster(updatedMappings, {
    importedLastUpdated: now,
  });
  warnings.push(...validation.warnings);
  errors.push(...validation.errors);

  const readinessRows = validation.readinessRows;
  const primaryValidCount = updatedMappings.filter((row) => hasValue(row.primaryDamodaranIndustrialBenchmark)).filter(
    (row) => exactNames.has(row.primaryDamodaranIndustrialBenchmark as string),
  ).length;
  const primaryInvalidCount = updatedMappings.filter((row) => {
    if (!hasValue(row.primaryDamodaranIndustrialBenchmark)) {
      return false;
    }
    return !exactNames.has(row.primaryDamodaranIndustrialBenchmark as string);
  }).length;

  const mappingRequiredCount = updatedMappings.filter((row) => row.status === "Mapping Required").length;
  const reviewRequiredCount = updatedMappings.filter((row) => row.status === "Review Required").length;
  const okCount = updatedMappings.filter((row) => row.status === "OK").length;
  const excludedSpecialReviewCount = updatedMappings.filter(
    (row) => row.status === "Excluded / Special Review",
  ).length;

  return {
    updatedMappings,
    candidateGuideRows,
    readinessRows,
    summary: {
      success: errors.length === 0,
      rowsEvaluated: updatedMappings.length,
      candidatesGenerated,
      primaryValidCount,
      primaryInvalidCount,
      mappingRequiredCount,
      reviewRequiredCount,
      okCount,
      excludedSpecialReviewCount,
      warnings,
      errors,
    },
  };
}
