import "server-only";
import fs from "node:fs/promises";
import path from "node:path";
import { collection, deleteDoc, doc, getDoc, getDocs, query, setDoc, where } from "firebase/firestore";
import {
  buildDamodaranDataVaultFromLocalFiles,
  computeStaleImportStatus,
} from "@/lib/data-hub/damodaranDataImportService";
import { buildCanonicalDamodaranIndustryList } from "@/lib/data-hub/damodaranIndustryCanonicalService";
import { damodaranDatasetRegistry } from "@/lib/data-hub/damodaranDatasetRegistry";
import { getAdminDb, isFirebaseAdminConfigured } from "@/lib/firebase/admin";
import { getFirestoreDbSafe } from "@/lib/firebase/client";
import { COLLECTIONS } from "@/lib/firestore/collections";
import type {
  CanonicalDamodaranIndustryRow,
  DamodaranDatasetCoverageRow,
  DamodaranDatasetRegisterRow,
  DamodaranImportSummary,
  DamodaranIndustryMasterRow,
  DamodaranRawDatasetRow,
} from "@/lib/types";
import type { RepositoryResult } from "@/lib/firestore/repositories/companiesRepository";

const IMPORT_SUMMARY_DOC_ID = "damodaran-data-import-summary";
const CACHE_DIR = path.join(process.cwd(), "data", "damodaran", "cache");
const CACHE_FILE_PATH = path.join(CACHE_DIR, "data-vault-cache.json");

interface DamodaranDataVaultCache {
  registerRows: DamodaranDatasetRegisterRow[];
  industryMasterRows: DamodaranIndustryMasterRow[];
  canonicalIndustryRows?: CanonicalDamodaranIndustryRow[];
  coverageRows: DamodaranDatasetCoverageRow[];
  rawDatasetRows: DamodaranRawDatasetRow[];
  importSummary: DamodaranImportSummary;
}

interface CacheReadState {
  mtimeMs: number;
  payload: DamodaranDataVaultCache;
}

let inMemoryDamodaranCache: CacheReadState | null = null;
const FIRESTORE_READ_TIMEOUT_MS = 2000;

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

const defaultImportSummary: DamodaranImportSummary = {
  success: false,
  startedAt: "",
  finishedAt: "",
  datasetsAttempted: damodaranDatasetRegistry.length,
  datasetsImported: [],
  datasetsMissing: damodaranDatasetRegistry.map((row) => row.fileName),
  datasetsFailed: [],
  rawRowsImported: 0,
  industryCount: 0,
  coverageMatrixRows: 0,
  extraUnregisteredFiles: [],
  warnings: ["No import has run yet."],
  errors: [],
};

async function getCollectionRows<T>(
  collectionName: string,
  fallbackRows: T[],
): Promise<RepositoryResult<T[]>> {
  const adminDb = getAdminDb();
  if (isFirebaseAdminConfigured() && adminDb) {
    try {
      const snapshot = await withTimeout(adminDb.collection(collectionName).get());
      const rows = snapshot.docs.map((item) => item.data() as T);
      if (rows.length > 0) {
        return { data: rows, source: "firestore" };
      }
    } catch {
      // continue to client fallback
    }
  }

  const db = getFirestoreDbSafe();
  if (!db) {
    return { data: fallbackRows, source: "mock", error: "Firestore not initialized." };
  }

  try {
    const snapshot = await withTimeout(getDocs(collection(db, collectionName)));
    const rows = snapshot.docs.map((item) => item.data() as T);
    if (rows.length > 0) {
      return { data: rows, source: "firestore" };
    }
    return { data: fallbackRows, source: "mock" };
  } catch (error) {
    return {
      data: fallbackRows,
      source: "mock",
      error: error instanceof Error ? error.message : "Unknown collection read error.",
    };
  }
}

