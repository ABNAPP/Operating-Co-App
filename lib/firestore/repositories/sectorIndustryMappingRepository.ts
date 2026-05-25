import "server-only";
import fs from "node:fs/promises";
import path from "node:path";
import { collection, doc, getDoc, getDocs, setDoc } from "firebase/firestore";
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
  ISMSectorRow,
  SectorIndustryMappingRow,
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
  rules: SectorMappingRule[];
  validationValues: SectorMappingValidationValue[];
  statusValues: SectorMappingStatusValue[];
  readinessRows: SectorMappingReadinessRow[];
  importStatus: SectorMappingImportStatus;
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
  const cachedRows = cache ? cacheSelector(cache) : defaultRows;
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
  const [ismRows, mappings, importStatus] = await Promise.all([
    getISMSectorRows(),
    getSectorIndustryMappings(),
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
    mappingRequiredCount,
    excludedSpecialReviewCount,
    reviewRequiredCount,
    importedLastUpdated: importStatus.data.importedLastUpdated,
    status: "Foundation / Mapping Required",
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
