import "server-only";
import type { Dirent } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import * as XLSX from "xlsx";
import {
  coreDamodaranFileNames,
  damodaranDatasetRegistry,
  pricingSanityDamodaranFileNames,
} from "@/lib/data-hub/damodaranDatasetRegistry";
import type {
  DamodaranDatasetCoverageRow,
  DamodaranDatasetRegisterRow,
  DamodaranImportSummary,
  DamodaranIndustryMasterRow,
  DamodaranRawDatasetRow,
} from "@/lib/types";

const RAW_DAMODARAN_DIRECTORY = path.join(process.cwd(), "data", "damodaran", "raw");
const STALE_THRESHOLD_DAYS = 180;
const INDUSTRY_HEADER_ALIASES = [
  "industry name",
  "industry",
  "industry group",
  "industry name:",
  "industrial benchmark",
];
const MULTIPLES_FILE_NAMES = new Set(pricingSanityDamodaranFileNames);
const READINESS_BLOCKING_FILE_NAMES = new Set(coreDamodaranFileNames);

interface ParsedDatasetMeta {
  rowCount: number;
  industryNames: string[];
  detectedColumns: string[];
  sourceUpdateDate: string | null;
  rawRows: DamodaranRawDatasetRow[];
}

interface RefreshComputationResult {
  registerRows: DamodaranDatasetRegisterRow[];
  industryMasterRows: DamodaranIndustryMasterRow[];
  coverageRows: DamodaranDatasetCoverageRow[];
  rawDatasetRows: DamodaranRawDatasetRow[];
  importSummary: DamodaranImportSummary;
}

function nowIso() {
  return new Date().toISOString();
}

function getDaysBetween(startIso: string, endIso: string) {
  const start = new Date(startIso).getTime();
  const end = new Date(endIso).getTime();
  return Math.floor((end - start) / (1000 * 60 * 60 * 24));
}

function normalizeIndustryName(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim();
}

function slugify(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function normalizeSourceUpdateDate(value: unknown): string | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return XLSX.SSF.format("dd-mmm-yy", value);
  }

  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  if (!/[a-z0-9]/i.test(trimmed)) {
    return null;
  }

  const prefixedMatch = trimmed.match(/^(date|data)\s*updated\s*:?\s*(.+)$/i);
  if (prefixedMatch && prefixedMatch[2]) {
    const normalized = prefixedMatch[2].trim();
    return /[a-z0-9]/i.test(normalized) ? normalized : null;
  }

  return trimmed;
}

function findWorkbookSourceUpdateDate(rows: unknown[][]): string | null {
  const scanLimit = Math.min(rows.length, 60);

  for (let rowIndex = 0; rowIndex < scanLimit; rowIndex++) {
    const row = rows[rowIndex] ?? [];
    for (let columnIndex = 0; columnIndex < row.length; columnIndex++) {
      const rawCell = row[columnIndex];
      const cellText = String(rawCell ?? "").trim().toLowerCase();
      if (!cellText) {
        continue;
      }

      const inlineMatch = cellText.match(/^(date|data)\s*updated\s*:?\s*(.+)$/i);
      if (inlineMatch && inlineMatch[2]) {
        return normalizeSourceUpdateDate(inlineMatch[2]);
      }

      if (cellText === "date updated" || cellText === "date updated:" || cellText === "data updated" || cellText === "data updated:") {
        const nextCellValue = row[columnIndex + 1];
        const normalized = normalizeSourceUpdateDate(nextCellValue);
        if (normalized) {
          return normalized;
        }
      }
    }
  }

  return null;
}

function isLikelyIndustryHeader(value: string) {
  const normalized = value.trim().toLowerCase();
  return INDUSTRY_HEADER_ALIASES.some((alias) => normalized.includes(alias));
}

function selectIndustryHeaderColumn(headerRow: string[]) {
  for (let index = 0; index < headerRow.length; index++) {
    if (isLikelyIndustryHeader(headerRow[index] ?? "")) {
      return index;
    }
  }
  return -1;
}

