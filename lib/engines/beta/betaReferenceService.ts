import "server-only";
import { resolveDamodaranPullKey } from "@/lib/data-hub/damodaranPullKeyResolver";
import { getDamodaranDatasetRegister, getDamodaranRawDatasetRows } from "@/lib/firestore/repositories/damodaranDataRepository";
import { getBenchmarkDataPullKeysTable } from "@/lib/firestore/repositories/sectorIndustryMappingRepository";
import type { DamodaranRawDatasetRow } from "@/lib/types/damodaran-data";
import type {
  BetaLookupResult,
  BetaMatchType,
  BetaReadinessStatus,
  BetaReferenceRow,
  BetaReferenceStatus,
  BetaTableKeyMode,
} from "@/lib/types/beta-engine";
import { parseNumericString } from "@/lib/utils/formatters";

const BETA_DATASET_ID = "damodaran_beta_global";

const UNLEVERED_BETA_ALIASES = [
  "unlevered beta",
  "average unlevered beta",
  "unlevered beta (",
];

const LEVERED_BETA_ALIASES = ["beta ", "beta", "average levered beta", "levered beta"];

const CASH_ADJUSTED_ALIASES = [
  "unlevered beta corrected for cash",
  "cash adjusted",
  "cash-adjusted",
];

const FIRMS_ALIASES = ["number of firms", "number of companies", "# of firms", "firms"];

/** Known column positions on betaGlobal Industry Averages sheet (0-based data columns). */
const BETA_GLOBAL_POSITION_FALLBACK = {
  numberOfFirms: 1,
  leveredBeta: 2,
  unleveredBeta: 5,
  cashAdjustedBeta: 7,
} as const;

export function normalizeBetaBenchmarkName(name: string) {
  return name.trim().toLowerCase().replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim();
}

function normalizeColumnName(value: string) {
  return value.trim().toLowerCase();
}

function columnMatches(columnName: string, aliases: string[], excludePatterns: string[] = []) {
  const normalized = normalizeColumnName(columnName);
  if (excludePatterns.some((pattern) => normalized.includes(pattern))) {
    return false;
  }
  return aliases.some((alias) => normalized === alias || normalized.includes(alias));
}

function parseNumericCell(value: string | number | null | undefined): number | null {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value === "string") {
    return parseNumericString(value);
  }
  return null;
}

function isPlausibleBeta(value: number | null) {
  return value !== null && value >= 0.05 && value <= 5;
}

function isPlausibleFirmCount(value: number | null) {
  return value !== null && Number.isInteger(value) && value >= 1 && value <= 100_000;
}

function getOrderedValueEntries(row: DamodaranRawDatasetRow) {
  const columns = row.detectedColumns.length > 0 ? row.detectedColumns : Object.keys(row.values);
  return columns.map((columnName, index) => ({
    columnName,
    index,
    value: row.values[columnName] ?? null,
  }));
}

function valueAtPosition(row: DamodaranRawDatasetRow, position: number): number | null {
  const entries = getOrderedValueEntries(row);
  const entry = entries[position];
  if (!entry) {
    return null;
  }
  const parsed = parseNumericCell(entry.value);
  return parsed;
}

function valueByColumnAlias(
  row: DamodaranRawDatasetRow,
  aliases: string[],
  validator: (value: number | null) => boolean,
  excludePatterns: string[] = [],
): { value: number | null; columnName: string | null } {
  for (const entry of getOrderedValueEntries(row)) {
    if (!columnMatches(entry.columnName, aliases, excludePatterns)) {
      continue;
    }
    const parsed = parseNumericCell(entry.value);
    if (validator(parsed)) {
      return { value: parsed, columnName: entry.columnName };
    }
  }
  return { value: null, columnName: null };
}

function valueByGenericColumnIndex(
  row: DamodaranRawDatasetRow,
  position: number,
  validator: (value: number | null) => boolean,
): number | null {
  const entries = getOrderedValueEntries(row);
  const genericKey = `column_${position + 1}`;
  const byGeneric = entries.find((entry) => entry.columnName === genericKey);
  if (byGeneric) {
    const parsed = parseNumericCell(byGeneric.value);
    if (validator(parsed)) {
      return parsed;
    }
  }
  const byPosition = valueAtPosition(row, position);
  if (validator(byPosition)) {
    return byPosition;
  }
  return null;
}

export interface ExtractedBetaFields {
  unleveredBeta: number | null;
  leveredBeta: number | null;
  cashAdjustedBeta: number | null;
  numberOfFirms: number | null;
  detectedNotes: string[];
  uncertain: boolean;
}

