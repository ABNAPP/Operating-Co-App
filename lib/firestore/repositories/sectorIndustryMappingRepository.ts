import "server-only";
import fs from "node:fs/promises";
import path from "node:path";
import { collection, deleteDoc, doc, getDoc, getDocs, setDoc } from "firebase/firestore";
import { generateBenchmarkToIsmSectorCandidates } from "@/lib/data-hub/benchmarkToIsmCandidateService";
import { parseExactIndustryBenchmarkConfigV15Tables } from "@/lib/data-hub/industryBenchmarkConfigV15SeedService";
import { generateSectorMappingCandidates } from "@/lib/data-hub/sectorMappingCandidateService";
import {
  buildSectorReadinessFromMappings,
  buildOfficialIsmSectorRows,
  buildSectorMappingFoundationRows,
  buildSectorMappingRules,
  buildSectorMappingValidationValues,
  seedSectorIndustryMappingFoundation as buildSectorFoundationSeed,
  SECTOR_MAPPING_SOURCE_NAME,
  SECTOR_MAPPING_SOURCE_UPDATE_DATE,
  SECTOR_MAPPING_SOURCE_URL,
} from "@/lib/data-hub/sectorIndustryMappingFoundationService";
import { sectorMappingStatusDefinitions } from "@/lib/data-hub/sectorBenchmarkValidationService";
import { getAdminDb, isFirebaseAdminConfigured } from "@/lib/firebase/admin";
import { getFirestoreDbSafe } from "@/lib/firebase/client";
import { COLLECTIONS } from "@/lib/firestore/collections";
import type {
  BenchmarkDataPullKeyRow,
  DamodaranIndustryUniverseRow,
  ISMSectorRow,
  DamodaranBenchmarkToIsmSectorRow,
  IndustryBenchmarkConfigTableRow,
  IndustryBenchmarkHeaderRow,
  IndustryBenchmarkConfigRow,
  IndustryBenchmarkRuleRow,
  IndustryBenchmarkStatusValueRow,
  IndustryISMDisplayMapTableRow,
  IndustryISMDisplayMapRow,
  SectorIndustryMappingRow,
  SectorMappingCandidateGuideRow,
  SectorMappingImportStatus,
  SectorMappingReadinessRow,
  SectorMappingRule,
  SectorMappingStatusValue,
  SectorMappingValidationValue,
} from "@/lib/types";
import type { RepositoryResult } from "@/lib/firestore/repositories/companiesRepository";

const IMPORT_STATUS_DOC_ID = "sector-mapping-foundation-status";
const CACHE_DIR = path.join(process.cwd(), "data", "sector", "cache");
const CACHE_FILE_PATH = path.join(CACHE_DIR, "sector-mapping-cache.json");
const FIRESTORE_READ_TIMEOUT_MS = 2000;

interface SectorMappingCachePayload {
  ismSectorRows: ISMSectorRow[];
  mappingRows: SectorIndustryMappingRow[];
  benchmarkToIsmRows: DamodaranBenchmarkToIsmSectorRow[];
  candidateGuideRows: SectorMappingCandidateGuideRow[];
  rules: SectorMappingRule[];
  validationValues: SectorMappingValidationValue[];
  statusValues: SectorMappingStatusValue[];
  readinessRows: SectorMappingReadinessRow[];
  importStatus: SectorMappingImportStatus;
}

function normalizeBenchmarkName(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

let cacheMemory: { mtimeMs: number; payload: SectorMappingCachePayload } | null = null;

async function withTimeout<T>(promise: Promise<T>, timeoutMs = FIRESTORE_READ_TIMEOUT_MS): Promise<T> {
  let timeoutHandle: NodeJS.Timeout | null = null;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timeoutHandle = setTimeout(() => reject(new Error("Timed out")), timeoutMs);
      }),
    ]);
  } finally {
    if (timeoutHandle) {
      clearTimeout(timeoutHandle);
    }
  }
}

async function readCache(): Promise<SectorMappingCachePayload | null> {
  try {
    const stat = await fs.stat(CACHE_FILE_PATH);
    if (cacheMemory && cacheMemory.mtimeMs === stat.mtimeMs) {
      return cacheMemory.payload;
    }
    const content = await fs.readFile(CACHE_FILE_PATH, "utf8");
    const parsed = JSON.parse(content) as SectorMappingCachePayload;
    cacheMemory = { mtimeMs: stat.mtimeMs, payload: parsed };
    return parsed;
  } catch {
    return null;
  }
}

async function writeCache(payload: SectorMappingCachePayload) {
  await fs.mkdir(CACHE_DIR, { recursive: true });
  await fs.writeFile(CACHE_FILE_PATH, JSON.stringify(payload), "utf8");
  cacheMemory = null;
}

async function readCollectionWithFallback<T>(
  collectionName: string,
  cacheSelector: (cache: SectorMappingCachePayload) => T[],
  defaultRows: T[] = [],
): Promise<RepositoryResult<T[]>> {
  const cache = await readCache();
  const cachedRowsRaw = cache ? cacheSelector(cache) : defaultRows;
  const cachedRows = Array.isArray(cachedRowsRaw) ? cachedRowsRaw : defaultRows;
  if (cachedRows.length > 0) {
    return { data: cachedRows, source: "firestore", error: "Using local sector cache fallback." };
  }

  const adminDb = getAdminDb();
  if (isFirebaseAdminConfigured() && adminDb) {
    try {
      const snapshot = await withTimeout(adminDb.collection(collectionName).get());
      const rows = snapshot.docs.map((item) => item.data() as T);
      if (rows.length > 0) {
        return { data: rows, source: "firestore" };
      }
    } catch {
      // continue to client path
    }
  }

  const db = getFirestoreDbSafe();
  if (!db) {
    return { data: defaultRows, source: "mock", error: "Firestore not initialized." };
  }

  try {
    const snapshot = await withTimeout(getDocs(collection(db, collectionName)));
    const rows = snapshot.docs.map((item) => item.data() as T);
    if (rows.length > 0) {
      return { data: rows, source: "firestore" };
    }
    return { data: defaultRows, source: "mock" };
  } catch (error) {
    return {
      data: defaultRows,
      source: "mock",
      error: error instanceof Error ? error.message : "Unknown sector mapping read error.",
    };
  }
}