function findHeaderRowWithIndustry(rawRows: unknown[][]) {
  const scanLimit = Math.min(rawRows.length, 60);

  for (let rowIndex = 0; rowIndex < scanLimit; rowIndex++) {
    const row = rawRows[rowIndex] ?? [];
    const normalizedRow = row.map((cell) => String(cell ?? "").trim());
    const nonEmptyCount = normalizedRow.filter(Boolean).length;
    const industryHeaderIndex = selectIndustryHeaderColumn(normalizedRow);

    if (industryHeaderIndex >= 0 && nonEmptyCount >= 2) {
      return { headerRowIndex: rowIndex, industryHeaderIndex, headerRow: normalizedRow };
    }
  }

  return null;
}

function extractIndustryValues(
  params: {
    rawRows: unknown[][];
    headerRowIndex: number;
    industryColumnIndex: number;
    detectedColumns: string[];
    dataset: DamodaranDatasetRegisterRow;
    importedLastUpdated: string;
  },
) {
  const { rawRows, headerRowIndex, industryColumnIndex, detectedColumns, dataset, importedLastUpdated } =
    params;
  const values: string[] = [];
  const rawDatasetRows: DamodaranRawDatasetRow[] = [];
  let parsedRowCount = 0;

  for (let rowIndex = headerRowIndex + 1; rowIndex < rawRows.length; rowIndex++) {
    const row = rawRows[rowIndex] ?? [];
    const industryRaw = String(row[industryColumnIndex] ?? "").trim();
    const hasAnyData = row.some((cell) => String(cell ?? "").trim().length > 0);

    if (!hasAnyData) {
      continue;
    }

    if (!industryRaw) {
      continue;
    }

    const normalizedIndustry = industryRaw.toLowerCase();
    if (
      normalizedIndustry === "total" ||
      normalizedIndustry.startsWith("source:") ||
      normalizedIndustry.startsWith("notes")
    ) {
      continue;
    }

    const valuesMap: Record<string, string | number | null> = {};
    const columnCount = Math.max(detectedColumns.length, row.length);
    for (let columnIndex = 0; columnIndex < columnCount; columnIndex++) {
      const columnName = detectedColumns[columnIndex] || `column_${columnIndex + 1}`;
      const cellValue = row[columnIndex];
      if (typeof cellValue === "number") {
        valuesMap[columnName] = Number.isFinite(cellValue) ? cellValue : null;
      } else if (typeof cellValue === "string") {
        const trimmed = cellValue.trim();
        valuesMap[columnName] = trimmed.length > 0 ? trimmed : null;
      } else if (cellValue === null || cellValue === undefined) {
        valuesMap[columnName] = null;
      } else {
        valuesMap[columnName] = String(cellValue);
      }
    }

    parsedRowCount++;
    values.push(industryRaw);
    const normalizedIndustryName = normalizeIndustryName(industryRaw);
    rawDatasetRows.push({
      id: `${dataset.id}_row_${parsedRowCount}`,
      datasetId: dataset.id,
      datasetName: dataset.datasetName,
      fileName: dataset.fileName,
      rowIndex: parsedRowCount,
      industryName: industryRaw,
      normalizedIndustryName,
      values: valuesMap,
      detectedColumns,
      sourceName: dataset.sourceName,
      sourceUrl: dataset.sourceUrl,
      downloadUrl: dataset.downloadUrl,
      sourceUpdateDate: dataset.sourceUpdateDate,
      importedLastUpdated,
      status: "Imported",
      notes: "Parsed from local Damodaran workbook.",
    });
  }

  const uniqueIndustries = Array.from(new Set(values));
  return { parsedRowCount, uniqueIndustries, rawDatasetRows };
}