export function extractBetaFieldsFromRawRow(row: DamodaranRawDatasetRow): ExtractedBetaFields {
  const detectedNotes: string[] = [];
  let uncertain = false;

  const unleveredNamed = valueByColumnAlias(row, UNLEVERED_BETA_ALIASES, isPlausibleBeta, [
    "corrected",
  ]);
  const leveredNamed = valueByColumnAlias(row, LEVERED_BETA_ALIASES, isPlausibleBeta, [
    "unlevered",
    "corrected",
    "standard deviation",
  ]);
  const cashNamed = valueByColumnAlias(row, CASH_ADJUSTED_ALIASES, isPlausibleBeta);
  const firmsNamed = valueByColumnAlias(row, FIRMS_ALIASES, isPlausibleFirmCount);

  let unleveredBeta = unleveredNamed.value;
  let leveredBeta = leveredNamed.value;
  let cashAdjustedBeta = cashNamed.value;
  let numberOfFirms = firmsNamed.value;

  if (unleveredNamed.columnName) {
    detectedNotes.push(`Unlevered beta from column "${unleveredNamed.columnName}".`);
  }
  if (leveredNamed.columnName) {
    detectedNotes.push(`Levered beta from column "${leveredNamed.columnName}".`);
  }
  if (cashNamed.columnName) {
    detectedNotes.push(`Cash-adjusted beta from column "${cashNamed.columnName}".`);
  }
  if (firmsNamed.columnName) {
    detectedNotes.push(`Firm count from column "${firmsNamed.columnName}".`);
  }

  if (row.datasetId === BETA_DATASET_ID) {
    if (unleveredBeta === null) {
      unleveredBeta = valueByGenericColumnIndex(
        row,
        BETA_GLOBAL_POSITION_FALLBACK.unleveredBeta,
        isPlausibleBeta,
      );
      if (unleveredBeta !== null) {
        detectedNotes.push("Unlevered beta from betaGlobal position fallback (column index 5).");
        uncertain = true;
      }
    }
    if (leveredBeta === null) {
      leveredBeta = valueByGenericColumnIndex(
        row,
        BETA_GLOBAL_POSITION_FALLBACK.leveredBeta,
        isPlausibleBeta,
      );
      if (leveredBeta !== null) {
        detectedNotes.push("Levered beta from betaGlobal position fallback (column index 2).");
        uncertain = true;
      }
    }
    if (cashAdjustedBeta === null) {
      cashAdjustedBeta = valueByGenericColumnIndex(
        row,
        BETA_GLOBAL_POSITION_FALLBACK.cashAdjustedBeta,
        isPlausibleBeta,
      );
      if (cashAdjustedBeta !== null) {
        detectedNotes.push("Cash-adjusted beta from betaGlobal position fallback (column index 7).");
        uncertain = true;
      }
    }
    if (numberOfFirms === null) {
      numberOfFirms = valueByGenericColumnIndex(
        row,
        BETA_GLOBAL_POSITION_FALLBACK.numberOfFirms,
        isPlausibleFirmCount,
      );
      if (numberOfFirms === null) {
        const firmsFallback = valueAtPosition(row, BETA_GLOBAL_POSITION_FALLBACK.numberOfFirms);
        if (isPlausibleFirmCount(firmsFallback)) {
          numberOfFirms = firmsFallback;
          detectedNotes.push("Firm count from betaGlobal position fallback (column index 1).");
          uncertain = true;
        }
      }
    }
  }

  const usedGenericFallback =
    row.datasetId === BETA_DATASET_ID &&
    (detectedNotes.some((note) => note.includes("position fallback")) ||
      detectedNotes.some((note) => note.includes('column "')));
  if (usedGenericFallback && unleveredBeta === null) {
    uncertain = true;
  }

  return {
    unleveredBeta,
    leveredBeta,
    cashAdjustedBeta,
    numberOfFirms,
    detectedNotes,
    uncertain,
  };
}

function findMatchingBetaRows(
  rawRows: DamodaranRawDatasetRow[],
  benchmarkName: string,
  betaTableKey: string,
): { rows: DamodaranRawDatasetRow[]; matchType: BetaMatchType } {
  const normalizedBenchmark = normalizeBetaBenchmarkName(benchmarkName);
  const normalizedKey = normalizeBetaBenchmarkName(betaTableKey);

  const exact = rawRows.filter(
    (row) =>
      row.industryName === benchmarkName ||
      row.industryName === betaTableKey ||
      row.industryName.trim() === benchmarkName.trim(),
  );
  if (exact.length > 0) {
    return { rows: exact, matchType: "Exact" };
  }

  const normalized = rawRows.filter((row) => {
    const rowNorm = row.normalizedIndustryName || normalizeBetaBenchmarkName(row.industryName);
    return rowNorm === normalizedBenchmark || rowNorm === normalizedKey;
  });
  if (normalized.length === 1) {
    return { rows: normalized, matchType: "Normalized" };
  }
  if (normalized.length > 1) {
    return { rows: normalized, matchType: "Review" };
  }

  return { rows: [], matchType: "Missing" };
}

