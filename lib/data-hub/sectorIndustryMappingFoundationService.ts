import "server-only";
import type {
  ISMSectorRow,
  SectorIndustryMappingRow,
  SectorMappingImportStatus,
  SectorMappingReadinessRow,
  SectorMappingRule,
  SectorMappingStatusValue,
  SectorMappingValidationValue,
} from "@/lib/types";
import { validateSectorMappingsAgainstDamodaranMaster } from "@/lib/data-hub/sectorBenchmarkValidationService";
import { sectorMappingStatusDefinitions } from "@/lib/data-hub/sectorBenchmarkValidationService";

// Legacy/helper foundation layer kept for compatibility.
export const SECTOR_MAPPING_SOURCE_NAME = "Operating Co Template — Master Specification v1.5";
export const SECTOR_MAPPING_SOURCE_URL = "internal://operating-co-template-master-spec-v1.5";
export const SECTOR_MAPPING_SOURCE_UPDATE_DATE = "2026-05-26";

function slugify(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

interface SectorSeedInput {
  ismSector: string;
  ismArea: ISMSectorRow["ismArea"];
  operatingCoStatus: ISMSectorRow["operatingCoStatus"];
  notes: string;
}

const sectorSeedInputs: SectorSeedInput[] = [
  { ismSector: "Apparel, Leather & Allied Products", ismArea: "Manufacturing", operatingCoStatus: "Supported", notes: "Mapping foundation row only; benchmark to be reviewed." },
  { ismSector: "Chemical Products", ismArea: "Manufacturing", operatingCoStatus: "Supported", notes: "Mapping foundation row only; benchmark to be reviewed." },
  { ismSector: "Computer & Electronic Products", ismArea: "Manufacturing", operatingCoStatus: "Supported", notes: "Mapping foundation row only; benchmark to be reviewed." },
  { ismSector: "Electrical Equipment, Appliances & Components", ismArea: "Manufacturing", operatingCoStatus: "Supported", notes: "Mapping foundation row only; benchmark to be reviewed." },
  { ismSector: "Fabricated Metal Products", ismArea: "Manufacturing", operatingCoStatus: "Supported", notes: "Mapping foundation row only; benchmark to be reviewed." },
  { ismSector: "Food, Beverage & Tobacco Products", ismArea: "Manufacturing", operatingCoStatus: "Supported", notes: "Mapping foundation row only; benchmark to be reviewed." },
  { ismSector: "Furniture & Related Products", ismArea: "Manufacturing", operatingCoStatus: "Supported", notes: "Mapping foundation row only; benchmark to be reviewed." },
  { ismSector: "Machinery", ismArea: "Manufacturing", operatingCoStatus: "Supported", notes: "Mapping foundation row only; benchmark to be reviewed." },
  { ismSector: "Miscellaneous Manufacturing", ismArea: "Manufacturing", operatingCoStatus: "Supported", notes: "Mapping foundation row only; benchmark to be reviewed." },
  { ismSector: "Nonmetallic Mineral Products", ismArea: "Manufacturing", operatingCoStatus: "Supported", notes: "Mapping foundation row only; benchmark to be reviewed." },
  { ismSector: "Paper Products", ismArea: "Manufacturing", operatingCoStatus: "Supported", notes: "Mapping foundation row only; benchmark to be reviewed." },
  { ismSector: "Petroleum & Coal Products", ismArea: "Manufacturing", operatingCoStatus: "Review Required", notes: "Commodity-cyclical sector; review required before benchmark use." },
  { ismSector: "Plastics & Rubber Products", ismArea: "Manufacturing", operatingCoStatus: "Supported", notes: "Mapping foundation row only; benchmark to be reviewed." },
  { ismSector: "Primary Metals", ismArea: "Manufacturing", operatingCoStatus: "Review Required", notes: "Commodity-cyclical sector; review required before benchmark use." },
  { ismSector: "Printing & Related Support Activities", ismArea: "Manufacturing", operatingCoStatus: "Supported", notes: "Mapping foundation row only; benchmark to be reviewed." },
  { ismSector: "Textile Mills", ismArea: "Manufacturing", operatingCoStatus: "Supported", notes: "Mapping foundation row only; benchmark to be reviewed." },
  { ismSector: "Transportation Equipment", ismArea: "Manufacturing", operatingCoStatus: "Supported", notes: "Mapping foundation row only; benchmark to be reviewed." },
  { ismSector: "Wood Products", ismArea: "Manufacturing", operatingCoStatus: "Supported", notes: "Mapping foundation row only; benchmark to be reviewed." },
  { ismSector: "Accommodation & Food Services", ismArea: "Services", operatingCoStatus: "Supported", notes: "Mapping foundation row only; benchmark to be reviewed." },
  { ismSector: "Agriculture, Forestry, Fishing & Hunting", ismArea: "Services", operatingCoStatus: "Supported", notes: "Mapping foundation row only; benchmark to be reviewed." },
  { ismSector: "Arts, Entertainment & Recreation", ismArea: "Services", operatingCoStatus: "Supported", notes: "Mapping foundation row only; benchmark to be reviewed." },
  { ismSector: "Construction", ismArea: "Services", operatingCoStatus: "Review Required", notes: "Cyclical and asset-heavy profile; requires analyst review." },
  { ismSector: "Educational Services", ismArea: "Services", operatingCoStatus: "Supported", notes: "Mapping foundation row only; benchmark to be reviewed." },
  { ismSector: "Finance & Insurance", ismArea: "Services", operatingCoStatus: "Excluded / Special Review", notes: "Financial institutions are outside standard Operating Co template assumptions." },
  { ismSector: "Health Care & Social Assistance", ismArea: "Services", operatingCoStatus: "Supported", notes: "Mapping foundation row only; benchmark to be reviewed." },
  { ismSector: "Information", ismArea: "Services", operatingCoStatus: "Supported", notes: "Mapping foundation row only; benchmark to be reviewed." },
  { ismSector: "Management of Companies & Support Services", ismArea: "Services", operatingCoStatus: "Review Required", notes: "Possible holding-investment character; analyst review required." },
  { ismSector: "Mining", ismArea: "Services", operatingCoStatus: "Review Required", notes: "Commodity-cyclical sector; review required before benchmark use." },
  { ismSector: "Other Services", ismArea: "Services", operatingCoStatus: "Supported", notes: "Mapping foundation row only; benchmark to be reviewed." },
  { ismSector: "Professional, Scientific & Technical Services", ismArea: "Services", operatingCoStatus: "Supported", notes: "Mapping foundation row only; benchmark to be reviewed." },
  { ismSector: "Public Administration", ismArea: "Services", operatingCoStatus: "Review Required", notes: "Usually not listed as operating company; requires special review." },
  { ismSector: "Real Estate, Rental & Leasing", ismArea: "Services", operatingCoStatus: "Review Required", notes: "REIT/NAV-driven cases are outside normal scope; operating leasing requires review." },
  { ismSector: "Retail Trade", ismArea: "Services", operatingCoStatus: "Supported", notes: "Mapping foundation row only; benchmark to be reviewed." },
  { ismSector: "Transportation & Warehousing", ismArea: "Services", operatingCoStatus: "Supported", notes: "Mapping foundation row only; benchmark to be reviewed." },
  { ismSector: "Utilities", ismArea: "Services", operatingCoStatus: "Review Required", notes: "Regulated/stable assumptions require explicit review." },
  { ismSector: "Wholesale Trade", ismArea: "Services", operatingCoStatus: "Supported", notes: "Mapping foundation row only; benchmark to be reviewed." },
  { ismSector: "Custom / Other Operating Co", ismArea: "Custom", operatingCoStatus: "Review Required", notes: "Custom sector requires analyst-reviewed mapping candidate." },
];

export function buildOfficialIsmSectorRows(): ISMSectorRow[] {
  return sectorSeedInputs.map((item) => ({
    id: `ism_sector_${slugify(item.ismSector)}`,
    ismSector: item.ismSector,
    ismArea: item.ismArea,
    active: true,
    operatingCoStatus: item.operatingCoStatus,
    defaultMappingStatus: "Mapping Required",
    notes: item.notes,
  }));
}

export function buildSectorMappingFoundationRows(ismRows: ISMSectorRow[]): SectorIndustryMappingRow[] {
  const now = new Date().toISOString();
  return ismRows.map((row) => {
    const isExcluded = row.operatingCoStatus === "Excluded / Special Review";
    const isReview = row.operatingCoStatus === "Review Required";

    return {
      id: `sector_mapping_${slugify(row.ismSector)}`,
      ismSector: row.ismSector,
      businessDescription: "",
      primaryDamodaranIndustrialBenchmark: null,
      secondaryDamodaranIndustrialBenchmark: null,
      fallbackDamodaranIndustrialBenchmark: null,
      betaTableKey: null,
      marginTableKey: null,
      reinvestmentTableKey: null,
      workingCapitalTableKey: null,
      growthRocTableKey: null,
      multiplesTableKey: null,
      defaultStageType: "Not Set",
      cyclicalityFlag: isReview ? "Review Required" : "Not Set",
      defaultStableMarginRule: "Not Set",
      defaultStableRocRule: "Not Set",
      defaultSalesToCapitalRule: "Not Set",
      sectorWarning: isExcluded
        ? "Sector outside standard Operating Co scope. Mapping intentionally not active."
        : "Benchmark mapping is pending and required before usage.",
      mappingReviewFlag: isExcluded ? "Excluded / Special Review" : "Mapping Required",
      status: isExcluded
        ? "Excluded / Special Review"
        : isReview
          ? "Review Required"
          : "Mapping Required",
      sourceName: SECTOR_MAPPING_SOURCE_NAME,
      sourceUrl: SECTOR_MAPPING_SOURCE_URL,
      sourceUpdateDate: SECTOR_MAPPING_SOURCE_UPDATE_DATE,
      importedLastUpdated: now,
      mappingDirection: "ISM_TO_BENCHMARK_HELPER",
      notes:
        "Benchmark mapping will be generated/validated in Phase 4C-2B-2. This foundation row does not force valuation assumptions.",
    };
  });
}

export function buildSectorMappingRules(): SectorMappingRule[] {
  return [
    {
      id: "sector_rule_001",
      ruleId: "SECTOR-MAP-001",
      rule: "Mapping recommends benchmark context but does not force valuation assumptions.",
      defaultBehavior: "Keep mapping informational until analyst-approved benchmark candidates are ready.",
      reviewCondition: "If mapping is used without benchmark validation, set review status.",
      status: "Active",
      notes: "Sector mapping must not directly set intrinsic value per share.",
    },
    {
      id: "sector_rule_002",
      ruleId: "SECTOR-MAP-002",
      rule: "ISM-sector is internal taxonomy; Damodaran benchmark is external reference taxonomy.",
      defaultBehavior: "Do not treat ISM-sector and Damodaran benchmark as equivalent labels.",
      reviewCondition: "If benchmark is blank and row is not mapping-required/excluded, raise review warning.",
      status: "Active",
      notes: "No blind one-to-one assumption.",
    },
    {
      id: "sector_rule_003",
      ruleId: "SECTOR-MAP-003",
      rule: "Financials, REIT/NAV-style real estate, and holding-investment structures are special review cases.",
      defaultBehavior: "Mark excluded/review until explicit analyst approval.",
      reviewCondition: "When sector falls outside standard Operating Co scope.",
      status: "Active",
      notes: "Outside normal Operating Co template assumptions.",
    },
    {
      id: "sector_rule_004",
      ruleId: "SECTOR-MAP-004",
      rule: "Blank benchmark fields are allowed in foundation stage when correctly flagged.",
      defaultBehavior: "Status remains Mapping Required or Excluded / Special Review.",
      reviewCondition: "Blank benchmark with any other status should trigger review.",
      status: "Active",
      notes: "Candidate mapping generation is deferred to Phase 4C-2B-2.",
    },
  ];
}

export function buildSectorMappingValidationValues(): SectorMappingValidationValue[] {
  return [
    {
      id: "sector_validation_blank_allowed",
      validationType: "Blank Benchmark Allowance",
      allowedValue: "Blank allowed only when status is Mapping Required or Excluded / Special Review",
      active: true,
      notes: "Foundation-stage rule.",
    },
    {
      id: "sector_validation_exact_master_match",
      validationType: "Benchmark Match",
      allowedValue: "Exact string match against Damodaran Industry Master List",
      active: true,
      notes: "Normalized-only match should remain review warning.",
    },
    {
      id: "sector_validation_total_market_fallback",
      validationType: "Fallback Constraint",
      allowedValue: "Total Market (without financials) is fallback/reference only, not primary benchmark",
      active: true,
      notes: "Use only when present in master list and explicitly reviewed.",
    },
  ];
}

export async function buildSectorReadinessFromMappings(mappings: SectorIndustryMappingRow[]) {
  return validateSectorMappingsAgainstDamodaranMaster(mappings, {
    importedLastUpdated: new Date().toISOString(),
  });
}

export async function seedSectorIndustryMappingFoundation(params?: {
  reset?: boolean;
  existingIsmRows?: ISMSectorRow[];
  existingMappingRows?: SectorIndustryMappingRow[];
}) {
  const reset = params?.reset ?? false;
  const seedTimestamp = new Date().toISOString();
  const seededIsmRows = buildOfficialIsmSectorRows();
  const baseMappingRows = buildSectorMappingFoundationRows(seededIsmRows);
  const existingIsmBySector = new Map((params?.existingIsmRows ?? []).map((row) => [row.ismSector, row]));
  const existingMappingBySector = new Map(
    (params?.existingMappingRows ?? []).map((row) => [row.ismSector, row]),
  );

  const finalIsmRows = seededIsmRows.map((row) =>
    !reset && existingIsmBySector.has(row.ismSector)
      ? { ...row, ...existingIsmBySector.get(row.ismSector) }
      : row,
  );

  const finalMappingRows = baseMappingRows.map((row) => {
    if (!reset && existingMappingBySector.has(row.ismSector)) {
      const existing = existingMappingBySector.get(row.ismSector);
      if (existing) {
        return {
          ...row,
          ...existing,
          sourceName: SECTOR_MAPPING_SOURCE_NAME,
          sourceUrl: SECTOR_MAPPING_SOURCE_URL,
          sourceUpdateDate: SECTOR_MAPPING_SOURCE_UPDATE_DATE,
          importedLastUpdated: seedTimestamp,
        };
      }
    }
    return { ...row, importedLastUpdated: seedTimestamp };
  });

  const rules = buildSectorMappingRules();
  const validationValues = buildSectorMappingValidationValues();
  const statusValues: SectorMappingStatusValue[] = sectorMappingStatusDefinitions;
  const validation = await buildSectorReadinessFromMappings(finalMappingRows);
  const readinessRows: SectorMappingReadinessRow[] = validation.readinessRows.map((row) => ({
    ...row,
    importedLastUpdated: seedTimestamp,
  }));

  const mappingRequiredCount = finalMappingRows.filter((row) => row.status === "Mapping Required").length;
  const excludedSpecialReviewCount = finalMappingRows.filter(
    (row) => row.status === "Excluded / Special Review",
  ).length;
  const reviewRequiredCount = finalMappingRows.filter((row) => row.status === "Review Required").length;

  const importStatus: SectorMappingImportStatus = {
    id: "sector-mapping-foundation-status",
    sourceName: SECTOR_MAPPING_SOURCE_NAME,
    sourceUrl: SECTOR_MAPPING_SOURCE_URL,
    sourceUpdateDate: SECTOR_MAPPING_SOURCE_UPDATE_DATE,
    importedLastUpdated: seedTimestamp,
    status: "Foundation built / Mapping candidates pending",
    ismSectorCount: finalIsmRows.length,
    mappingRowsCount: finalMappingRows.length,
    mappingRequiredCount,
    excludedSpecialReviewCount,
    reviewRequiredCount,
    okCount: finalMappingRows.filter((row) => row.status === "OK").length,
    rowsEvaluated: finalMappingRows.length,
    candidatesGenerated: finalMappingRows.filter((row) => Boolean(row.primaryDamodaranIndustrialBenchmark)).length,
    primaryValidCount: 0,
    primaryInvalidCount: 0,
    lastCandidateGeneratedAt: null,
    industryMasterListAvailable: validation.industryMasterListAvailable,
    warnings: validation.warnings,
    errors: validation.errors,
  };

  return {
    ismSectorRows: finalIsmRows,
    mappingRows: finalMappingRows,
    rules,
    validationValues,
    statusValues,
    readinessRows,
    importStatus,
    summary: {
      success: validation.errors.length === 0,
      ismSectorCount: finalIsmRows.length,
      mappingRowsCount: finalMappingRows.length,
      mappingRequiredCount,
      excludedSpecialReviewCount,
      reviewRequiredCount,
      industryMasterListAvailable: validation.industryMasterListAvailable,
      warnings: validation.warnings,
      errors: validation.errors,
    },
  };
}