async function readDamodaranDataVaultCache(): Promise<DamodaranDataVaultCache | null> {
  try {
    const stat = await fs.stat(CACHE_FILE_PATH);
    if (inMemoryDamodaranCache && inMemoryDamodaranCache.mtimeMs === stat.mtimeMs) {
      return inMemoryDamodaranCache.payload;
    }

    const content = await fs.readFile(CACHE_FILE_PATH, "utf8");
    const parsed = JSON.parse(content) as DamodaranDataVaultCache;
    inMemoryDamodaranCache = {
      mtimeMs: stat.mtimeMs,
      payload: parsed,
    };
    return parsed;
  } catch {
    return null;
  }
}

async function writeDamodaranDataVaultCache(payload: DamodaranDataVaultCache): Promise<void> {
  await fs.mkdir(CACHE_DIR, { recursive: true });
  await fs.writeFile(CACHE_FILE_PATH, JSON.stringify(payload), "utf8");
  inMemoryDamodaranCache = null;
}

async function upsertAdminRow(
  collectionName: string,
  id: string,
  row: object,
): Promise<{ ok: boolean; error?: string }> {
  const adminDb = getAdminDb();
  if (!isFirebaseAdminConfigured() || !adminDb) {
    return { ok: false, error: "Firebase Admin not configured." };
  }

  try {
    await adminDb.collection(collectionName).doc(id).set(row, { merge: true });
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Unknown admin upsert error.",
    };
  }
}

export async function getDamodaranDatasetRegister(): Promise<
  RepositoryResult<DamodaranDatasetRegisterRow[]>
> {
  const now = new Date().toISOString();
  const cache = await readDamodaranDataVaultCache();
  if (cache?.registerRows && cache.registerRows.length > 0) {
    return {
      data: cache.registerRows
        .map((row) => ({ ...row, importStatus: computeStaleImportStatus(row, now) }))
        .sort((a, b) => a.fileName.localeCompare(b.fileName)),
      source: "firestore",
      error: "Using local Damodaran cache fallback.",
    };
  }

  const result = await getCollectionRows<DamodaranDatasetRegisterRow>(
    COLLECTIONS.damodaranDatasetRegister,
    damodaranDatasetRegistry,
  );
  const sourceRows =
    result.source === "firestore" && result.data.length > 0
      ? result.data
      : cache?.registerRows && cache.registerRows.length > 0
        ? cache.registerRows
        : result.data;
  const rows = sourceRows
    .map((row) => ({ ...row, importStatus: computeStaleImportStatus(row, now) }))
    .sort((a, b) => a.fileName.localeCompare(b.fileName));

  return {
    data: rows,
    source:
      result.source === "firestore"
        ? "firestore"
        : cache?.registerRows && cache.registerRows.length > 0
          ? "firestore"
          : result.source,
    error: result.error,
  };
}

export async function upsertDamodaranDatasetRegisterRow(row: DamodaranDatasetRegisterRow) {
  return upsertAdminRow(COLLECTIONS.damodaranDatasetRegister, row.id, row);
}

export async function seedDamodaranDatasetRegister() {
  const adminDb = getAdminDb();
  if (!isFirebaseAdminConfigured() || !adminDb) {
    return { ok: false, seeded: 0, error: "Firebase Admin not configured." };
  }

  try {
    for (const row of damodaranDatasetRegistry) {
      await adminDb.collection(COLLECTIONS.damodaranDatasetRegister).doc(row.id).set(row, {
        merge: true,
      });
    }
    return { ok: true, seeded: damodaranDatasetRegistry.length };
  } catch (error) {
    return {
      ok: false,
      seeded: 0,
      error: error instanceof Error ? error.message : "Unknown seed error.",
    };
  }
}

export async function getDamodaranIndustryMasterList(): Promise<
  RepositoryResult<DamodaranIndustryMasterRow[]>
> {
  const result = await getCollectionRows<DamodaranIndustryMasterRow>(
    COLLECTIONS.damodaranIndustryMaster,
    [],
  );
  if (result.source === "firestore" && result.data.length > 0) {
    return result;
  }
  const cache = await readDamodaranDataVaultCache();
  if (cache?.industryMasterRows && cache.industryMasterRows.length > 0) {
    return { data: cache.industryMasterRows, source: "firestore", error: result.error };
  }
  return result;
}