async function upsertRowsAdminFirst<T extends { id: string }>(
  collectionName: string,
  rows: T[],
): Promise<{ ok: boolean; upserted: number; error?: string }> {
  const adminDb = getAdminDb();
  if (isFirebaseAdminConfigured() && adminDb) {
    try {
      for (const row of rows) {
        await adminDb.collection(collectionName).doc(row.id).set(row, { merge: true });
      }
      return { ok: true, upserted: rows.length };
    } catch {
      // continue to client fallback
    }
  }

  const db = getFirestoreDbSafe();
  if (!db) {
    return { ok: false, upserted: 0, error: "Firestore not initialized." };
  }

  try {
    for (const row of rows) {
      await setDoc(doc(db, collectionName, row.id), row, { merge: true });
    }
    return { ok: true, upserted: rows.length };
  } catch (error) {
    return {
      ok: false,
      upserted: 0,
      error: error instanceof Error ? error.message : "Unknown sector mapping write error.",
    };
  }
}

export async function getISMSectorRows(): Promise<RepositoryResult<ISMSectorRow[]>> {
  return readCollectionWithFallback<ISMSectorRow>(
    COLLECTIONS.ismSectorRows,
    (cache) => cache.ismSectorRows,
    buildOfficialIsmSectorRows(),
  );
}

export async function getActiveISMSectorRows(): Promise<RepositoryResult<ISMSectorRow[]>> {
  const rows = await getISMSectorRows();
  return {
    ...rows,
    data: rows.data.filter((row) => row.active),
  };
}

export async function upsertISMSectorRows(rows: ISMSectorRow[]) {
  return upsertRowsAdminFirst(COLLECTIONS.ismSectorRows, rows);
}

export async function getSectorIndustryMappings(): Promise<RepositoryResult<SectorIndustryMappingRow[]>> {
  const defaults = buildSectorMappingFoundationRows(buildOfficialIsmSectorRows());
  return readCollectionWithFallback<SectorIndustryMappingRow>(
    COLLECTIONS.sectorIndustryMappings,
    (cache) => cache.mappingRows,
    defaults,
  );
}

export async function getSectorIndustryMappingByISMSector(
  ismSector: string,
): Promise<RepositoryResult<SectorIndustryMappingRow | null>> {
  const rows = await getSectorIndustryMappings();
  return {
    source: rows.source,
    error: rows.error,
    data: rows.data.find((row) => row.ismSector === ismSector) ?? null,
  };
}

export async function getBenchmarkToIsmSectorMappings(): Promise<
  RepositoryResult<DamodaranBenchmarkToIsmSectorRow[]>
> {
  return readCollectionWithFallback<DamodaranBenchmarkToIsmSectorRow>(
    COLLECTIONS.damodaranBenchmarkToIsmSectorMappings,
    (cache) => cache.benchmarkToIsmRows,
    [],
  );
}

export async function getBenchmarkToIsmSectorMappingByBenchmark(
  benchmark: string,
): Promise<RepositoryResult<DamodaranBenchmarkToIsmSectorRow | null>> {
  const rows = await getBenchmarkToIsmSectorMappings();
  return {
    source: rows.source,
    error: rows.error,
    data: rows.data.find((row) => row.damodaranIndustrialBenchmark === benchmark) ?? null,
  };
}

function toLegacyIndustryBenchmarkConfigRow(
  config: IndustryBenchmarkConfigTableRow,
  pullKey: BenchmarkDataPullKeyRow | null,
  ismDisplay: IndustryISMDisplayMapTableRow | null,
): IndustryBenchmarkConfigRow {
  const status = config.templateStatus.includes("Excluded")
    ? "Excluded / Special Review"
    : config.templateStatus.includes("Review")
      ? "Review Required"
      : config.templateStatus.includes("Reference")
        ? "Mapping Required"
        : "OK";
  const now = new Date().toISOString();

  return {
    id: config.id,
    damodaranIndustryBenchmark: config.damodaranIndustrialBenchmark,
    normalizedBenchmarkName: normalizeBenchmarkName(config.damodaranIndustrialBenchmark),
    operatingCoStatus: status === "Excluded / Special Review" ? "Excluded / Special Review" : "Supported",
    eligibilityStatus:
      status === "Excluded / Special Review"
        ? "Excluded / Special Review"
        : status === "Review Required" || status === "Mapping Required"
          ? "Review Required"
          : "Supported",
    ismDisplaySector: ismDisplay?.ismSectorDisplay ?? null,
    ismDisplaySectorAlternatives: [],
    defaultModelMode: config.defaultStageRecommendation,
    defaultStageType: config.defaultStageRecommendation,
    cyclicalityFlag: config.cyclicalityFlag,
    historyRecommendation: config.historyRecommendation,
    normalizationNeed: config.cyclicalityFlag,
    assetIntensity: (["Low", "Medium", "High"].includes(config.assetIntensity)
      ? config.assetIntensity
      : "Review Required") as IndustryBenchmarkConfigRow["assetIntensity"],
    regulatoryFlag:
      config.regulatoryFlag.toLowerCase().includes("yes")
        ? "Regulated"
        : config.regulatoryFlag.toLowerCase().includes("no")
          ? "Not Regulated"
          : "Review Required",
    benchmarkUse:
      "Exact v1.5 benchmark config supports stage/history/cyclicality context only; no model-driving effect.",
    defaultStableMarginRule: "Not specified in tblIndustryBenchmarkConfig",
    defaultStableRocRule: "Not specified in tblIndustryBenchmarkConfig",
    defaultSalesToCapitalRule: "Not specified in tblIndustryBenchmarkConfig",
    betaTableKey: pullKey?.betaTableKey ?? null,
    marginTableKey: pullKey?.marginTableKey ?? null,
    rocRoicTableKey: pullKey?.growthRocTableKey ?? null,
    reinvestmentSalesToCapitalTableKey: pullKey?.reinvestmentTableKey ?? null,
    workingCapitalTableKey: pullKey?.workingCapitalTableKey ?? null,
    taxTableKey: pullKey?.taxTableKey ?? null,
    waccCostOfCapitalSanityKey: pullKey?.growthRocTableKey ?? null,
    multiplesSanityKey: pullKey?.growthRocTableKey ?? null,
    pricingSanityOnly: true,
    mappingReviewFlag: status === "OK" ? "Ready" : status,
    reviewFlag: status === "OK" ? "Ready" : status,
    status,
    notes: "Derived from exact v1.5 table rows. Generated/helper logic is not source of truth.",
    sourceName: "Operating Co Template - Master Specification",
    sourceUrl: "data/spec/Operating_Co_Template_Master_Specification_v1_5.txt",
    sourceUpdateDate: "v1.5",
    importedLastUpdated: now,
    createdAt: now,
    updatedAt: now,
  };
}