function extractNonIndustryLabelValues(params: {
  rawRows: unknown[][];
  startRowIndex: number;
  labelColumnIndex: number;
  detectedColumns: string[];
  dataset: DamodaranDatasetRegisterRow;
  importedLastUpdated: string;
}): {
  parsedRowCount: number;
  uniqueIndustries: string[];
  rawDatasetRows: DamodaranRawDatasetRow[];
} {
  const {
    rawRows,
    startRowIndex,
    labelColumnIndex,
    detectedColumns,
    dataset,
    importedLastUpdated,
  } = params;

  const values: string[] = [];
  const rawDatasetRows: DamodaranRawDatasetRow[] = [];
  let parsedRowCount = 0;

  for (let rowIndex = startRowIndex; rowIndex < rawRows.length; rowIndex++) {
    const row = rawRows[rowIndex] ?? [];
    const labelRaw = String(row[labelColumnIndex] ?? "").trim();
    const hasAnyData = row.some((cell) => String(cell ?? "").trim().length > 0);

    if (!hasAnyData) continue;
    if (!labelRaw) continue;

    const valuesMap: Record<string, string | number | null> = {};
    const columnCount = Math.max(detectedColumns.length, row.length);

    for (let columnIndex = 0; columnIndex < columnCount; columnIndex++) {
      const columnName = detectedColumns[columnIndex] || `column_${columnIndex + 1}`;
      const cellValue = row[columnIndex];
      if (typeof cellValue === "number") {
        valuesMap[columnName] = Number.isFinite(cellValue) ? cellValue : null;
      } else if (typeof cellValue === "string") {
        const trimmed = cellValue.trim();
        valuesMap[columnName] = trimmed.length > 0 ? trimmed : null;
      } else if (cellValue === null || cellValue === undefined) {
        valuesMap[columnName] = null;
      } else {
        valuesMap[columnName] = String(cellValue);
      }
    }

    parsedRowCount++;
    values.push(labelRaw);
    rawDatasetRows.push({
      id: `${dataset.id}_row_${parsedRowCount}`,
      datasetId: dataset.id,
      datasetName: dataset.datasetName,
      fileName: dataset.fileName,
      rowIndex: parsedRowCount,
      industryName: labelRaw,
      normalizedIndustryName: normalizeIndustryName(labelRaw),
      values: valuesMap,
      detectedColumns,
      sourceName: dataset.sourceName,
      sourceUrl: dataset.sourceUrl,
      downloadUrl: dataset.downloadUrl,
      sourceUpdateDate: dataset.sourceUpdateDate,
      importedLastUpdated,
      status: "Imported",
      notes: "Parsed from local Damodaran workbook (non-industry reference table).",
    });
  }

  const uniqueIndustries = Array.from(new Set(values));
  return { parsedRowCount, uniqueIndustries, rawDatasetRows };
}

function parseCountryTaxRatesSheet(params: {
  sheetRows: unknown[][];
  dataset: DamodaranDatasetRegisterRow;
  importedLastUpdated: string;
}): {
  parsedRowCount: number;
  uniqueIndustries: string[];
  detectedColumns: string[];
  rawDatasetRows: DamodaranRawDatasetRow[];
} | null {
  const { sheetRows, dataset, importedLastUpdated } = params;

  const scanLimit = Math.min(sheetRows.length, 40);
  let headerRowIndex = -1;

  for (let rowIndex = 0; rowIndex < scanLimit; rowIndex++) {
    const row = sheetRows[rowIndex] ?? [];
    const firstCell = String(row[0] ?? "").trim().toLowerCase();
    const hasCountryHeader = firstCell.includes("country");
    const hasCorporateTaxRateHeader = row.some((cell) =>
      String(cell ?? "").trim().toLowerCase().includes("corporate tax rate"),
    );

    if (hasCountryHeader && hasCorporateTaxRateHeader) {
      headerRowIndex = rowIndex;
      break;
    }
  }

  if (headerRowIndex < 0) return null;

  const headerRow = (sheetRows[headerRowIndex] ?? []).map((cell) => String(cell ?? "").trim());
  const detectedColumns = headerRow.map((item, index) => item || `column_${index + 1}`);

  const extracted = extractNonIndustryLabelValues({
    rawRows: sheetRows,
    startRowIndex: headerRowIndex + 1,
    labelColumnIndex: 0,
    detectedColumns,
    dataset,
    importedLastUpdated,
  });

  return {
    parsedRowCount: extracted.parsedRowCount,
    uniqueIndustries: extracted.uniqueIndustries,
    detectedColumns,
    rawDatasetRows: extracted.rawDatasetRows,
  };
}

