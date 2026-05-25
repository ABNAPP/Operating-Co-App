import "server-only";
import type {
  CountryErpRow,
  CountryRegionalGroupMapRow,
  RegionalErpRow,
  RegionalGroupDefinition,
} from "@/lib/types";

function average(values: Array<number | null>): number | null {
  const valid = values.filter((value): value is number => typeof value === "number");
  if (valid.length === 0) {
    return null;
  }
  return valid.reduce((acc, value) => acc + value, 0) / valid.length;
}

function hasUsableMetric(row: CountryErpRow) {
  const metrics = [
    row.totalEquityRiskPremium,
    row.adjustedDefaultSpread,
    row.countryRiskPremium,
    row.corporateTaxRate,
  ];
  return metrics.some((value) => typeof value === "number");
}

export function calculateRegionalErp(
  countryRows: CountryErpRow[],
  mapRows: CountryRegionalGroupMapRow[],
  definitions: RegionalGroupDefinition[],
): RegionalErpRow[] {
  const now = new Date().toISOString();
  const countryByCode = new Map<string, CountryErpRow>();
  const countryByName = new Map<string, CountryErpRow>();

  for (const row of countryRows) {
    if (row.countryCode) {
      countryByCode.set(row.countryCode.toUpperCase(), row);
    }
    countryByName.set(row.countryName.trim().toLowerCase(), row);
  }

  return definitions
    .filter((definition) => definition.active)
    .map((definition) => {
      const mappedRows = mapRows.filter(
        (mapRow) => mapRow.active && mapRow.regionalGroup === definition.regionalGroup,
      );

      const resolvedCountries = mappedRows
        .map((mapRow) => {
          if (mapRow.countryCode) {
            return countryByCode.get(mapRow.countryCode.toUpperCase()) ?? null;
          }
          return countryByName.get(mapRow.countryName.trim().toLowerCase()) ?? null;
        })
        .filter((row): row is CountryErpRow => row !== null);

      const countryCount = resolvedCountries.length;
      const activeMappingCount = mappedRows.length;
      const usableCountryCount = resolvedCountries.filter(hasUsableMetric).length;
      const dataCoveragePct =
        activeMappingCount === 0 ? 0 : usableCountryCount / activeMappingCount;

      const status =
        usableCountryCount >= definition.minimumCountryCount
          ? "Calculated"
          : "Review / Insufficient Coverage";

      return {
        id: `regional_erp_${definition.regionalGroup.toLowerCase().replace(/[^a-z0-9]+/g, "_")}`,
        regionName: definition.regionalGroup,
        regionType: definition.regionType,
        totalEquityRiskPremium: average(
          resolvedCountries.map((row) => row.totalEquityRiskPremium),
        ),
        adjustedDefaultSpread: average(
          resolvedCountries.map((row) => row.adjustedDefaultSpread),
        ),
        countryRiskPremium: average(resolvedCountries.map((row) => row.countryRiskPremium)),
        corporateTaxRate: average(resolvedCountries.map((row) => row.corporateTaxRate)),
        countryCount,
        activeMappingCount,
        dataCoveragePct,
        calculationMethod: definition.calculationMethod,
        sourceName: "Calculated from Country ERP + Country Regional Group Map",
        sourceUrl: "internal://country-risk-erp/regional-calculation",
        sourceUpdateDate: now,
        importedLastUpdated: now,
        status,
        notes: `Calculated as simple arithmetic average of active mapped countries. Active mapped countries with usable data: ${usableCountryCount} / ${activeMappingCount}. Regional ERP is fallback/reference only.`,
      } satisfies RegionalErpRow;
    });
}
