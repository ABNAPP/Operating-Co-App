import "server-only";
import * as XLSX from "xlsx";
import { calculateRegionalErp } from "@/lib/data-hub/regionalErpCalculator";
import {
  ensureDefaultRegionalGroupDefinitions,
  getCountryRegionalGroupMap,
  getRegionalGroupDefinitions,
  regenerateDefaultCountryRegionalGroupMap,
  seedCountryErpRows,
  seedRegionalErpRows,
  updateCountryRiskErpImportStatus,
  upsertCountryRiskErpSourceNote,
} from "@/lib/firestore/repositories/countryRiskErpRepository";
import type { CountryErpRow, CountryRiskErpImportStatus } from "@/lib/types";

const SOURCE_NAME = "Damodaran Country Default Spreads and Risk Premiums";
const SOURCE_URL = "https://pages.stern.nyu.edu/~adamodar/New_Home_Page/datafile/ctryprem.html";
const DOWNLOAD_URL = "https://www.stern.nyu.edu/~adamodar/pc/datasets/ctryprem.xlsx";
const DOWNLOAD_URLS = [
  "https://pages.stern.nyu.edu/~adamodar/pc/datasets/ctryprem.xlsx",
  DOWNLOAD_URL,
];
const STALE_DAYS = 180;

const coreCountryCodeMap: Record<string, string> = {
  "united states": "US",
  sweden: "SE",
  germany: "DE",
  "united kingdom": "GB",
  canada: "CA",
  australia: "AU",
  japan: "JP",
  switzerland: "CH",
  denmark: "DK",
  norway: "NO",
  "euro area": "EU",
};

const coreCountries = new Set(Object.keys(coreCountryCodeMap));

export interface CountryRiskErpImportSummary {
  success: boolean;
  rowsImported: number;
  rowsSkipped: number;
  sourceUpdateDate: string;
  importedLastUpdated: string;
  warnings: string[];
  errors: string[];
}

function normalizeName(value: string) {
  return value.trim().toLowerCase();
}

function toId(name: string) {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function parseRateDecimal(value: unknown): number | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      return null;
    }
    return value > 1 ? value / 100 : value;
  }

  if (typeof value === "string") {
    const cleaned = value.replace(/,/g, "").trim();
    if (!cleaned || cleaned === "NA" || cleaned === "N/A" || cleaned === "-") {
      return null;
    }

    const asNumber = Number(cleaned.replace("%", ""));
    if (!Number.isFinite(asNumber)) {
      return null;
    }
    if (cleaned.includes("%")) {
      return asNumber / 100;
    }
    return asNumber > 1 ? asNumber / 100 : asNumber;
  }

  return null;
}