function toLegacyIndustryIsmDisplayMapRow(row: IndustryISMDisplayMapTableRow): IndustryISMDisplayMapRow {
  return {
    id: row.id,
    damodaranIndustryBenchmark: row.damodaranIndustrialBenchmark,
    ismSector: row.ismSectorDisplay,
    ismDisplayGroup: row.ismSectorDisplay,
    displayOnly: true,
    status: row.use.includes("Display only") ? "Active" : "Review Required",
    notes: row.use,
    sourceName: "Operating Co Template - Master Specification",
    sourceUpdateDate: "v1.5",
    importedLastUpdated: new Date().toISOString(),
  };
}

async function getExactV15Tables() {
  return parseExactIndustryBenchmarkConfigV15Tables();
}

export async function getIndustryBenchmarkHeader(): Promise<RepositoryResult<IndustryBenchmarkHeaderRow[]>> {
  try {
    const tables = await getExactV15Tables();
    return { source: "mock", data: tables.header };
  } catch (error) {
    return {
      source: "mock",
      data: [],
      error: error instanceof Error ? error.message : "Unknown benchmark header parse error.",
    };
  }
}

export async function getDamodaranIndustryUniverse(): Promise<
  RepositoryResult<DamodaranIndustryUniverseRow[]>
> {
  try {
    const tables = await getExactV15Tables();
    return { source: "mock", data: tables.universe };
  } catch (error) {
    return {
      source: "mock",
      data: [],
      error: error instanceof Error ? error.message : "Unknown industry universe parse error.",
    };
  }
}

export async function getIndustryBenchmarkConfigTable(): Promise<
  RepositoryResult<IndustryBenchmarkConfigTableRow[]>
> {
  try {
    const tables = await getExactV15Tables();
    return { source: "mock", data: tables.config };
  } catch (error) {
    return {
      source: "mock",
      data: [],
      error: error instanceof Error ? error.message : "Unknown industry benchmark config parse error.",
    };
  }
}

export async function getBenchmarkDataPullKeysTable(): Promise<
  RepositoryResult<BenchmarkDataPullKeyRow[]>
> {
  try {
    const tables = await getExactV15Tables();
    return { source: "mock", data: tables.pullKeys };
  } catch (error) {
    return {
      source: "mock",
      data: [],
      error: error instanceof Error ? error.message : "Unknown benchmark pull keys parse error.",
    };
  }
}

export async function getIndustryISMDisplayMapTable(): Promise<
  RepositoryResult<IndustryISMDisplayMapTableRow[]>
> {
  try {
    const tables = await getExactV15Tables();
    return { source: "mock", data: tables.ismDisplayMap };
  } catch (error) {
    return {
      source: "mock",
      data: [],
      error: error instanceof Error ? error.message : "Unknown ISM display map parse error.",
    };
  }
}

export async function getIndustryBenchmarkRules(): Promise<
  RepositoryResult<IndustryBenchmarkRuleRow[]>
> {
  try {
    const tables = await getExactV15Tables();
    return { source: "mock", data: tables.rules };
  } catch (error) {
    return {
      source: "mock",
      data: [],
      error: error instanceof Error ? error.message : "Unknown benchmark rules parse error.",
    };
  }
}

export async function getIndustryBenchmarkStatusValues(): Promise<
  RepositoryResult<IndustryBenchmarkStatusValueRow[]>
> {
  try {
    const tables = await getExactV15Tables();
    return { source: "mock", data: tables.statusValues };
  } catch (error) {
    return {
      source: "mock",
      data: [],
      error: error instanceof Error ? error.message : "Unknown benchmark status values parse error.",
    };
  }
}

export async function getIndustryBenchmarkConfigRows(): Promise<
  RepositoryResult<IndustryBenchmarkConfigRow[]>
