import "server-only";
import type { CanonicalDamodaranIndustryRow } from "@/lib/types";

export interface DamodaranIndustryUniverseCrossCheckResult {
  exactMatches: string[];
  missingInCanonical: string[];
  extraInCanonical: string[];
  namingVariants: Array<{ universeName: string; canonicalName: string }>;
  reviewCount: number;
  universeCount: number;
  canonicalIndustryCount: number;
}

function normalizeForCompare(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function compactForCompare(value: string) {
  return normalizeForCompare(value).replace(/[^a-z0-9]/g, "");
}

export function crossCheckDamodaranIndustryUniverse(input: {
  universeNames: string[];
  canonicalRows: CanonicalDamodaranIndustryRow[];
}): DamodaranIndustryUniverseCrossCheckResult {
  const canonicalIndustryNames = input.canonicalRows
    .filter((row) => row.isCanonical)
    .map((row) => row.industryName);

  const canonicalByNormalized = new Map(
    canonicalIndustryNames.map((name) => [normalizeForCompare(name), name]),
  );
  const canonicalByCompact = new Map(
    canonicalIndustryNames.map((name) => [compactForCompare(name), name]),
  );

  const exactMatches: string[] = [];
  const missingInCanonical: string[] = [];
  const namingVariants: Array<{ universeName: string; canonicalName: string }> = [];

  for (const universeName of input.universeNames) {
    const normalized = normalizeForCompare(universeName);
    const exact = canonicalByNormalized.get(normalized);
    if (exact) {
      exactMatches.push(universeName);
      continue;
    }

    const compact = compactForCompare(universeName);
    const variant = canonicalByCompact.get(compact);
    if (variant && variant !== universeName) {
      namingVariants.push({ universeName, canonicalName: variant });
      continue;
    }

    missingInCanonical.push(universeName);
  }

  const universeNormalizedSet = new Set(input.universeNames.map((name) => normalizeForCompare(name)));
  const extraInCanonical = canonicalIndustryNames.filter(
    (name) => !universeNormalizedSet.has(normalizeForCompare(name)),
  );

  const reviewCount =
    input.canonicalRows.filter((row) => row.canonicalStatus === "Review").length +
    namingVariants.length;

  return {
    exactMatches: exactMatches.sort((a, b) => a.localeCompare(b)),
    missingInCanonical: missingInCanonical.sort((a, b) => a.localeCompare(b)),
    extraInCanonical: extraInCanonical.sort((a, b) => a.localeCompare(b)),
    namingVariants,
    reviewCount,
    universeCount: input.universeNames.length,
    canonicalIndustryCount: canonicalIndustryNames.length,
  };
}
