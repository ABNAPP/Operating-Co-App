import "server-only";
import type {
  CanonicalDamodaranIndustryRow,
  DamodaranDatasetCoverageRow,
  DamodaranIndustryMasterRow,
  DamodaranRawDatasetRow,
} from "@/lib/types";

const CORE_DATASET_KEYS = [
  { id: "betaGlobal", aliases: ["beta", "unlevered beta", "levered beta"] },
  { id: "marginGlobal", aliases: ["margin"] },
  { id: "capexGlobal", aliases: ["capex"] },
  { id: "waccGlobal", aliases: ["wacc", "cost of capital"] },
  { id: "wcdataGlobal", aliases: ["working capital", "wcdata"] },
  { id: "fundgrEBGlobal", aliases: ["fundgr", "fundamental growth"] },
  { id: "taxrateGlobal", aliases: ["tax rate", "taxrate"] },
  { id: "pbvdataGlobal", aliases: ["pbv", "price to book"] },
  { id: "pedataGlobal", aliases: ["pe", "p/e", "price earnings"] },
  { id: "psdataGlobal", aliases: ["ps", "p/s", "price to sales"] },
  { id: "evdataGlobal", aliases: ["ev", "enterprise value"] },
  { id: "divfcfeGlobal", aliases: ["fcfe", "dividend"] },
] as const;

const NON_INDUSTRY_DATASET_HINTS = ["countrytaxrates", "countrystats", "ratings"];

const KNOWN_WRAP_VARIANTS = new Set([
  "Financial Svcs. (Non-bank & Insur ance)",
  "Healthcare Information and Techno logy",
  "Oil/Gas (Production and Exploratio n)",
  "Total Market (without financial s)",
]);

const KEEP_AS_CANONICAL = new Set(["Total Market", "Total Market (without financials)"]);