> {
  try {
    const tables = await getExactV15Tables();
    const pullKeyByBenchmark = new Map(
      tables.pullKeys.map((row) => [normalizeBenchmarkName(row.damodaranIndustrialBenchmark), row]),
    );
    const displayByBenchmark = new Map(
      tables.ismDisplayMap.map((row) => [normalizeBenchmarkName(row.damodaranIndustrialBenchmark), row]),
    );
    return {
      source: "mock",
      data: tables.config.map((row) =>
        toLegacyIndustryBenchmarkConfigRow(
          row,
          pullKeyByBenchmark.get(normalizeBenchmarkName(row.damodaranIndustrialBenchmark)) ?? null,
          displayByBenchmark.get(normalizeBenchmarkName(row.damodaranIndustrialBenchmark)) ?? null,
        ),
      ),
    };
  } catch (error) {
    return {
      source: "mock",
      data: [],
      error: error instanceof Error ? error.message : "Unknown industry benchmark config row error.",
    };
  }
}

export async function getIndustryBenchmarkConfigByBenchmark(
  benchmarkName: string,
): Promise<RepositoryResult<IndustryBenchmarkConfigRow | null>> {
  const rows = await getIndustryBenchmarkConfigRows();
  const normalized = normalizeBenchmarkName(benchmarkName);
  const match =
    rows.data.find((row) => row.damodaranIndustryBenchmark === benchmarkName) ??
    rows.data.find((row) => row.normalizedBenchmarkName === normalized) ??
    null;
  return {
    source: rows.source,
    error: rows.error,
    data: match,
  };
}

export async function getIndustryISMDisplayMap(): Promise<
  RepositoryResult<IndustryISMDisplayMapRow[]>
> {
  const exact = await getIndustryISMDisplayMapTable();
  return {
    source: exact.source,
    error: exact.error,
    data: exact.data.map(toLegacyIndustryIsmDisplayMapRow),
  };
}

export async function getISMDisplayByBenchmark(
  benchmarkName: string,
): Promise<RepositoryResult<IndustryISMDisplayMapRow | null>> {
  const rows = await getIndustryISMDisplayMap();
  const normalized = normalizeBenchmarkName(benchmarkName);
  const match =
    rows.data.find((row) => row.damodaranIndustryBenchmark === benchmarkName) ??
    rows.data.find((row) => normalizeBenchmarkName(row.damodaranIndustryBenchmark) === normalized) ??
    null;
  return {
    source: rows.source,
    error: rows.error,
    data: match,
  };
}

export async function upsertBenchmarkToIsmSectorMappings(rows: DamodaranBenchmarkToIsmSectorRow[]) {
  const upsert = await upsertRowsAdminFirst(COLLECTIONS.damodaranBenchmarkToIsmSectorMappings, rows);
  const keepIds = new Set(rows.map((row) => row.id));

  const adminDb = getAdminDb();
  if (isFirebaseAdminConfigured() && adminDb) {
    try {
      const snapshot = await adminDb.collection(COLLECTIONS.damodaranBenchmarkToIsmSectorMappings).get();
      for (const item of snapshot.docs) {
        if (!keepIds.has(item.id)) {
          await item.ref.delete();
        }
      }
      return upsert;
    } catch {
      // continue to client fallback cleanup
    }
  }

  const db = getFirestoreDbSafe();
  if (db) {
    try {
      const snapshot = await getDocs(collection(db, COLLECTIONS.damodaranBenchmarkToIsmSectorMappings));
      for (const item of snapshot.docs) {
        if (!keepIds.has(item.id)) {
          await deleteDoc(doc(db, COLLECTIONS.damodaranBenchmarkToIsmSectorMappings, item.id));
        }
      }
    } catch {
      // ignore cleanup errors; upsert result is primary signal
    }
  }
  return upsert;
}

export async function upsertSectorIndustryMappings(rows: SectorIndustryMappingRow[]) {
  return upsertRowsAdminFirst(COLLECTIONS.sectorIndustryMappings, rows);
}

export async function getSectorMappingRules(): Promise<RepositoryResult<SectorMappingRule[]>> {
  return readCollectionWithFallback<SectorMappingRule>(
    COLLECTIONS.sectorMappingRules,
    (cache) => cache.rules,
    buildSectorMappingRules(),
  );
}

export async function getSectorMappingValidationValues(): Promise<
  RepositoryResult<SectorMappingValidationValue[]>
> {
  return readCollectionWithFallback<SectorMappingValidationValue>(
    COLLECTIONS.sectorMappingValidationValues,
    (cache) => cache.validationValues,
    buildSectorMappingValidationValues(),
  );
}

export async function getSectorMappingStatusValues(): Promise<
  RepositoryResult<SectorMappingStatusValue[]>
> {
  return readCollectionWithFallback<SectorMappingStatusValue>(
    COLLECTIONS.sectorMappingStatusValues,
    (cache) => cache.statusValues,
    sectorMappingStatusDefinitions,
  );
}

export async function getSectorMappingReadiness(): Promise<
  RepositoryResult<SectorMappingReadinessRow[]>
> {
  const fallbackCache = await readCache();
  if (fallbackCache?.readinessRows?.length) {
    return {
      data: fallbackCache.readinessRows,
      source: "firestore",
      error: "Using local sector cache fallback.",
    };
  }

  const mappings = await getSectorIndustryMappings();
  const validation = await buildSectorReadinessFromMappings(mappings.data);
  return {
    data: validation.readinessRows,
    source: mappings.source,
    error: mappings.error,
  };
}

export async function getIsmSectorCandidatesByBenchmark(benchmark: string) {
  const row = await getBenchmarkToIsmSectorMappingByBenchmark(benchmark);
  if (!row.data) {
    return {
      ...row,
      data: [] as string[],
    };
  }
  return {
    ...row,
    data: [row.data.defaultIsmSector, ...row.data.alternativeIsmSectors].filter(
      (item): item is string => Boolean(item),
    ),
  };
}