function parseRatingsSheet(params: {
  sheetRows: unknown[][];
  dataset: DamodaranDatasetRegisterRow;
  importedLastUpdated: string;
}): {
  parsedRowCount: number;
  uniqueIndustries: string[];
  detectedColumns: string[];
  rawDatasetRows: DamodaranRawDatasetRow[];
} | null {
  const { sheetRows, dataset, importedLastUpdated } = params;

  // Operating Leases sheet has a small table header ("Year", "Commitment").
  const scanLimit = Math.min(sheetRows.length, 60);
  let headerRowIndex = -1;

  for (let rowIndex = 0; rowIndex < scanLimit; rowIndex++) {
    const row = sheetRows[rowIndex] ?? [];
    const hasYear = row.some((cell) => String(cell ?? "").trim().toLowerCase().includes("year"));
    const hasCommitment = row.some((cell) =>
      String(cell ?? "").trim().toLowerCase().includes("commit"),
    );
    if (hasYear && hasCommitment) {
      headerRowIndex = rowIndex;
      break;
    }
  }

  const detectedColumns =
    headerRowIndex >= 0
      ? (sheetRows[headerRowIndex] ?? []).map((cell) => String(cell ?? "").trim())
          .map((item, index) => item || `column_${index + 1}`)
      : Array.from(
          { length: Math.max(...sheetRows.slice(0, 80).map((r) => (r ?? []).length), 1) },
          (_, index) => `column_${index + 1}`,
        );

  const startRowIndex = headerRowIndex >= 0 ? headerRowIndex + 1 : 0;

  const extracted = extractNonIndustryLabelValues({
    rawRows: sheetRows,
    startRowIndex,
    labelColumnIndex: 0,
    detectedColumns,
    dataset,
    importedLastUpdated,
  });

  return {
    parsedRowCount: extracted.parsedRowCount,
    uniqueIndustries: extracted.uniqueIndustries,
    detectedColumns,
    rawDatasetRows: extracted.rawDatasetRows,
  };
}

async function parseDamodaranWorkbook(
  filePath: string,
  dataset: DamodaranDatasetRegisterRow,
  importedLastUpdated: string,
): Promise<ParsedDatasetMeta> {
  const fileBuffer = await fs.readFile(filePath);
  const workbook = XLSX.read(fileBuffer, { type: "buffer" });

  const detectedColumns = new Set<string>();
  const industryNames = new Set<string>();
  const rawRows: DamodaranRawDatasetRow[] = [];
  let sourceUpdateDate: string | null = null;
  let rowCount = 0;

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) {
      continue;
    }

    const rows = XLSX.utils.sheet_to_json(sheet, {
      header: 1,
      raw: true,
      defval: null,
      blankrows: false,
    }) as unknown[][];

    if (rows.length === 0) {
      continue;
    }

    if (!sourceUpdateDate) {
      sourceUpdateDate = findWorkbookSourceUpdateDate(rows);
    }

    const headerMatch = findHeaderRowWithIndustry(rows);
    if (!headerMatch) {
      const nonIndustryParsed =
        dataset.id === "damodaran_country_tax_rates"
          ? parseCountryTaxRatesSheet({
              sheetRows: rows,
              dataset,
              importedLastUpdated,
            })
          : dataset.id === "damodaran_ratings"
            ? parseRatingsSheet({ sheetRows: rows, dataset, importedLastUpdated })
            : null;

      if (!nonIndustryParsed) continue;

      const { parsedRowCount, uniqueIndustries, rawDatasetRows, detectedColumns: sheetDetectedColumns } =
        nonIndustryParsed;
      sheetDetectedColumns.forEach((item) => detectedColumns.add(item));
      rowCount += parsedRowCount;
      uniqueIndustries.forEach((name) => industryNames.add(name));
      rawDatasetRows.forEach((row) => rawRows.push(row));
      continue;
    }

    const sheetDetectedColumns = headerMatch.headerRow.map((item, index) => {
      const trimmed = item.trim();
      return trimmed || `column_${index + 1}`;
    });
    sheetDetectedColumns.forEach((item) => detectedColumns.add(item));

    const { parsedRowCount, uniqueIndustries, rawDatasetRows } = extractIndustryValues({
      rawRows: rows,
      headerRowIndex: headerMatch.headerRowIndex,
      industryColumnIndex: headerMatch.industryHeaderIndex,
      detectedColumns: sheetDetectedColumns,
      dataset,
      importedLastUpdated,
    });
    rowCount += parsedRowCount;
    uniqueIndustries.forEach((name) => industryNames.add(name));
    rawDatasetRows.forEach((row) => rawRows.push(row));
  }

  return {
    rowCount,
    industryNames: Array.from(industryNames),
    detectedColumns: Array.from(detectedColumns),
    sourceUpdateDate,
    rawRows,
  };
}