function resolveReferenceStatus(params: {
  matchType: BetaMatchType;
  hasUnlevered: boolean;
  uncertainColumns: boolean;
  multipleMatches: boolean;
}): BetaReferenceStatus {
  if (params.matchType === "Missing") {
    return "Missing";
  }
  if (params.multipleMatches || params.matchType === "Review") {
    return "Review";
  }
  if (!params.hasUnlevered) {
    return "Review";
  }
  if (params.matchType === "Normalized") {
    return "Review";
  }
  return "Ready";
}

function resolveBetaTableKey(
  trimmedBenchmark: string,
  pullKeyRow: { betaTableKey: string } | undefined,
): { betaTableKey: string; mode: BetaTableKeyMode } {
  const configuredKey = pullKeyRow?.betaTableKey?.trim() ?? "";
  if (configuredKey) {
    return { betaTableKey: configuredKey, mode: "explicit" };
  }
  if (!trimmedBenchmark) {
    return { betaTableKey: "", mode: "benchmark-default" };
  }
  return { betaTableKey: trimmedBenchmark, mode: "benchmark-default" };
}

function buildBetaReferenceRow(params: {
  benchmarkName: string;
  betaTableKey: string;
  rawRow: DamodaranRawDatasetRow;
  datasetName: string;
  status: BetaReferenceStatus;
  notes: string[];
  technicalNotes?: string;
}): BetaReferenceRow {
  const extracted = extractBetaFieldsFromRawRow(params.rawRow);
  return {
    benchmarkName: params.benchmarkName,
    normalizedBenchmarkName: normalizeBetaBenchmarkName(params.benchmarkName),
    betaTableKey: params.betaTableKey,
    datasetId: params.rawRow.datasetId,
    datasetName: params.datasetName,
    rawDatasetRowId: params.rawRow.id,
    unleveredBeta: extracted.unleveredBeta,
    leveredBeta: extracted.leveredBeta,
    cashAdjustedBeta: extracted.cashAdjustedBeta,
    numberOfFirms: extracted.numberOfFirms,
    sourceName: params.rawRow.sourceName,
    sourceUrl: params.rawRow.sourceUrl,
    sourceUpdateDate: params.rawRow.sourceUpdateDate,
    importedLastUpdated: params.rawRow.importedLastUpdated,
    status: params.status,
    notes: params.notes.filter(Boolean).join(" "),
    technicalNotes: params.technicalNotes || undefined,
  };
}