export async function getCanonicalDamodaranIndustries(): Promise<
  RepositoryResult<CanonicalDamodaranIndustryRow[]>
> {
  const result = await getCollectionRows<CanonicalDamodaranIndustryRow>(
    COLLECTIONS.canonicalDamodaranIndustries,
    [],
  );
  if (result.source === "firestore" && result.data.length > 0) {
    return result;
  }
  const cache = await readDamodaranDataVaultCache();
  if (cache?.canonicalIndustryRows && cache.canonicalIndustryRows.length > 0) {
    return { data: cache.canonicalIndustryRows, source: "firestore", error: result.error };
  }
  return result;
}

export async function upsertDamodaranIndustryMasterRows(rows: DamodaranIndustryMasterRow[]) {
  const adminDb = getAdminDb();
  if (!isFirebaseAdminConfigured() || !adminDb) {
    return { ok: false, upserted: 0, error: "Firebase Admin not configured." };
  }

  try {
    for (const row of rows) {
      await adminDb.collection(COLLECTIONS.damodaranIndustryMaster).doc(row.id).set(row, {
        merge: true,
      });
    }
    return { ok: true, upserted: rows.length };
  } catch (error) {
    return {
      ok: false,
      upserted: 0,
      error: error instanceof Error ? error.message : "Unknown industry master upsert error.",
    };
  }
}

export async function getDamodaranCoverageMatrix(): Promise<
  RepositoryResult<DamodaranDatasetCoverageRow[]>
> {
  const result = await getCollectionRows<DamodaranDatasetCoverageRow>(
    COLLECTIONS.damodaranCoverageMatrix,
    [],
  );
  if (result.source === "firestore" && result.data.length > 0) {
    return result;
  }
  const cache = await readDamodaranDataVaultCache();
  if (cache?.coverageRows && cache.coverageRows.length > 0) {
    return { data: cache.coverageRows, source: "firestore", error: result.error };
  }
  return result;
}

export async function upsertDamodaranCoverageRows(rows: DamodaranDatasetCoverageRow[]) {
  const adminDb = getAdminDb();
  if (!isFirebaseAdminConfigured() || !adminDb) {
    return { ok: false, upserted: 0, error: "Firebase Admin not configured." };
  }

  try {
    for (const row of rows) {
      const normalizedId = row.industryName
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");
      await adminDb.collection(COLLECTIONS.damodaranCoverageMatrix).doc(normalizedId).set(row, {
        merge: true,
      });
    }
    return { ok: true, upserted: rows.length };
  } catch (error) {
    return {
      ok: false,
      upserted: 0,
      error: error instanceof Error ? error.message : "Unknown coverage upsert error.",
    };
  }
}