function buildCoverageRowsFromRegister(
  rawRows: DamodaranRawDatasetRow[],
): DamodaranDatasetCoverageRow[] {
  const coverageByIndustry = new Map<
    string,
    {
      industryName: string;
      fileNames: Set<string>;
      datasetNames: Set<string>;
      variants: Set<string>;
    }
  >();

  for (const rawRow of rawRows) {
    const normalized = rawRow.normalizedIndustryName;
    if (!normalized) {
      continue;
    }

    if (!coverageByIndustry.has(normalized)) {
      coverageByIndustry.set(normalized, {
        industryName: rawRow.industryName,
        fileNames: new Set(),
        datasetNames: new Set(),
        variants: new Set([rawRow.industryName]),
      });
    }

    const entry = coverageByIndustry.get(normalized);
    if (!entry) {
      continue;
    }
    entry.fileNames.add(rawRow.fileName);
    entry.datasetNames.add(rawRow.datasetName);
    entry.variants.add(rawRow.industryName);
  }

  const coverageRows: DamodaranDatasetCoverageRow[] = [];

  for (const [, value] of coverageByIndustry) {
    const betaAvailable = value.fileNames.has("betaGlobal.xls");
    const waccAvailable = value.fileNames.has("waccGlobal.xls");
    const marginAvailable = value.fileNames.has("marginGlobal.xls");
    const capexAvailable = value.fileNames.has("capexGlobal.xls");
    const workingCapitalAvailable = value.fileNames.has("wcdataGlobal.xls");
    const fundgrEbAvailable = value.fileNames.has("fundgrEBGlobal.xls");
    const taxRateAvailable =
      value.fileNames.has("taxrateGlobal.xls") || value.fileNames.has("countrytaxrates.xls");
    const multiplesAvailable = Array.from(value.fileNames).some((fileName) =>
      MULTIPLES_FILE_NAMES.has(fileName),
    );

    const histgrAvailable = value.fileNames.has("histgrGlobal.xls");
    const debtAvailable = value.fileNames.has("debtdetailsGlobal.xls");
    const leaseAvailable = value.fileNames.has("leaseeffectGlobal.xls");

    const availableCoreCount = [
      betaAvailable,
      waccAvailable,
      marginAvailable,
      capexAvailable,
      workingCapitalAvailable,
      fundgrEbAvailable,
      taxRateAvailable,
      histgrAvailable,
      debtAvailable,
      leaseAvailable,
    ].filter(Boolean).length;

    const coverageStatus: DamodaranDatasetCoverageRow["coverageStatus"] =
      availableCoreCount >= 8
        ? "Complete"
        : availableCoreCount === 0
          ? "Missing Core Data"
          : value.variants.size > 1
            ? "Review"
            : "Partial";

    coverageRows.push({
      industryName: value.industryName,
      betaAvailable,
      waccAvailable,
      marginAvailable,
      capexAvailable,
      workingCapitalAvailable,
      fundgrEbAvailable,
      taxRateAvailable,
      multiplesAvailable,
      coverageStatus,
      notes:
        value.variants.size > 1
          ? `Review naming variants: ${Array.from(value.variants).join(" | ")}`
          : `Observed in ${value.datasetNames.size} dataset(s).`,
    });
  }

  return coverageRows.sort((a, b) => a.industryName.localeCompare(b.industryName));
}