export async function getDamodaranBenchmarkCandidatesByIsmSector(ismSector: string) {
  const benchmarkRows = await getBenchmarkToIsmSectorMappings();
  return {
    source: benchmarkRows.source,
    error: benchmarkRows.error,
    data: benchmarkRows.data.filter(
      (row) =>
        row.defaultIsmSector === ismSector || row.alternativeIsmSectors.includes(ismSector),
    ),
  };
}

export async function getSectorMappingCandidateGuide(): Promise<
  RepositoryResult<SectorMappingCandidateGuideRow[]>
> {
  return readCollectionWithFallback<SectorMappingCandidateGuideRow>(
    COLLECTIONS.sectorMappingCandidateGuide,
    (cache) => cache.candidateGuideRows,
    [],
  );
}

export async function getSectorMappingImportStatus(): Promise<
  RepositoryResult<SectorMappingImportStatus>
> {
  const cache = await readCache();
  if (cache?.importStatus) {
    return {
      data: cache.importStatus,
      source: "firestore",
      error: "Using local sector cache fallback.",
    };
  }

  const db = getFirestoreDbSafe();
  if (!db) {
    return {
      data: {
        id: IMPORT_STATUS_DOC_ID,
        sourceName: SECTOR_MAPPING_SOURCE_NAME,
        sourceUrl: SECTOR_MAPPING_SOURCE_URL,
        sourceUpdateDate: SECTOR_MAPPING_SOURCE_UPDATE_DATE,
        importedLastUpdated: null,
        status: "Not Seeded",
        ismSectorCount: 0,
        mappingRowsCount: 0,
        mappingRequiredCount: 0,
        excludedSpecialReviewCount: 0,
        reviewRequiredCount: 0,
        okCount: 0,
        rowsEvaluated: 0,
        candidatesGenerated: 0,
        primaryValidCount: 0,
        primaryInvalidCount: 0,
        lastCandidateGeneratedAt: null,
        benchmarksEvaluated: 0,
        benchmarkMappingsGenerated: 0,
        highConfidenceCount: 0,
        mediumConfidenceCount: 0,
        lowConfidenceCount: 0,
        benchmarkReviewRequiredCount: 0,
        unmappedCount: 0,
        lastBenchmarkFirstGeneratedAt: null,
        rawIndustryCount: 0,
        canonicalIndustryCount: 0,
        variantsExcluded: 0,
        nonIndustryExcluded: 0,
        industryMasterListAvailable: false,
        warnings: ["Sector mapping foundation has not been seeded yet."],
        errors: [],
      },
      source: "mock",
      error: "Firestore not initialized.",
    };
  }

  try {
    const snapshot = await withTimeout(
      getDoc(doc(db, COLLECTIONS.sectorMappingImportStatus, IMPORT_STATUS_DOC_ID)),
    );
    if (!snapshot.exists()) {
      return {
        data: {
          id: IMPORT_STATUS_DOC_ID,
          sourceName: SECTOR_MAPPING_SOURCE_NAME,
          sourceUrl: SECTOR_MAPPING_SOURCE_URL,
          sourceUpdateDate: SECTOR_MAPPING_SOURCE_UPDATE_DATE,
          importedLastUpdated: null,
          status: "Not Seeded",
          ismSectorCount: 0,
          mappingRowsCount: 0,
          mappingRequiredCount: 0,
          excludedSpecialReviewCount: 0,
          reviewRequiredCount: 0,
          okCount: 0,
          rowsEvaluated: 0,
          candidatesGenerated: 0,
          primaryValidCount: 0,
          primaryInvalidCount: 0,
          lastCandidateGeneratedAt: null,
          benchmarksEvaluated: 0,
          benchmarkMappingsGenerated: 0,
          highConfidenceCount: 0,
          mediumConfidenceCount: 0,
          lowConfidenceCount: 0,
          benchmarkReviewRequiredCount: 0,
          unmappedCount: 0,
          lastBenchmarkFirstGeneratedAt: null,
          rawIndustryCount: 0,
          canonicalIndustryCount: 0,
          variantsExcluded: 0,
          nonIndustryExcluded: 0,
          industryMasterListAvailable: false,
          warnings: ["Sector mapping foundation has not been seeded yet."],
          errors: [],
        },
        source: "mock",
      };
    }
    return {
      data: snapshot.data() as SectorMappingImportStatus,
      source: "firestore",
    };
  } catch (error) {
    return {
      data: {
        id: IMPORT_STATUS_DOC_ID,
        sourceName: SECTOR_MAPPING_SOURCE_NAME,
        sourceUrl: SECTOR_MAPPING_SOURCE_URL,
        sourceUpdateDate: SECTOR_MAPPING_SOURCE_UPDATE_DATE,
        importedLastUpdated: null,
        status: "Not Seeded",
        ismSectorCount: 0,
        mappingRowsCount: 0,
        mappingRequiredCount: 0,
        excludedSpecialReviewCount: 0,
        reviewRequiredCount: 0,
        okCount: 0,
        rowsEvaluated: 0,
        candidatesGenerated: 0,
        primaryValidCount: 0,
        primaryInvalidCount: 0,
        lastCandidateGeneratedAt: null,
        benchmarksEvaluated: 0,
        benchmarkMappingsGenerated: 0,
        highConfidenceCount: 0,
        mediumConfidenceCount: 0,
        lowConfidenceCount: 0,
        benchmarkReviewRequiredCount: 0,
        unmappedCount: 0,
        lastBenchmarkFirstGeneratedAt: null,
        rawIndustryCount: 0,
        canonicalIndustryCount: 0,
        variantsExcluded: 0,
        nonIndustryExcluded: 0,
        industryMasterListAvailable: false,
        warnings: ["Sector mapping foundation status unavailable."],
        errors: [],
      },
      source: "mock",
      error: error instanceof Error ? error.message : "Unknown sector import status read error.",
    };
  }
}