function parseSourceDateFromSheet(rows: unknown[][]): string | null {
  const monthPattern =
    /(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\s+\d{4}/i;
  const shortDatePattern = /\b\d{1,2}-[A-Za-z]{3}-\d{2,4}\b/;

  for (const row of rows.slice(0, 25)) {
    for (const cell of row) {
      if (typeof cell !== "string") {
        continue;
      }
      const match = cell.match(monthPattern);
      if (match) {
        const text = match[0];
        return text
          .split(" ")
          .map((part, idx) =>
            idx === 0 ? part.charAt(0).toUpperCase() + part.slice(1).toLowerCase() : part,
          )
          .join(" ");
      }

      const shortDateMatch = cell.match(shortDatePattern);
      if (shortDateMatch) {
        const parsed = new Date(shortDateMatch[0]);
        if (!Number.isNaN(parsed.getTime())) {
          return parsed.toLocaleDateString("en-US", {
            month: "long",
            year: "numeric",
          });
        }
      }
    }
  }

  return null;
}

function findHeaderRowIndex(rows: unknown[][]): number {
  return rows.findIndex((row) => {
    const values = row
      .filter((cell): cell is string => typeof cell === "string")
      .map((cell) => cell.toLowerCase().trim());

    const nonEmptyCount = values.filter((value) => value.length > 0).length;
    const hasCountryColumn = values.some(
      (value) => value === "country" || value.startsWith("country "),
    );
    const hasTotalErpColumn = values.some((value) =>
      value.includes("total equity risk premium"),
    );
    const hasCrpColumn = values.some((value) => value.includes("country risk premium"));
    const hasSpreadColumn = values.some((value) => value.includes("default spread"));

    if (hasCountryColumn && hasTotalErpColumn && nonEmptyCount >= 4) {
      return true;
    }

    return hasCountryColumn && hasCrpColumn && hasSpreadColumn && nonEmptyCount >= 4;
  });
}

function getHeaderIndex(header: string[], candidates: string[]): number {
  return header.findIndex((value) =>
    candidates.some((candidate) => value.includes(candidate)),
  );
}

function extractCountryRowsFromWorkbook(data: ArrayBuffer): {
  rows: CountryErpRow[];
  rowsSkipped: number;
  sourceUpdateDate: string;
  warnings: string[];
} {
  const warnings: string[] = [];
  const workbook = XLSX.read(data, { type: "array" });
  const sheetName =
    workbook.SheetNames.find((name) => name.toLowerCase().includes("erp")) ??
    workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const matrix = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false }) as unknown[][];

  const sourceDate = parseSourceDateFromSheet(matrix) ?? "January 2026";
  if (!parseSourceDateFromSheet(matrix)) {
    warnings.push("Could not parse exact source update date from workbook; using fallback.");
  }

  const headerIndex = findHeaderRowIndex(matrix);
  if (headerIndex < 0) {
    throw new Error("Could not locate header row in Damodaran workbook.");
  }

  const rawHeader = matrix[headerIndex] ?? [];
  const header = Array.from({ length: rawHeader.length }, (_, index) =>
    String(rawHeader[index] ?? "").trim().toLowerCase(),
  );

  const idxCountry = getHeaderIndex(header, ["country"]);
  const idxRating = getHeaderIndex(header, ["moody", "rating"]);
  const idxAdjSpread = getHeaderIndex(header, ["adjusted default spread", "default spread"]);
  const idxCrp = getHeaderIndex(header, ["country risk premium"]);
  const idxTotalErp = getHeaderIndex(header, ["total equity risk premium", "total erp"]);
  const idxTaxRate = getHeaderIndex(header, ["tax rate", "corporate tax"]);
  const idxCds = getHeaderIndex(header, ["cds", "sovereign cds"]);
  const idxErpFromCds = getHeaderIndex(header, ["erp based on sovereign cds", "based on cds"]);

  if (idxCountry < 0 || idxTotalErp < 0) {
    throw new Error("Workbook headers missing required Country and Total ERP columns.");
  }

  const importedAt = new Date().toISOString();
  const parsedRows: CountryErpRow[] = [];
  let skipped = 0;

  for (const row of matrix.slice(headerIndex + 1)) {
    const countryCell = row[idxCountry];
    if (typeof countryCell !== "string") {
      skipped += 1;
      continue;
    }

    const countryName = countryCell.trim();
    const lowered = countryName.toLowerCase();

    if (
      !countryName ||
      lowered.includes("http") ||
      lowered.includes("link") ||
      lowered.includes("paper") ||
      lowered.includes("lecture")
    ) {
      skipped += 1;
      continue;
    }

    if (countryName.length < 2) {
      skipped += 1;
      continue;
    }

    const knownCode = coreCountryCodeMap[normalizeName(countryName)] ?? null;
    const needsCoreCodeReview = coreCountries.has(normalizeName(countryName)) && !knownCode;

    parsedRows.push({
      id: `country_${toId(countryName)}`,
      countryName,
      countryCode: knownCode,
      moodysRating: idxRating >= 0 ? String(row[idxRating] ?? "").trim() : "",
      adjustedDefaultSpread: idxAdjSpread >= 0 ? parseRateDecimal(row[idxAdjSpread]) : null,
      countryRiskPremium: idxCrp >= 0 ? parseRateDecimal(row[idxCrp]) : null,
      totalEquityRiskPremium: parseRateDecimal(row[idxTotalErp]),
      corporateTaxRate: idxTaxRate >= 0 ? parseRateDecimal(row[idxTaxRate]) : null,
      sovereignCds: idxCds >= 0 ? parseRateDecimal(row[idxCds]) : null,
      erpBasedOnSovereignCds: idxErpFromCds >= 0 ? parseRateDecimal(row[idxErpFromCds]) : null,
      sourceName: SOURCE_NAME,
      sourceUrl: SOURCE_URL,
      sourceUpdateDate: sourceDate,
      importedLastUpdated: importedAt,
      status: needsCoreCodeReview
        ? "Review / Missing Country Code"
        : "Imported / OK",
      notes: needsCoreCodeReview
        ? "Core country is missing code mapping. Review manually."
        : "Imported from Damodaran workbook.",
    });
  }

  return {
    rows: parsedRows,
    rowsSkipped: skipped,
    sourceUpdateDate: sourceDate,
    warnings,
  };
}

function isStale(sourceUpdateDate: string, importedLastUpdated: string) {
  const now = new Date();
  const importedDate = new Date(importedLastUpdated);
  const importedAgeDays =
    (now.getTime() - importedDate.getTime()) / (1000 * 60 * 60 * 24);

  if (!Number.isFinite(importedAgeDays)) {
    return true;
  }

  if (importedAgeDays > STALE_DAYS) {
    return true;
  }

  const parsedSourceDate = Date.parse(sourceUpdateDate);
  if (Number.isNaN(parsedSourceDate)) {
    return true;
  }

  const sourceAgeDays = (now.getTime() - parsedSourceDate) / (1000 * 60 * 60 * 24);
  return sourceAgeDays > STALE_DAYS;
}