export async function upsertCanonicalDamodaranIndustries(rows: CanonicalDamodaranIndustryRow[]) {
  const adminDb = getAdminDb();
  if (isFirebaseAdminConfigured() && adminDb) {
    try {
      for (const row of rows) {
        await adminDb.collection(COLLECTIONS.canonicalDamodaranIndustries).doc(row.id).set(row, {
          merge: true,
        });
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
      await setDoc(doc(db, COLLECTIONS.canonicalDamodaranIndustries, row.id), row, { merge: true });
    }
    return { ok: true, upserted: rows.length };
  } catch (error) {
    return {
      ok: false,
      upserted: 0,
      error: error instanceof Error ? error.message : "Unknown canonical industries upsert error.",
    };
  }
}

export async function getCanonicalIndustryByName(name: string): Promise<
  RepositoryResult<CanonicalDamodaranIndustryRow | null>
> {
  const canonical = await getCanonicalDamodaranIndustries();
  const normalized = name.trim().toLowerCase().replace(/\s+/g, " ");
  return {
    source: canonical.source,
    error: canonical.error,
    data:
      canonical.data.find((row) => row.industryName === name) ??
      canonical.data.find((row) => row.normalizedIndustryName === normalized) ??
      null,
  };
}

export async function getDamodaranImportSummary(): Promise<RepositoryResult<DamodaranImportSummary>> {
  const adminDb = getAdminDb();
  if (isFirebaseAdminConfigured() && adminDb) {
    try {
      const snapshot = await adminDb
        .collection(COLLECTIONS.damodaranImportSummary)
        .doc(IMPORT_SUMMARY_DOC_ID)
        .get();
      if (snapshot.exists) {
        return { data: snapshot.data() as DamodaranImportSummary, source: "firestore" };
      }
    } catch {
      // continue to client fallback
    }
  }

  const cache = await readDamodaranDataVaultCache();
  const db = getFirestoreDbSafe();
  if (!db) {
    return {
      data: cache?.importSummary ?? defaultImportSummary,
      source: cache ? "firestore" : "mock",
      error: "Firestore not initialized.",
    };
  }

  try {
    const snapshot = await getDoc(doc(db, COLLECTIONS.damodaranImportSummary, IMPORT_SUMMARY_DOC_ID));
    if (!snapshot.exists()) {
      if (cache?.importSummary) {
        return { data: cache.importSummary, source: "firestore" };
      }
      return { data: defaultImportSummary, source: "mock" };
    }
    return { data: snapshot.data() as DamodaranImportSummary, source: "firestore" };
  } catch (error) {
    return {
      data: cache?.importSummary ?? defaultImportSummary,
      source: cache ? "firestore" : "mock",
      error: error instanceof Error ? error.message : "Unknown import summary read error.",
    };
  }
}

export async function updateDamodaranImportSummary(summary: DamodaranImportSummary) {
  return upsertAdminRow(COLLECTIONS.damodaranImportSummary, IMPORT_SUMMARY_DOC_ID, summary);
}

export async function getDamodaranRawDatasetRows(
  datasetId: string,
): Promise<RepositoryResult<DamodaranRawDatasetRow[]>> {
  const cache = await readDamodaranDataVaultCache();
  const cachedRows =
    cache?.rawDatasetRows
      .filter((row) => row.datasetId === datasetId)
      .sort((a, b) => a.rowIndex - b.rowIndex) ?? [];
  if (cachedRows.length > 0) {
    return { data: cachedRows, source: "firestore", error: "Using local Damodaran cache fallback." };
  }

  const adminDb = getAdminDb();
  if (isFirebaseAdminConfigured() && adminDb) {
    try {
      const snapshot = await withTimeout(
        adminDb
        .collection(COLLECTIONS.damodaranRawDatasetRows)
        .where("datasetId", "==", datasetId)
        .get(),
      );
      const rows = snapshot.docs.map((item) => item.data() as DamodaranRawDatasetRow);
      return { data: rows.sort((a, b) => a.rowIndex - b.rowIndex), source: "firestore" };
    } catch {
      // continue to client fallback
    }
  }

  const db = getFirestoreDbSafe();
  if (!db) {
    return {
      data: cachedRows,
      source: cachedRows.length > 0 ? "firestore" : "mock",
      error: "Firestore not initialized.",
    };
  }

  try {
    const snapshot = await withTimeout(getDocs(
      query(collection(db, COLLECTIONS.damodaranRawDatasetRows), where("datasetId", "==", datasetId)),
    ));
    const rows = snapshot.docs.map((item) => item.data() as DamodaranRawDatasetRow);
    return { data: rows.sort((a, b) => a.rowIndex - b.rowIndex), source: "firestore" };
  } catch (error) {
    return {
      data: cachedRows,
      source: cachedRows.length > 0 ? "firestore" : "mock",
      error: error instanceof Error ? error.message : "Unknown raw dataset rows read error.",
    };
  }
}

export async function getAllDamodaranRawDatasetRows(): Promise<RepositoryResult<DamodaranRawDatasetRow[]>> {
  const cache = await readDamodaranDataVaultCache();
  if (cache?.rawDatasetRows?.length) {
    return { data: cache.rawDatasetRows, source: "firestore", error: "Using local Damodaran cache fallback." };
  }

  const result = await getCollectionRows<DamodaranRawDatasetRow>(COLLECTIONS.damodaranRawDatasetRows, []);
  if (result.source === "firestore" && result.data.length > 0) {
    return result;
  }
  return result;
}

export async function upsertDamodaranRawDatasetRows(
  datasetId: string,
  rows: DamodaranRawDatasetRow[],
): Promise<{ ok: boolean; upserted: number; error?: string }> {
  const adminDb = getAdminDb();
  if (isFirebaseAdminConfigured() && adminDb) {
    try {
      let upserted = 0;
      for (const row of rows) {
        await adminDb.collection(COLLECTIONS.damodaranRawDatasetRows).doc(row.id).set(
          {
            ...row,
            datasetId,
          },
          { merge: true },
        );
        upserted++;
      }
      return { ok: true, upserted };
    } catch {
      // continue to client fallback
    }
  }

  const db = getFirestoreDbSafe();
  if (!db) {
    return { ok: false, upserted: 0, error: "Firestore not initialized." };
  }

  try {
    let upserted = 0;
    for (const row of rows) {
      await setDoc(doc(db, COLLECTIONS.damodaranRawDatasetRows, row.id), { ...row, datasetId }, { merge: true });
      upserted++;
    }
    return { ok: true, upserted };
  } catch (error) {
    return {
      ok: false,
      upserted: 0,
      error: error instanceof Error ? error.message : "Unknown raw rows upsert error.",
    };
  }
}

export async function replaceDamodaranRawDatasetRowsForDataset(
  datasetId: string,
  rows: DamodaranRawDatasetRow[],
): Promise<{ ok: boolean; replaced: number; error?: string }> {
  const adminDb = getAdminDb();
  if (isFirebaseAdminConfigured() && adminDb) {
    try {
      const existing = await adminDb
        .collection(COLLECTIONS.damodaranRawDatasetRows)
        .where("datasetId", "==", datasetId)
        .get();

      let batch = adminDb.batch();
      let operationCount = 0;
      let replaced = 0;

      for (const document of existing.docs) {
        batch.delete(document.ref);
        operationCount++;
        if (operationCount >= 400) {
          await batch.commit();
          batch = adminDb.batch();
          operationCount = 0;
        }
      }

      for (const row of rows) {
        const ref = adminDb.collection(COLLECTIONS.damodaranRawDatasetRows).doc(row.id);
        batch.set(ref, { ...row, datasetId }, { merge: false });
        operationCount++;
        replaced++;

        if (operationCount >= 400) {
          await batch.commit();
          batch = adminDb.batch();
          operationCount = 0;
        }
      }

      if (operationCount > 0) {
        await batch.commit();
      }

      return { ok: true, replaced };
    } catch {
      // continue to client fallback
    }
  }

  const db = getFirestoreDbSafe();
  if (!db) {
    return { ok: false, replaced: 0, error: "Firestore not initialized." };
  }

  try {
    const existing = await getDocs(
      query(collection(db, COLLECTIONS.damodaranRawDatasetRows), where("datasetId", "==", datasetId)),
    );
    for (const document of existing.docs) {
      await deleteDoc(doc(db, COLLECTIONS.damodaranRawDatasetRows, document.id));
    }
    for (const row of rows) {
      await setDoc(
        doc(db, COLLECTIONS.damodaranRawDatasetRows, row.id),
        { ...row, datasetId },
        { merge: false },
      );
    }
    return { ok: true, replaced: rows.length };
  } catch (error) {
    return {
      ok: false,
      replaced: 0,
      error: error instanceof Error ? error.message : "Unknown raw rows replace error.",
    };
  }
}

export async function getDamodaranDatasetDetail(datasetId: string): Promise<
  RepositoryResult<{
    dataset: DamodaranDatasetRegisterRow | null;
    rawRows: DamodaranRawDatasetRow[];
    totalRows: number;
    page: number;
    pageSize: number;
  }>
> {
  return getDamodaranDatasetDetailPaginated(datasetId);
}

export async function getDamodaranDatasetDetailPaginated(
  datasetId: string,
  options?: {
    q?: string;
    page?: number;
    pageSize?: number;
  },
): Promise<
  RepositoryResult<{
    dataset: DamodaranDatasetRegisterRow | null;
    rawRows: DamodaranRawDatasetRow[];
    totalRows: number;
    page: number;
    pageSize: number;
  }>
> {
  const page = Math.max(1, options?.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, options?.pageSize ?? 50));
  const queryText = options?.q?.trim().toLowerCase() ?? "";

  const register = await getDamodaranDatasetRegister();
  const rawRowsResult = await getDamodaranRawDatasetRows(datasetId);
  const filteredRows =
    queryText.length === 0
      ? rawRowsResult.data
      : rawRowsResult.data.filter((row) => row.industryName.toLowerCase().includes(queryText));
  const totalRows = filteredRows.length;
  const startIndex = (page - 1) * pageSize;
  const pagedRows = filteredRows.slice(startIndex, startIndex + pageSize);
  const dataset = register.data.find((row) => row.id === datasetId) ?? null;

  return {
    data: {
      dataset,
      rawRows: pagedRows,
      totalRows,
      page,
      pageSize,
    },
    source:
      register.source === "firestore" || rawRowsResult.source === "firestore"
        ? "firestore"
        : "mock",
    error: register.error ?? rawRowsResult.error,
  };
}