export async function getBetaReferenceForBenchmark(
  benchmarkName: string,
): Promise<BetaLookupResult> {
  const trimmedBenchmark = benchmarkName.trim();
  const warnings: string[] = [];
  const errors: string[] = [];

  if (!trimmedBenchmark) {
    return {
      selectedBenchmark: benchmarkName,
      betaTableKey: null,
      betaTableKeyMode: null,
      datasetId: null,
      matched: false,
      matchType: "Missing",
      betaReference: null,
      warnings,
      errors: ["No Damodaran Industrial Benchmark selected."],
    };
  }

  const [pullKeysTable, register, rawRowsResult] = await Promise.all([
    getBenchmarkDataPullKeysTable(),
    getDamodaranDatasetRegister(),
    getDamodaranRawDatasetRows(BETA_DATASET_ID),
  ]);

  const pullKeyRow = pullKeysTable.data.find(
    (row) => row.damodaranIndustrialBenchmark === trimmedBenchmark,
  );

  const { betaTableKey, mode: betaTableKeyMode } = resolveBetaTableKey(trimmedBenchmark, pullKeyRow);
  if (!betaTableKey) {
    errors.push("betaTableKey could not be resolved for the selected benchmark.");
  }

  const pullResolution = resolveDamodaranPullKey(
    "betaTableKey",
    trimmedBenchmark,
    betaTableKey || null,
  );
  if (pullResolution.datasetId !== BETA_DATASET_ID) {
    warnings.push(
      `Pull key resolver returned dataset "${pullResolution.datasetId ?? "none"}" — expected ${BETA_DATASET_ID}.`,
    );
  }

  const dataset = register.data.find((row) => row.id === BETA_DATASET_ID) ?? null;
  if (!dataset) {
    errors.push(`${BETA_DATASET_ID} is not registered in the Damodaran dataset registry.`);
  } else if (dataset.importStatus !== "Imported") {
    warnings.push(
      `Dataset ${BETA_DATASET_ID} import status is "${dataset.importStatus}" — beta row lookup may fail.`,
    );
  }

  const rawRows = rawRowsResult.data;
  if (rawRows.length === 0) {
    errors.push(`No raw rows loaded for dataset ${BETA_DATASET_ID}.`);
    return {
      selectedBenchmark: trimmedBenchmark,
      betaTableKey: betaTableKey || null,
      betaTableKeyMode,
      datasetId: BETA_DATASET_ID,
      matched: false,
      matchType: "Missing",
      betaReference: null,
      warnings,
      errors,
    };
  }

  const lookupKey = betaTableKey || trimmedBenchmark;
  const { rows: matchedRows, matchType } = findMatchingBetaRows(rawRows, trimmedBenchmark, lookupKey);

  if (matchType === "Normalized") {
    warnings.push(
      "Benchmark matched via normalized industry name — verify exact Damodaran spelling.",
    );
  }
  if (matchType === "Review" && matchedRows.length > 1) {
    warnings.push(
      `Multiple beta rows matched (${matchedRows.length}) — manual review required.`,
    );
  }

  if (matchedRows.length === 0) {
    return {
      selectedBenchmark: trimmedBenchmark,
      betaTableKey: betaTableKey || null,
      betaTableKeyMode,
      datasetId: BETA_DATASET_ID,
      matched: false,
      matchType: "Missing",
      betaReference: null,
      warnings,
      errors: [
        ...errors,
        `No row found in ${BETA_DATASET_ID} for benchmark "${trimmedBenchmark}" / betaTableKey "${lookupKey}".`,
      ],
    };
  }

  const rawRow = matchedRows[0];
  const extracted = extractBetaFieldsFromRawRow(rawRow);
  const referenceStatus = resolveReferenceStatus({
    matchType: matchedRows.length > 1 ? "Review" : matchType,
    hasUnlevered: isPlausibleBeta(extracted.unleveredBeta),
    uncertainColumns: extracted.uncertain,
    multipleMatches: matchedRows.length > 1,
  });

  const notes: string[] = [];
  if (matchType === "Exact") {
    notes.push("Exact Damodaran industry match.");
  } else if (matchType === "Normalized") {
    notes.push("Normalized name match — confirm spelling against Damodaran.");
  }
  if (!isPlausibleBeta(extracted.unleveredBeta)) {
    notes.push("Unlevered beta not extracted — review required.");
  }

  const technicalNoteParts = [...extracted.detectedNotes];
  if (betaTableKeyMode === "benchmark-default") {
    technicalNoteParts.push(
      "betaTableKey uses v1.5 default rule (Damodaran industry label when no explicit pull-key row).",
    );
  }

  const technicalNotes = technicalNoteParts.filter(Boolean).join(" ");

  const betaReference = buildBetaReferenceRow({
    benchmarkName: trimmedBenchmark,
    betaTableKey: lookupKey,
    rawRow,
    datasetName: dataset?.datasetName ?? "Global Industry Beta",
    status: referenceStatus,
    notes,
    technicalNotes,
  });

  return {
    selectedBenchmark: trimmedBenchmark,
    betaTableKey: betaTableKey || null,
    betaTableKeyMode,
    datasetId: BETA_DATASET_ID,
    matched: true,
    matchType: matchedRows.length > 1 ? "Review" : matchType,
    betaReference,
    warnings,
    errors,
  };
}

export async function getBetaReadinessForBenchmark(
  benchmarkName: string,
): Promise<BetaReadinessStatus> {
  const lookup = await getBetaReferenceForBenchmark(benchmarkName);
  const notes: string[] = [];

  const hasIndustryBenchmark = benchmarkName.trim().length > 0;
  const hasBetaPullKey = Boolean(lookup.betaTableKey?.trim());
  const hasBetaDataset = lookup.datasetId === BETA_DATASET_ID;
  const hasMatchingBetaRow = lookup.matched;
  const hasUsableUnleveredBeta = isPlausibleBeta(lookup.betaReference?.unleveredBeta ?? null);

  let status: BetaReferenceStatus = "Missing";
  if (!hasIndustryBenchmark) {
    status = "Not Applicable";
    notes.push("Select a Damodaran Industrial Benchmark on the company sheet.");
  } else if (!hasBetaPullKey) {
    status = "Missing";
  } else if (!hasBetaDataset) {
    status = "Missing";
  } else if (!hasMatchingBetaRow) {
    status = "Missing";
  } else if (lookup.matchType === "Review" || !hasUsableUnleveredBeta) {
    status = "Review";
  } else {
    status = "Ready";
  }

  if (lookup.betaReference?.status === "Review") {
    status = "Review";
  }

  if (lookup.warnings.length > 0) {
    notes.push(...lookup.warnings);
  }
  if (lookup.errors.length > 0 && status !== "Ready") {
    notes.push(...lookup.errors);
  }

  return {
    selectedBenchmark: benchmarkName,
    hasIndustryBenchmark,
    hasBetaPullKey,
    hasBetaDataset,
    hasMatchingBetaRow,
    hasUsableUnleveredBeta,
    status,
    notes,
  };
}