export async function updateSectorMappingImportStatus(status: SectorMappingImportStatus) {
  const adminDb = getAdminDb();
  if (isFirebaseAdminConfigured() && adminDb) {
    try {
      await adminDb
        .collection(COLLECTIONS.sectorMappingImportStatus)
        .doc(IMPORT_STATUS_DOC_ID)
        .set(status, { merge: true });
      return { ok: true };
    } catch {
      // continue to client fallback
    }
  }

  const db = getFirestoreDbSafe();
  if (!db) {
    return { ok: false, error: "Firestore not initialized." };
  }

  try {
    await setDoc(doc(db, COLLECTIONS.sectorMappingImportStatus, IMPORT_STATUS_DOC_ID), status, {
      merge: true,
    });
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Unknown sector import status write error.",
    };
  }
}

export async function getSectorIndustryMappingSummary() {
  const [ismRows, mappings, benchmarkMappings, importStatus] = await Promise.all([
    getISMSectorRows(),
    getSectorIndustryMappings(),
    getBenchmarkToIsmSectorMappings(),
    getSectorMappingImportStatus(),
  ]);

  const mappingRequiredCount = mappings.data.filter((row) => row.status === "Mapping Required").length;
  const excludedSpecialReviewCount = mappings.data.filter(
    (row) => row.status === "Excluded / Special Review",
  ).length;
  const reviewRequiredCount = mappings.data.filter((row) => row.status === "Review Required").length;

  return {
    source:
      ismRows.source === "firestore" ||
      mappings.source === "firestore" ||
      importStatus.source === "firestore"
        ? "firestore"
        : "mock",
    ismSectorCount: ismRows.data.length,
    mappingRowsCount: mappings.data.length,
    benchmarkPrimaryRowsCount: benchmarkMappings.data.length,
    mappingRequiredCount,
    excludedSpecialReviewCount,
    reviewRequiredCount,
    okCount: mappings.data.filter((row) => row.status === "OK").length,
    importedLastUpdated: importStatus.data.importedLastUpdated,
    status: importStatus.data.lastCandidateGeneratedAt
      ? "Candidate Logic / Review Workflow"
      : "Foundation / Mapping Required",
  };
}

export async function upsertSectorMappingCandidateGuide(rows: SectorMappingCandidateGuideRow[]) {
  return upsertRowsAdminFirst(COLLECTIONS.sectorMappingCandidateGuide, rows);
}

export async function upsertSectorMappingReadiness(rows: SectorMappingReadinessRow[]) {
  return upsertRowsAdminFirst(COLLECTIONS.sectorMappingReadiness, rows);
}

export async function seedExactIndustryBenchmarkConfigV15() {
  const tables = await getExactV15Tables();
  const writes = await Promise.all([
    upsertRowsAdminFirst(COLLECTIONS.tblIndustryBenchmarkHeader, tables.header),
    upsertRowsAdminFirst(COLLECTIONS.tblDamodaranIndustryUniverse, tables.universe),
    upsertRowsAdminFirst(COLLECTIONS.tblIndustryBenchmarkConfig, tables.config),
    upsertRowsAdminFirst(COLLECTIONS.tblBenchmarkDataPullKeys, tables.pullKeys),
    upsertRowsAdminFirst(COLLECTIONS.tblIndustryISMDisplayMap, tables.ismDisplayMap),
    upsertRowsAdminFirst(COLLECTIONS.tblIndustryBenchmarkRules, tables.rules),
    upsertRowsAdminFirst(COLLECTIONS.tblIndustryBenchmarkStatusValues, tables.statusValues),
  ]);
  const writeErrors = writes
    .map((result) => ("error" in result && result.error ? result.error : null))
    .filter((value): value is string => Boolean(value));

  return {
    success: writeErrors.length === 0,
    sourceFilePath: tables.sourceFilePath,
    rowsSeeded: {
      tblIndustryBenchmarkHeader: tables.header.length,
      tblDamodaranIndustryUniverse: tables.universe.length,
      tblIndustryBenchmarkConfig: tables.config.length,
      tblBenchmarkDataPullKeys: tables.pullKeys.length,
      tblIndustryISMDisplayMap: tables.ismDisplayMap.length,
      tblIndustryBenchmarkRules: tables.rules.length,
      tblIndustryBenchmarkStatusValues: tables.statusValues.length,
    },
    errors: writeErrors,
  };
}