function buildIndustryMasterRows(
  coverageRows: DamodaranDatasetCoverageRow[],
  registerRows: DamodaranDatasetRegisterRow[],
): DamodaranIndustryMasterRow[] {
  const coreImportedFileNames = registerRows
    .filter((row) => row.blocksCoreReadiness && row.importStatus === "Imported")
    .map((row) => row.fileName);

  return coverageRows.map((coverageRow) => {
    const normalizedIndustryName = normalizeIndustryName(coverageRow.industryName);

    const presentInDatasets: string[] = [];
    if (coverageRow.betaAvailable) {
      presentInDatasets.push("betaGlobal.xls");
    }
    if (coverageRow.waccAvailable) {
      presentInDatasets.push("waccGlobal.xls");
    }
    if (coverageRow.marginAvailable) {
      presentInDatasets.push("marginGlobal.xls");
    }
    if (coverageRow.capexAvailable) {
      presentInDatasets.push("capexGlobal.xls");
    }
    if (coverageRow.workingCapitalAvailable) {
      presentInDatasets.push("wcdataGlobal.xls");
    }
    if (coverageRow.fundgrEbAvailable) {
      presentInDatasets.push("fundgrEBGlobal.xls");
    }
    if (coverageRow.taxRateAvailable) {
      presentInDatasets.push("taxrateGlobal.xls");
    }
    if (coverageRow.multiplesAvailable) {
      presentInDatasets.push("multiples");
    }

    const missingCoreDatasets = coreImportedFileNames.filter((fileName) => {
      if (fileName === "countrytaxrates.xls") {
        return !coverageRow.taxRateAvailable;
      }
      if (MULTIPLES_FILE_NAMES.has(fileName)) {
        return false;
      }
      if (!READINESS_BLOCKING_FILE_NAMES.has(fileName)) {
        return false;
      }
      return !presentInDatasets.includes(fileName);
    });

    const coverageStatus: DamodaranIndustryMasterRow["coverageStatus"] =
      coverageRow.coverageStatus === "Review"
        ? "Review"
        : missingCoreDatasets.length === 0
          ? "Complete"
          : presentInDatasets.length === 0
            ? "Missing Core Data"
            : "Partial";

    return {
      id: `damodaran-industry-${slugify(normalizedIndustryName || coverageRow.industryName)}`,
      industryName: coverageRow.industryName,
      normalizedIndustryName,
      presentInDatasets,
      missingCoreDatasets,
      coverageStatus,
      sourceDatasetNames: presentInDatasets.slice(),
      status: coverageStatus,
      notes: coverageRow.notes,
    };
  });
}

export function computeStaleImportStatus(row: DamodaranDatasetRegisterRow, referenceNowIso = nowIso()) {
  if (!row.importedLastUpdated) {
    return row.importStatus;
  }

  const ageDays = getDaysBetween(row.importedLastUpdated, referenceNowIso);
  if (ageDays > STALE_THRESHOLD_DAYS && row.importStatus === "Imported") {
    return "Stale";
  }

  return row.importStatus;
}