export async function getDamodaranDataVaultSummary() {
  const register = await getDamodaranDatasetRegister();
  const importSummary = await getDamodaranImportSummary();

  const coreRows = register.data.filter((row) => row.priority === "Core");
  const missingCoreDatasets = coreRows
    .filter((row) => row.importStatus !== "Imported")
    .map((row) => row.fileName);

  return {
    source: register.source === "firestore" || importSummary.source === "firestore" ? "firestore" : "mock",
    datasetsTotal: register.data.length,
    datasetsImported: register.data.filter((row) => row.importStatus === "Imported").length,
    datasetsMissing: register.data.filter((row) => row.importStatus === "Missing Local File").length,
    datasetsFailed: register.data.filter((row) => row.importStatus === "Import Error").length,
    industryCount: importSummary.data.industryCount,
    coverageMatrixRows: importSummary.data.coverageMatrixRows,
    rawRowsImported: importSummary.data.rawRowsImported,
    importedLastUpdated: importSummary.data.finishedAt || null,
    missingCoreDatasets,
  };
}

export async function refreshDamodaranDataVaultFromLocalFiles() {
  const computed = await buildDamodaranDataVaultFromLocalFiles();
  await writeDamodaranDataVaultCache({
    registerRows: computed.registerRows,
    industryMasterRows: computed.industryMasterRows,
    canonicalIndustryRows: [],
    coverageRows: computed.coverageRows,
    rawDatasetRows: computed.rawDatasetRows,
    importSummary: computed.importSummary,
  });
  const adminDb = getAdminDb();
  const db = getFirestoreDbSafe();

  const persistWithAdmin = async () => {
    if (!isFirebaseAdminConfigured() || !adminDb) {
      throw new Error("Firebase Admin not configured.");
    }

    for (const row of computed.registerRows) {
      await adminDb.collection(COLLECTIONS.damodaranDatasetRegister).doc(row.id).set(row, {
        merge: true,
      });
    }

    for (const row of computed.industryMasterRows) {
      await adminDb.collection(COLLECTIONS.damodaranIndustryMaster).doc(row.id).set(row, {
        merge: true,
      });
    }

    for (const row of computed.coverageRows) {
      const normalizedId = row.industryName
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");
      await adminDb.collection(COLLECTIONS.damodaranCoverageMatrix).doc(normalizedId).set(row, {
        merge: true,
      });
    }

    for (const dataset of computed.registerRows) {
      const datasetRows = computed.rawDatasetRows.filter((row) => row.datasetId === dataset.id);
      const replaced = await replaceDamodaranRawDatasetRowsForDataset(dataset.id, datasetRows);
      if (!replaced.ok) {
        throw new Error(replaced.error ?? `Failed replacing raw rows for ${dataset.fileName}`);
      }
    }

    await adminDb
      .collection(COLLECTIONS.damodaranImportSummary)
      .doc(IMPORT_SUMMARY_DOC_ID)
      .set(computed.importSummary, { merge: true });
  };

  const persistWithClient = async () => {
    if (!db) {
      throw new Error("Firestore not initialized.");
    }

    for (const row of computed.registerRows) {
      await setDoc(doc(db, COLLECTIONS.damodaranDatasetRegister, row.id), row, { merge: true });
    }

    for (const row of computed.industryMasterRows) {
      await setDoc(doc(db, COLLECTIONS.damodaranIndustryMaster, row.id), row, { merge: true });
    }

    for (const row of computed.coverageRows) {
      const normalizedId = row.industryName
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");
      await setDoc(doc(db, COLLECTIONS.damodaranCoverageMatrix, normalizedId), row, { merge: true });
    }

    for (const dataset of computed.registerRows) {
      const datasetRows = computed.rawDatasetRows.filter((row) => row.datasetId === dataset.id);
      const replaced = await replaceDamodaranRawDatasetRowsForDataset(dataset.id, datasetRows);
      if (!replaced.ok) {
        throw new Error(replaced.error ?? `Failed replacing raw rows for ${dataset.fileName}`);
      }
    }

    await setDoc(
      doc(db, COLLECTIONS.damodaranImportSummary, IMPORT_SUMMARY_DOC_ID),
      computed.importSummary,
      { merge: true },
    );
  };

  try {
    await persistWithAdmin();
    return { ok: true, summary: computed.importSummary };
  } catch (adminError) {
    try {
      await persistWithClient();
      return {
        ok: true,
        summary: {
          ...computed.importSummary,
          warnings: [
            ...computed.importSummary.warnings,
            "Firebase Admin unavailable; persisted using Firestore client fallback.",
          ],
        },
      };
    } catch (clientError) {
      const adminMessage =
        adminError instanceof Error ? adminError.message : "Unknown admin persistence error.";
      const clientMessage =
        clientError instanceof Error ? clientError.message : "Unknown client persistence error.";
      return {
        ok: true,
        error: `Firestore persistence failed. Admin: ${adminMessage}. Client: ${clientMessage}. Local cache persisted.`,
        summary: {
          ...computed.importSummary,
          warnings: [
            ...computed.importSummary.warnings,
            "Firestore write failed; local data vault cache persisted.",
          ],
        },
      };
    }
  }
}