export async function seedSectorIndustryMappingFoundation(options?: { reset?: boolean }) {
  const reset = options?.reset ?? false;
  const existingIsmRows = await getISMSectorRows();
  const existingMappingRows = await getSectorIndustryMappings();
  const computed = await buildSectorFoundationSeed({
    reset,
    existingIsmRows: existingIsmRows.data,
    existingMappingRows: existingMappingRows.data,
  });

  await writeCache({
    ismSectorRows: computed.ismSectorRows,
    mappingRows: computed.mappingRows,
    benchmarkToIsmRows: [],
    candidateGuideRows: [],
    rules: computed.rules,
    validationValues: computed.validationValues,
    statusValues: computed.statusValues,
    readinessRows: computed.readinessRows,
    importStatus: computed.importStatus,
  });

  const writes = await Promise.all([
    upsertISMSectorRows(computed.ismSectorRows),
    upsertSectorIndustryMappings(computed.mappingRows),
    upsertRowsAdminFirst(COLLECTIONS.sectorMappingRules, computed.rules),
    upsertRowsAdminFirst(COLLECTIONS.sectorMappingValidationValues, computed.validationValues),
    upsertRowsAdminFirst(COLLECTIONS.sectorMappingStatusValues, computed.statusValues),
    upsertRowsAdminFirst(COLLECTIONS.sectorMappingReadiness, computed.readinessRows),
    upsertRowsAdminFirst(COLLECTIONS.sectorMappingCandidateGuide, []),
    upsertRowsAdminFirst(COLLECTIONS.damodaranBenchmarkToIsmSectorMappings, []),
    updateSectorMappingImportStatus(computed.importStatus),
  ]);

  const writeErrors = writes
    .map((result) => ("error" in result && result.error ? result.error : null))
    .filter((value): value is string => Boolean(value));

  return {
    success: writeErrors.length === 0,
    ismSectorCount: computed.summary.ismSectorCount,
    mappingRowsCount: computed.summary.mappingRowsCount,
    mappingRequiredCount: computed.summary.mappingRequiredCount,
    excludedSpecialReviewCount: computed.summary.excludedSpecialReviewCount,
    reviewRequiredCount: computed.summary.reviewRequiredCount,
    industryMasterListAvailable: computed.summary.industryMasterListAvailable,
    warnings: computed.summary.warnings,
    errors: [...computed.summary.errors, ...writeErrors],
  };
}

export async function generateAndPersistSectorMappingCandidates(options?: {
  overwrite?: boolean;
}) {
  const overwrite = options?.overwrite ?? false;
  const [ismRows, mappings, rules, validations, statuses, currentImportStatus] = await Promise.all([
    getISMSectorRows(),
    getSectorIndustryMappings(),
    getSectorMappingRules(),
    getSectorMappingValidationValues(),
    getSectorMappingStatusValues(),
    getSectorMappingImportStatus(),
  ]);

  const generated = await generateSectorMappingCandidates({
    ismRows: ismRows.data,
    mappingRows: mappings.data.map((row) => ({
      ...row,
      mappingDirection: row.mappingDirection ?? "ISM_TO_BENCHMARK_HELPER",
    })),
    overwrite,
  });

  const importStatus: SectorMappingImportStatus = {
    ...currentImportStatus.data,
    importedLastUpdated: new Date().toISOString(),
    status: "Candidate logic generated / analyst review pending",
    ismSectorCount: ismRows.data.length,
    mappingRowsCount: generated.summary.rowsEvaluated,
    mappingRequiredCount: generated.summary.mappingRequiredCount,
    excludedSpecialReviewCount: generated.summary.excludedSpecialReviewCount,
    reviewRequiredCount: generated.summary.reviewRequiredCount,
    okCount: generated.summary.okCount,
    rowsEvaluated: generated.summary.rowsEvaluated,
    candidatesGenerated: generated.summary.candidatesGenerated,
    primaryValidCount: generated.summary.primaryValidCount,
    primaryInvalidCount: generated.summary.primaryInvalidCount,
    lastCandidateGeneratedAt: new Date().toISOString(),
    warnings: generated.summary.warnings,
    errors: generated.summary.errors,
  };

  await writeCache({
    ismSectorRows: ismRows.data,
    mappingRows: generated.updatedMappings,
    benchmarkToIsmRows: (await getBenchmarkToIsmSectorMappings()).data,
    candidateGuideRows: generated.candidateGuideRows,
    rules: rules.data,
    validationValues: validations.data,
    statusValues: statuses.data,
    readinessRows: generated.readinessRows,
    importStatus,
  });

  const writes = await Promise.all([
    upsertSectorIndustryMappings(generated.updatedMappings),
    upsertSectorMappingCandidateGuide(generated.candidateGuideRows),
    upsertSectorMappingReadiness(generated.readinessRows),
    updateSectorMappingImportStatus(importStatus),
  ]);

  const writeErrors = writes
    .map((result) => ("error" in result && result.error ? result.error : null))
    .filter((value): value is string => Boolean(value));

  return {
    success: writeErrors.length === 0 && generated.summary.errors.length === 0,
    rowsEvaluated: generated.summary.rowsEvaluated,
    candidatesGenerated: generated.summary.candidatesGenerated,
    primaryValidCount: generated.summary.primaryValidCount,
    primaryInvalidCount: generated.summary.primaryInvalidCount,
    mappingRequiredCount: generated.summary.mappingRequiredCount,
    reviewRequiredCount: generated.summary.reviewRequiredCount,
    okCount: generated.summary.okCount,
    excludedSpecialReviewCount: generated.summary.excludedSpecialReviewCount,
    warnings: generated.summary.warnings,
    errors: [...generated.summary.errors, ...writeErrors],
  };
}