function normalize(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function slugify(value: string) {
  return normalize(value).replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function compactForDuplicateMatch(value: string) {
  return normalize(value).replace(/[^a-z0-9]/g, "");
}

function isCoreDatasetName(datasetName: string, coreId: string) {
  const normalized = normalize(datasetName).replace(/[^a-z0-9 ]/g, "");
  const key = CORE_DATASET_KEYS.find((item) => item.id === coreId);
  if (!key) return false;
  return key.aliases.some((alias) => normalized.includes(alias));
}

function collapseLineWrapArtifacts(name: string) {
  return name
    .replace(/([A-Za-z]{4,})\s([A-Za-z]{1,3})(?=\b)/g, "$1$2")
    .replace(/\s+/g, " ")
    .trim();
}

function isLikelyNonIndustryRow(industryName: string, sourceDatasets: string[]) {
  const n = normalize(industryName);
  const hasNonIndustryDatasetOnly =
    sourceDatasets.length > 0 &&
    sourceDatasets.every((dataset) =>
      NON_INDUSTRY_DATASET_HINTS.some((hint) => dataset.toLowerCase().includes(hint)),
    );
  if (hasNonIndustryDatasetOnly) {
    return true;
  }
  if (KEEP_AS_CANONICAL.has(industryName)) {
    return false;
  }
  return (
    n.includes("country ") ||
    n.startsWith("country") ||
    n.includes("rating") ||
    n.includes("tax rate by country") ||
    n.includes("sovereign") ||
    n.includes("government bond") ||
    n.includes("mature market premium")
  );
}

function toCoverageStatus(
  coverage: DamodaranDatasetCoverageRow | undefined,
): CanonicalDamodaranIndustryRow["coverageStatus"] {
  return coverage?.coverageStatus ?? "Unknown";
}

interface CanonicalBuildInput {
  rawRows: DamodaranRawDatasetRow[];
  masterRows: DamodaranIndustryMasterRow[];
  coverageRows: DamodaranDatasetCoverageRow[];
}

export function buildCanonicalDamodaranIndustryList(input: CanonicalBuildInput) {
  const coverageByIndustry = new Map(input.coverageRows.map((row) => [row.industryName, row]));
  const datasetByIndustry = new Map<string, Set<string>>();
  for (const raw of input.rawRows) {
    if (!raw.industryName?.trim()) continue;
    const next = datasetByIndustry.get(raw.industryName) ?? new Set<string>();
    next.add(raw.datasetId);
    datasetByIndustry.set(raw.industryName, next);
  }

  for (const row of input.masterRows) {
    const next = datasetByIndustry.get(row.industryName) ?? new Set<string>();
    for (const dataset of row.presentInDatasets ?? []) next.add(dataset);
    for (const dataset of row.sourceDatasetNames ?? []) next.add(dataset);
    datasetByIndustry.set(row.industryName, next);
  }

  const groupedByCompact = new Map<string, DamodaranIndustryMasterRow[]>();
  for (const row of input.masterRows) {
    const compactKey = compactForDuplicateMatch(collapseLineWrapArtifacts(row.industryName));
    const group = groupedByCompact.get(compactKey) ?? [];
    group.push(row);
    groupedByCompact.set(compactKey, group);
  }

  const canonicalPickByCompact = new Map<string, string>();
  for (const [compactKey, group] of groupedByCompact.entries()) {
    const sorted = [...group].sort((a, b) => {
      const aSources = (datasetByIndustry.get(a.industryName) ?? new Set()).size;
      const bSources = (datasetByIndustry.get(b.industryName) ?? new Set()).size;
      const aCore = (a.presentInDatasets ?? []).filter((dataset) =>
        CORE_DATASET_KEYS.some((core) => isCoreDatasetName(dataset, core.id)),
      ).length;
      const bCore = (b.presentInDatasets ?? []).filter((dataset) =>
        CORE_DATASET_KEYS.some((core) => isCoreDatasetName(dataset, core.id)),
      ).length;
      const aWrapped = collapseLineWrapArtifacts(a.industryName) !== a.industryName ? 1 : 0;
      const bWrapped = collapseLineWrapArtifacts(b.industryName) !== b.industryName ? 1 : 0;
      return bCore - aCore || bSources - aSources || aWrapped - bWrapped;
    });
    canonicalPickByCompact.set(compactKey, sorted[0].industryName);
  }

  const canonicalRows: CanonicalDamodaranIndustryRow[] = input.masterRows.map((row) => {
    const sourceDatasets = Array.from(datasetByIndustry.get(row.industryName) ?? new Set<string>()).sort();
    const presentFromDatasets = CORE_DATASET_KEYS.filter((core) =>
      sourceDatasets.some((dataset) => isCoreDatasetName(dataset, core.id)),
    ).map((core) => core.id);
    const coverageRow = coverageByIndustry.get(row.industryName);
    const presentFromCoverage = coverageRow
      ? [
          coverageRow.betaAvailable ? "betaGlobal" : null,
          coverageRow.marginAvailable ? "marginGlobal" : null,
          coverageRow.capexAvailable ? "capexGlobal" : null,
          coverageRow.waccAvailable ? "waccGlobal" : null,
          coverageRow.workingCapitalAvailable ? "wcdataGlobal" : null,
          coverageRow.fundgrEbAvailable ? "fundgrEBGlobal" : null,
          coverageRow.taxRateAvailable ? "taxrateGlobal" : null,
          coverageRow.multiplesAvailable ? "pedataGlobal" : null,
        ].filter((item): item is string => Boolean(item))
      : [];
    const presentInCoreDatasets = Array.from(
      new Set([...presentFromDatasets, ...presentFromCoverage]),
    );
    const missingCoreDatasets = CORE_DATASET_KEYS.map((core) => core.id).filter(
      (dataset) => !presentInCoreDatasets.includes(dataset),
    );
    const compactKey = compactForDuplicateMatch(collapseLineWrapArtifacts(row.industryName));
    const pickedCanonical = canonicalPickByCompact.get(compactKey) ?? row.industryName;
    const collapsedName = collapseLineWrapArtifacts(row.industryName);
    const isLineWrapVariant =
      KNOWN_WRAP_VARIANTS.has(row.industryName) || collapsedName !== row.industryName;
    const isDuplicateVariant = pickedCanonical !== row.industryName;
    const excludedNonIndustry = isLikelyNonIndustryRow(row.industryName, sourceDatasets);
    const missingCoreCoverage = presentInCoreDatasets.length === 0 && !KEEP_AS_CANONICAL.has(row.industryName);

    let canonicalStatus: CanonicalDamodaranIndustryRow["canonicalStatus"] = "Canonical";
    let isCanonical = true;
    let possibleCanonicalMatch: string | null = null;
    const notes: string[] = [];

    if (excludedNonIndustry) {
      canonicalStatus = "Excluded Non-Industry";
      isCanonical = false;
      notes.push("Excluded: appears to be non-industry metadata/country/rating/tax row.");
    } else if (isDuplicateVariant || isLineWrapVariant) {
      canonicalStatus = "Duplicate / Variant";
      isCanonical = false;
      possibleCanonicalMatch = pickedCanonical === row.industryName ? collapsedName : pickedCanonical;
      notes.push("Variant/duplicate detected; prefer canonical match.");
    } else if (missingCoreCoverage) {
      canonicalStatus = "Missing Core Coverage";
      isCanonical = false;
      notes.push("Missing all core dataset coverage.");
    } else if (toCoverageStatus(coverageRow) === "Review") {
      canonicalStatus = "Review";
      isCanonical = false;
      notes.push("Coverage matrix marks review.");
    }

    if (KEEP_AS_CANONICAL.has(row.industryName)) {
      canonicalStatus = "Canonical";
      isCanonical = true;
      possibleCanonicalMatch = null;
      notes.push("Kept as canonical aggregate benchmark by rule.");
    }

    return {
      id: `canonical_${slugify(row.industryName)}`,
      industryName: row.industryName,
      normalizedIndustryName: normalize(row.industryName),
      sourceDatasets,
      presentInCoreDatasets,
      missingCoreDatasets,
      coverageStatus: toCoverageStatus(coverageRow),
      canonicalStatus,
      isCanonical,
      isLineWrapVariant,
      possibleCanonicalMatch,
      notes: notes.join(" "),
    };
  });

  const canonicalIndustryCount = canonicalRows.filter((row) => row.isCanonical).length;
  const variantsExcluded = canonicalRows.filter((row) => row.canonicalStatus === "Duplicate / Variant").length;
  const nonIndustryExcluded = canonicalRows.filter(
    (row) => row.canonicalStatus === "Excluded Non-Industry",
  ).length;
  const reviewCount = canonicalRows.filter((row) => row.canonicalStatus === "Review").length;

  const warnings: string[] = [];
  if (canonicalIndustryCount < 90 || canonicalIndustryCount > 110) {
    warnings.push(
      `Canonical industry count is ${canonicalIndustryCount}, outside expected 90-110 range; review canonicalization rules.`,
    );
  }

  return {
    rows: canonicalRows.sort((a, b) => a.industryName.localeCompare(b.industryName)),
    summary: {
      rawIndustryCount: input.masterRows.length,
      canonicalIndustryCount,
      variantsExcluded,
      nonIndustryExcluded,
      reviewCount,
      readiness: warnings.length === 0 ? "Ready" : "Review",
      warnings,
    },
  };
}
