import "server-only";
import { getCanonicalDamodaranIndustries } from "@/lib/firestore/repositories/damodaranDataRepository";
import type {
  SectorIndustryMappingRow,
  SectorMappingReadinessRow,
  SectorMappingStatusValue,
} from "@/lib/types";

// Validation here primarily supports legacy/helper ISM-first rows.
// Benchmark-first Industry Benchmark Config completeness is validated via repository adapters.
function normalizeName(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function evaluateBenchmark(
  benchmark: string | null,
  status: string,
  exactNames: Set<string>,
  normalizedNames: Set<string>,
) {
  if (!benchmark || benchmark.trim().length === 0) {
    const isAllowedBlank =
      status === "Mapping Required" || status === "Excluded / Special Review";
    return {
      value: null,
      valid: isAllowedBlank,
      warning: isAllowedBlank ? null : "Blank benchmark is only allowed for mapping-required or excluded status.",
      normalizedOnlyMatch: false,
    };
  }

  if (exactNames.has(benchmark)) {
    return {
      value: benchmark,
      valid: true,
      warning: null,
      normalizedOnlyMatch: false,
    };
  }

  const normalized = normalizeName(benchmark);
  if (normalizedNames.has(normalized)) {
    return {
      value: benchmark,
      valid: false,
      warning: "Benchmark matches only after normalization; possible Excel line-wrap/spacing variant. Review required.",
      normalizedOnlyMatch: true,
    };
  }

  return {
    value: benchmark,
    valid: false,
    warning: "Benchmark does not exactly match Damodaran Industry Master List.",
    normalizedOnlyMatch: false,
  };
}

export function deriveReadinessStatusFromMapping(
  mapping: SectorIndustryMappingRow,
  primaryValid: boolean,
  secondaryValid: boolean,
  fallbackValid: boolean,
): SectorMappingReadinessRow["readinessStatus"] {
  if (mapping.status === "Excluded / Special Review") {
    return "Excluded / Special Review";
  }

  const hasAnyBenchmark = Boolean(
    mapping.primaryDamodaranIndustrialBenchmark ||
      mapping.secondaryDamodaranIndustrialBenchmark ||
      mapping.fallbackDamodaranIndustrialBenchmark,
  );

  if (!hasAnyBenchmark) {
    return "Mapping Required";
  }

  if (!primaryValid || !secondaryValid || !fallbackValid) {
    return "Review Required";
  }

  if (mapping.status === "Review Required" || mapping.mappingReviewFlag === "Review Required") {
    return "Review Required";
  }

  return "OK";
}

export async function validateSectorMappingsAgainstDamodaranMaster(
  mappings: SectorIndustryMappingRow[],
  opts?: {
    importedLastUpdated?: string | null;
  },
): Promise<{
  readinessRows: SectorMappingReadinessRow[];
  industryMasterListAvailable: boolean;
  warnings: string[];
  errors: string[];
}> {
  const damodaranCanonical = await getCanonicalDamodaranIndustries();
  const masterNames = damodaranCanonical.data
    .filter((row) => row.isCanonical)
    .map((row) => row.industryName)
    .filter(Boolean);
  const exactNames = new Set(masterNames);
  const normalizedNames = new Set(masterNames.map((name) => normalizeName(name)));
  const warnings: string[] = [];
  const errors: string[] = [];

  const readinessRows = mappings.map((mapping) => {
    const primaryEval = evaluateBenchmark(
      mapping.primaryDamodaranIndustrialBenchmark,
      mapping.status,
      exactNames,
      normalizedNames,
    );
    const secondaryEval = evaluateBenchmark(
      mapping.secondaryDamodaranIndustrialBenchmark,
      mapping.status,
      exactNames,
      normalizedNames,
    );
    const fallbackEval = evaluateBenchmark(
      mapping.fallbackDamodaranIndustrialBenchmark,
      mapping.status,
      exactNames,
      normalizedNames,
    );

    if (primaryEval.warning) {
      warnings.push(`${mapping.ismSector}: primary benchmark - ${primaryEval.warning}`);
    }
    if (secondaryEval.warning) {
      warnings.push(`${mapping.ismSector}: secondary benchmark - ${secondaryEval.warning}`);
    }
    if (fallbackEval.warning) {
      warnings.push(`${mapping.ismSector}: fallback benchmark - ${fallbackEval.warning}`);
    }

    const fallbackValue = mapping.fallbackDamodaranIndustrialBenchmark?.trim() || null;
    if (fallbackValue === "Total Market (without financials)") {
      warnings.push(
        `${mapping.ismSector}: fallback uses Total Market (without financials); keep as fallback/reference only.`,
      );
    }

    const readinessStatus = deriveReadinessStatusFromMapping(
      mapping,
      primaryEval.valid,
      secondaryEval.valid,
      fallbackEval.valid,
    );

    return {
      id: `sector_readiness_${mapping.id}`,
      ismSector: mapping.ismSector,
      operatingCoStatus:
        mapping.status === "Excluded / Special Review"
          ? "Excluded / Special Review"
          : mapping.status === "Review Required"
            ? "Review Required"
            : "Supported",
      primaryBenchmark: primaryEval.value,
      primaryBenchmarkValid: primaryEval.valid,
      secondaryBenchmark: secondaryEval.value,
      secondaryBenchmarkValid: secondaryEval.valid,
      fallbackBenchmark: fallbackEval.value,
      fallbackBenchmarkValid: fallbackEval.valid,
      currentMappingReviewFlag: mapping.mappingReviewFlag,
      currentStatus: mapping.status,
      readinessStatus,
      requiredAction:
        readinessStatus === "OK"
          ? "No immediate action."
          : readinessStatus === "Excluded / Special Review"
            ? "Keep excluded until explicit analyst override."
            : readinessStatus === "Review Required"
              ? "Review benchmark choice and mapping flags."
              : "Assign benchmark candidate in next phase.",
      importedLastUpdated: opts?.importedLastUpdated ?? mapping.importedLastUpdated,
      notes: mapping.notes,
    } satisfies SectorMappingReadinessRow;
  });

  if (masterNames.length === 0) {
    errors.push(
      "Damodaran Industry Master List is unavailable. Benchmark validation runs in degraded mode.",
    );
  }

  return {
    readinessRows,
    industryMasterListAvailable: masterNames.length > 0,
    warnings,
    errors,
  };
}

export const sectorMappingStatusDefinitions: SectorMappingStatusValue[] = [
  {
    id: "sector_status_mapping_required",
    status: "Mapping Required",
    meaning: "Foundation row exists but no benchmark is selected yet.",
    actionRequired: "Add candidate benchmark in Phase 4C-2B-2.",
  },
  {
    id: "sector_status_review_required",
    status: "Review Required",
    meaning: "Sector needs analyst review before benchmark usage.",
    actionRequired: "Validate benchmark fit and assumptions.",
  },
  {
    id: "sector_status_excluded",
    status: "Excluded / Special Review",
    meaning: "Sector is outside standard Operating Co assumptions.",
    actionRequired: "Keep excluded unless explicit exception is approved.",
  },
  {
    id: "sector_status_ok",
    status: "OK",
    meaning: "Benchmark is valid and can be considered in later phases.",
    actionRequired: "Use with valuation judgment; mapping alone is not sufficient.",
  },
];