export async function refreshCountryRiskErpFromDamodaran(): Promise<CountryRiskErpImportSummary> {
  const warnings: string[] = [];
  const errors: string[] = [];
  const importedLastUpdated = new Date().toISOString();

  try {
    let buffer: ArrayBuffer | null = null;
    let downloadError: string | null = null;

    for (const url of DOWNLOAD_URLS) {
      const response = await fetch(url, { method: "GET", cache: "no-store" });
      if (!response.ok) {
        downloadError = `Damodaran download failed with HTTP ${response.status} from ${url}.`;
        continue;
      }

      buffer = await response.arrayBuffer();
      if (buffer.byteLength > 0) {
        break;
      }
    }

    if (!buffer) {
      throw new Error(downloadError ?? "Damodaran download returned empty content.");
    }
    const extracted = extractCountryRowsFromWorkbook(buffer);
    warnings.push(...extracted.warnings);

    const countrySeed = await seedCountryErpRows(extracted.rows);
    if (!countrySeed.ok) {
      throw new Error(countrySeed.error ?? "Country ERP write failed.");
    }

    const ensureDefinitions = await ensureDefaultRegionalGroupDefinitions();
    if (!ensureDefinitions.ok) {
      warnings.push(ensureDefinitions.error ?? "Could not ensure default regional definitions.");
    }

    const mapRegeneration = await regenerateDefaultCountryRegionalGroupMap({
      countryRows: extracted.rows,
      preserveExisting: true,
    });
    if (!mapRegeneration.ok) {
      warnings.push(mapRegeneration.error ?? "Could not regenerate default country-region map.");
    }

    const mapRows = await getCountryRegionalGroupMap();
    const definitions = await getRegionalGroupDefinitions();
    const regionalRows = calculateRegionalErp(extracted.rows, mapRows.data, definitions.data);
    const regionalSeed = await seedRegionalErpRows(regionalRows);
    if (!regionalSeed.ok) {
      warnings.push(regionalSeed.error ?? "Regional ERP seed failed.");
    }

    const stale = isStale(extracted.sourceUpdateDate, importedLastUpdated);
    const statusDoc: CountryRiskErpImportStatus = {
      id: "country-risk-erp-import-status",
      sourceName: SOURCE_NAME,
      sourceUrl: SOURCE_URL,
      downloadUrl: DOWNLOAD_URL,
      sourceUpdateDate: extracted.sourceUpdateDate,
      importedLastUpdated,
      status: stale ? "Imported / Stale Review" : "Imported / OK",
      stale,
      rowsImported: extracted.rows.length,
      rowsSkipped: extracted.rowsSkipped,
      warnings,
      errors,
    };

    await updateCountryRiskErpImportStatus(statusDoc);

    await upsertCountryRiskErpSourceNote({
      id: "damodaran_country_erp_source",
      sourceName: SOURCE_NAME,
      sourceUrl: SOURCE_URL,
      downloadUrl: DOWNLOAD_URL,
      purpose: "Country ERP reference input for future weighted ERP",
      updateFrequency: "Manual periodic refresh (not daily cron)",
      importUpdateMethod: "Protected API route import from XLSX",
      sourceUpdateDate: extracted.sourceUpdateDate,
      importedLastUpdated,
      status: stale ? "Review / Stale" : "OK",
      notes:
        "Damodaran estimates mature market ERP and country spreads; regional ERP rows are calculated fallback/reference only.",
    });

    return {
      success: true,
      rowsImported: extracted.rows.length,
      rowsSkipped: extracted.rowsSkipped,
      sourceUpdateDate: extracted.sourceUpdateDate,
      importedLastUpdated,
      warnings,
      errors,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown Country ERP import error.";
    errors.push(message);

    await updateCountryRiskErpImportStatus({
      id: "country-risk-erp-import-status",
      sourceName: SOURCE_NAME,
      sourceUrl: SOURCE_URL,
      downloadUrl: DOWNLOAD_URL,
      sourceUpdateDate: "Unknown / Review",
      importedLastUpdated,
      status: "Import Error",
      stale: true,
      rowsImported: 0,
      rowsSkipped: 0,
      warnings,
      errors,
    });

    return {
      success: false,
      rowsImported: 0,
      rowsSkipped: 0,
      sourceUpdateDate: "Unknown / Review",
      importedLastUpdated,
      warnings,
      errors,
    };
  }
}