export async function generateAndPersistBenchmarkToIsmCandidates(options?: { overwrite?: boolean }) {
  const overwrite = options?.overwrite ?? false;
  const [ismRows, mappings, existingBenchmarkRows, rules, validations, statuses, currentImportStatus] =
    await Promise.all([
      getISMSectorRows(),
      getSectorIndustryMappings(),
      getBenchmarkToIsmSectorMappings(),
      getSectorMappingRules(),
      getSectorMappingValidationValues(),
      getSectorMappingStatusValues(),
      getSectorMappingImportStatus(),
    ]);

  const generated = await generateBenchmarkToIsmSectorCandidates({
    ismRows: ismRows.data,
    helperMappings: mappings.data,
    existingBenchmarkRows: existingBenchmarkRows.data,
    overwrite,
  });

  const importStatus: SectorMappingImportStatus = {
    ...currentImportStatus.data,
    importedLastUpdated: new Date().toISOString(),
    status: "Benchmark-first mapping generated / analyst review pending",
    rawIndustryCount: generated.summary.rawIndustryCount,
    canonicalIndustryCount: generated.summary.canonicalIndustryCount,
    variantsExcluded: generated.summary.variantsExcluded,
    nonIndustryExcluded: generated.summary.nonIndustryExcluded,
    benchmarksEvaluated: generated.summary.benchmarksEvaluated,
    benchmarkMappingsGenerated: generated.summary.mappingsGenerated,
    highConfidenceCount: generated.summary.highConfidenceCount,
    mediumConfidenceCount: generated.summary.mediumConfidenceCount,
    lowConfidenceCount: generated.summary.lowConfidenceCount,
    benchmarkReviewRequiredCount: generated.summary.reviewRequiredCount,
    excludedSpecialReviewCount: generated.summary.excludedSpecialReviewCount,
    unmappedCount: generated.summary.unmappedCount,
    stageDefaultsPopulated: generated.summary.stageDefaultsPopulated,
    cyclicalityDefaultsPopulated: generated.summary.cyclicalityDefaultsPopulated,
    historyDefaultsPopulated: generated.summary.historyDefaultsPopulated,
    lastBenchmarkFirstGeneratedAt: new Date().toISOString(),
    warnings: generated.summary.warnings,
    errors: generated.summary.errors,
  };

  await writeCache({
    ismSectorRows: ismRows.data,
    mappingRows: mappings.data.map((row) => ({
      ...row,
      mappingDirection: row.mappingDirection ?? "ISM_TO_BENCHMARK_HELPER",
    })),
    benchmarkToIsmRows: generated.rows,
    candidateGuideRows: (await getSectorMappingCandidateGuide()).data,
    rules: rules.data,
    validationValues: validations.data,
    statusValues: statuses.data,
    readinessRows: (await getSectorMappingReadiness()).data,
    importStatus,
  });

  const writes = await Promise.all([
    upsertBenchmarkToIsmSectorMappings(generated.rows),
    updateSectorMappingImportStatus(importStatus),
  ]);

  const writeErrors = writes
    .map((result) => ("error" in result && result.error ? result.error : null))
    .filter((value): value is string => Boolean(value));

  return {
    success: writeErrors.length === 0 && generated.summary.errors.length === 0,
    rawIndustryCount: generated.summary.rawIndustryCount,
    canonicalIndustryCount: generated.summary.canonicalIndustryCount,
    variantsExcluded: generated.summary.variantsExcluded,
    nonIndustryExcluded: generated.summary.nonIndustryExcluded,
    benchmarksEvaluated: generated.summary.benchmarksEvaluated,
    mappingsGenerated: generated.summary.mappingsGenerated,
    highConfidenceCount: generated.summary.highConfidenceCount,
    mediumConfidenceCount: generated.summary.mediumConfidenceCount,
    lowConfidenceCount: generated.summary.lowConfidenceCount,
    stageDefaultsPopulated: generated.summary.stageDefaultsPopulated,
    cyclicalityDefaultsPopulated: generated.summary.cyclicalityDefaultsPopulated,
    historyDefaultsPopulated: generated.summary.historyDefaultsPopulated,
    reviewRequiredCount: generated.summary.reviewRequiredCount,
    excludedSpecialReviewCount: generated.summary.excludedSpecialReviewCount,
    unmappedCount: generated.summary.unmappedCount,
    warnings: generated.summary.warnings,
    errors: [...generated.summary.errors, ...writeErrors],
  };
}

export async function generateAndPersistIndustryBenchmarkConfig(options?: { overwrite?: boolean }) {
  void options;
  return seedExactIndustryBenchmarkConfigV15();
}

export async function validateIndustryBenchmarkConfigCompleteness() {
  const configs = await getIndustryBenchmarkConfigRows();
  const requiredFields: Array<keyof IndustryBenchmarkConfigRow> = [
    "damodaranIndustryBenchmark",
    "normalizedBenchmarkName",
    "eligibilityStatus",
    "ismDisplaySector",
    "defaultModelMode",
    "defaultStageType",
    "cyclicalityFlag",
    "historyRecommendation",
    "assetIntensity",
    "regulatoryFlag",
    "benchmarkUse",
    "betaTableKey",
    "marginTableKey",
    "rocRoicTableKey",
    "reinvestmentSalesToCapitalTableKey",
    "workingCapitalTableKey",
    "taxTableKey",
    "waccCostOfCapitalSanityKey",
    "multiplesSanityKey",
    "pricingSanityOnly",
    "reviewFlag",
    "sourceName",
    "sourceUrl",
    "sourceUpdateDate",
  ];

  const missingByField = new Map<string, number>();
  const incompleteRows: string[] = [];
  for (const row of configs.data) {
    let rowMissing = 0;
    for (const field of requiredFields) {
      const value = row[field];
      const isMissing =
        value === null ||
        value === undefined ||
        (typeof value === "string" && value.trim().length === 0);
      if (isMissing) {
        rowMissing += 1;
        missingByField.set(field, (missingByField.get(field) ?? 0) + 1);
      }
    }
    if (rowMissing > 0) {
      incompleteRows.push(row.damodaranIndustryBenchmark);
    }
  }

  return {
    source: configs.source,
    error: configs.error,
    summary: {
      rowsEvaluated: configs.data.length,
      completeRows: configs.data.length - incompleteRows.length,
      incompleteRowsCount: incompleteRows.length,
      incompleteRows,
      missingFieldCounts: Array.from(missingByField.entries())
        .map(([field, count]) => ({ field, count }))
        .sort((a, b) => b.count - a.count),
    },
  };
}