export async function buildDamodaranDataVaultFromLocalFiles(): Promise<RefreshComputationResult> {
  const startedAt = nowIso();
  const localDirectoryEntries = await fs
    .readdir(RAW_DAMODARAN_DIRECTORY, { withFileTypes: true })
    .catch(() => [] as Dirent[]);
  const localFileNames = localDirectoryEntries
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name);
  const registeredFileNameSet = new Set(damodaranDatasetRegistry.map((row) => row.fileName));
  const extraUnregisteredFiles = localFileNames.filter((fileName) => !registeredFileNameSet.has(fileName));

  const registerRows: DamodaranDatasetRegisterRow[] = [];
  const rawDatasetRows: DamodaranRawDatasetRow[] = [];
  const datasetsImported: string[] = [];
  const datasetsMissing: string[] = [];
  const datasetsFailed: string[] = [];
  const warnings: string[] = [];
  const errors: string[] = [];

  if (extraUnregisteredFiles.length > 0) {
    warnings.push(`Extra / unregistered local files: ${extraUnregisteredFiles.join(", ")}`);
  }

  for (const baseDataset of damodaranDatasetRegistry) {
    const filePath = path.join(RAW_DAMODARAN_DIRECTORY, baseDataset.fileName);
    const nextRow: DamodaranDatasetRegisterRow = {
      ...baseDataset,
      detectedColumns: [],
      notes: baseDataset.notes,
    };

    if (baseDataset.isDeferredPlaceholder) {
      nextRow.importStatus = "Missing / Deferred";
      nextRow.importedLastUpdated = null;
      nextRow.rowCount = 0;
      nextRow.industryCount = 0;
      registerRows.push(nextRow);
      continue;
    }

    try {
      await fs.access(filePath);
    } catch {
      nextRow.importStatus = "Missing Local File";
      nextRow.importedLastUpdated = null;
      nextRow.rowCount = 0;
      nextRow.industryCount = 0;
      nextRow.detectedColumns = [];
      datasetsMissing.push(baseDataset.fileName);
      registerRows.push(nextRow);
      continue;
    }

    try {
      const parsed = await parseDamodaranWorkbook(filePath, baseDataset, startedAt);
      nextRow.rowCount = parsed.rowCount;
      nextRow.industryCount = parsed.industryNames.length;
      nextRow.detectedColumns = parsed.detectedColumns;
      nextRow.sourceUpdateDate = parsed.sourceUpdateDate ?? baseDataset.sourceUpdateDate;
      nextRow.importStatus = parsed.industryNames.length > 0 ? "Imported" : "Review";
      nextRow.importedLastUpdated = startedAt;
      nextRow.notes = `${baseDataset.notes} Columns: ${
        parsed.detectedColumns.join(", ") || "None detected"
      }.`;
      parsed.rawRows.forEach((row) =>
        rawDatasetRows.push({
          ...row,
          sourceUpdateDate: nextRow.sourceUpdateDate,
        }),
      );
      datasetsImported.push(baseDataset.fileName);

      if (parsed.industryNames.length === 0) {
        warnings.push(`${baseDataset.fileName}: No industry names detected.`);
      }
    } catch (error) {
      nextRow.importStatus = "Import Error";
      nextRow.importedLastUpdated = startedAt;
      nextRow.rowCount = 0;
      nextRow.industryCount = 0;
      nextRow.detectedColumns = [];
      const message = error instanceof Error ? error.message : "Unknown import error";
      nextRow.notes = `${baseDataset.notes} Import Error: ${message}`;
      datasetsFailed.push(baseDataset.fileName);
      errors.push(`${baseDataset.fileName}: ${message}`);
    }

    if (nextRow.importStatus !== "Import Error") {
      nextRow.importStatus = computeStaleImportStatus(nextRow, startedAt);
    }
    registerRows.push(nextRow);
  }

  const coverageRows = buildCoverageRowsFromRegister(rawDatasetRows);
  const industryMasterRows = buildIndustryMasterRows(coverageRows, registerRows);
  const finishedAt = nowIso();

  const importSummary: DamodaranImportSummary = {
    success: datasetsFailed.length === 0 && datasetsImported.length > 0,
    startedAt,
    finishedAt,
    datasetsAttempted: damodaranDatasetRegistry.length,
    datasetsImported,
    datasetsMissing,
    datasetsFailed,
    rawRowsImported: rawDatasetRows.length,
    industryCount: industryMasterRows.length,
    coverageMatrixRows: coverageRows.length,
    extraUnregisteredFiles,
    warnings,
    errors,
  };

  return {
    registerRows,
    industryMasterRows,
    coverageRows,
    rawDatasetRows,
    importSummary,
  };
}