export async function refreshCanonicalDamodaranIndustryList() {
  const [rawRows, masterRows, coverageRows, cache] = await Promise.all([
    getAllDamodaranRawDatasetRows(),
    getDamodaranIndustryMasterList(),
    getDamodaranCoverageMatrix(),
    readDamodaranDataVaultCache(),
  ]);
  const computed = buildCanonicalDamodaranIndustryList({
    rawRows: rawRows.data,
    masterRows: masterRows.data,
    coverageRows: coverageRows.data,
  });

  const upsertResult = await upsertCanonicalDamodaranIndustries(computed.rows);

  await writeDamodaranDataVaultCache({
    registerRows: cache?.registerRows ?? [],
    industryMasterRows: masterRows.data,
    canonicalIndustryRows: computed.rows,
    coverageRows: coverageRows.data,
    rawDatasetRows: rawRows.data,
    importSummary: cache?.importSummary ?? defaultImportSummary,
  });

  return {
    ok: upsertResult.ok,
    rawIndustryCount: computed.summary.rawIndustryCount,
    canonicalIndustryCount: computed.summary.canonicalIndustryCount,
    variantsExcluded: computed.summary.variantsExcluded,
    nonIndustryExcluded: computed.summary.nonIndustryExcluded,
    readiness: computed.summary.readiness,
    warnings: computed.summary.warnings,
    error: upsertResult.error,
  };
}
