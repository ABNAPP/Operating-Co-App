import "server-only";
import { collection, doc, getDoc, getDocs } from "firebase/firestore";
import { calculateRegionalErp } from "@/lib/data-hub/regionalErpCalculator";
import { getAdminDb, isFirebaseAdminConfigured } from "@/lib/firebase/admin";
import { getFirestoreDbSafe } from "@/lib/firebase/client";
import { COLLECTIONS } from "@/lib/firestore/collections";
import {
  countryErpRows,
  countryRegionalGroupMapRows,
  countryRiskErpSourceNotes,
  erpUsageRules,
  mockCountryRiskErpImportStatus,
  regionalErpRows,
  regionalGroupDefinitions,
  weightedErpFormulaGuideRows,
} from "@/lib/mock-reference-data";
import type {
  CountryErpRow,
  CountryRegionalGroupMapRow,
  CountryRiskErpImportStatus,
  CountryRiskErpSourceNote,
  ErpUsageRule,
  RegionalErpRow,
  RegionalGroupDefinition,
  WeightedErpFormulaGuide,
} from "@/lib/types";
import type { RepositoryResult } from "@/lib/firestore/repositories/companiesRepository";

const IMPORT_STATUS_DOC_ID = "country-risk-erp-import-status";

function normalizeCountryName(name: string) {
  return name.trim().toLowerCase();
}

function normalizeRegionLabel(label: string) {
  return label.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_");
}

function buildMapId(countryCode: string | null, countryName: string, regionalGroup: string) {
  const countryKey = countryCode ? countryCode.toUpperCase() : normalizeRegionLabel(countryName);
  return `map_${countryKey}_${normalizeRegionLabel(regionalGroup)}`;
}

interface MappingTemplate {
  regionalGroup: string;
  regionType: string;
  status?: string;
  notes?: string;
}

function getDefaultMappingsForCountry(
  countryName: string,
  countryCode: string | null,
): MappingTemplate[] {
  const key = normalizeCountryName(countryName);
  const rows: MappingTemplate[] = [{ regionalGroup: "Global", regionType: "Global" }];

  const add = (regionalGroup: string, regionType = "Region", status = "OK", notes = "") => {
    rows.push({ regionalGroup, regionType, status, notes });
  };

  if (countryCode === "US" || countryCode === "CA") {
    add("North America");
  }

  if (
    ["sweden", "germany", "united kingdom", "switzerland", "denmark", "norway"].includes(key)
  ) {
    add("Western Europe");
    add("EMEA");
  }

  if (key === "japan") {
    add("Asia");
    add("Asia-Pacific");
  }

  if (key === "united arab emirates") {
    add("Asia");
    add("Asia-Pacific");
    add("EMEA");
    add("Middle East");
    add("Emerging Markets", "Market Class", "Review", "Classification can vary by policy.");
  }

  if (key === "mexico") {
    add("Central America", "Region", "Review", "Regional classification may vary by policy.");
    add("North America", "Region", "Review", "Business/geography classification may vary.");
    add("Emerging Markets", "Market Class");
  }

  if (key === "australia") {
    add("Oceania");
    add("Asia-Pacific");
    add("Australia & NZ");
  }

  if (key === "new zealand") {
    add("Oceania");
    add("Asia-Pacific");
    add("Australia & NZ");
  }

  if (key === "brazil") {
    add("South America");
    add("Emerging Markets", "Market Class");
  }

  if (key === "south africa") {
    add("Africa");
    add("EMEA");
    add("Emerging Markets", "Market Class");
  }

  return rows;
}

async function getCollectionRows<T>(
  collectionName: string,
  mockRows: T[],
): Promise<RepositoryResult<T[]>> {
  const adminDb = getAdminDb();
  if (isFirebaseAdminConfigured() && adminDb) {
    try {
      const snapshot = await adminDb.collection(collectionName).get();
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
    return { data: mockRows, source: "mock", error: "Firestore not initialized." };
  }

  try {
    const snapshot = await getDocs(collection(db, collectionName));
    const rows = snapshot.docs.map((item) => item.data() as T);
    if (rows.length === 0) {
      return { data: mockRows, source: "mock" };
    }
    return { data: rows, source: "firestore" };
  } catch (error) {
    return {
      data: mockRows,
      source: "mock",
      error: error instanceof Error ? error.message : "Unknown collection read error.",
    };
  }
}

async function upsertAdminRow<T extends { id: string }>(
  collectionName: string,
  row: T,
): Promise<{ ok: boolean; error?: string }> {
  const adminDb = getAdminDb();
  if (!isFirebaseAdminConfigured() || !adminDb) {
    return { ok: false, error: "Firebase Admin not configured." };
  }

  try {
    await adminDb.collection(collectionName).doc(row.id).set(row, { merge: true });
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Unknown admin upsert error.",
    };
  }
}

async function seedAdminRows<T extends { id: string }>(
  collectionName: string,
  rows: T[],
): Promise<{ ok: boolean; seeded: number; error?: string }> {
  const adminDb = getAdminDb();
  if (!isFirebaseAdminConfigured() || !adminDb) {
    return { ok: false, seeded: 0, error: "Firebase Admin not configured." };
  }

  try {
    for (const row of rows) {
      await adminDb.collection(collectionName).doc(row.id).set(row, { merge: true });
    }
    return { ok: true, seeded: rows.length };
  } catch (error) {
    return {
      ok: false,
      seeded: 0,
      error: error instanceof Error ? error.message : "Unknown admin seed error.",
    };
  }
}

export async function getCountryErpRows(): Promise<RepositoryResult<CountryErpRow[]>> {
  return getCollectionRows<CountryErpRow>(COLLECTIONS.countryErpRows, countryErpRows);
}

export async function getCountryErpByCountryCode(
  countryCode: string,
): Promise<RepositoryResult<CountryErpRow | null>> {
  const rows = await getCountryErpRows();
  return {
    data:
      rows.data.find(
        (row) => row.countryCode?.toUpperCase() === countryCode.toUpperCase(),
      ) ?? null,
    source: rows.source,
    error: rows.error,
  };
}

export async function getCountryErpByCountryName(
  countryName: string,
): Promise<RepositoryResult<CountryErpRow | null>> {
  const rows = await getCountryErpRows();
  return {
    data:
      rows.data.find(
        (row) => row.countryName.trim().toLowerCase() === countryName.trim().toLowerCase(),
      ) ?? null,
    source: rows.source,
    error: rows.error,
  };
}

export async function upsertCountryErpRow(row: CountryErpRow) {
  return upsertAdminRow(COLLECTIONS.countryErpRows, row);
}

export async function seedCountryErpRows(rows: CountryErpRow[]) {
  return seedAdminRows(COLLECTIONS.countryErpRows, rows);
}

export async function getRegionalErpRows(): Promise<RepositoryResult<RegionalErpRow[]>> {
  const rows = await getCollectionRows<RegionalErpRow>(COLLECTIONS.regionalErpRows, regionalErpRows);
  if (rows.data.length > 0) {
    return rows;
  }

  const calculated = calculateRegionalErp(
    countryErpRows,
    countryRegionalGroupMapRows,
    regionalGroupDefinitions,
  );
  return { data: calculated, source: "mock", error: rows.error };
}

export async function upsertRegionalErpRow(row: RegionalErpRow) {
  return upsertAdminRow(COLLECTIONS.regionalErpRows, row);
}

export async function seedRegionalErpRows(rows: RegionalErpRow[]) {
  return seedAdminRows(COLLECTIONS.regionalErpRows, rows);
}

export async function getCountryRegionalGroupMap(): Promise<
  RepositoryResult<CountryRegionalGroupMapRow[]>
> {
  return getCollectionRows<CountryRegionalGroupMapRow>(
    COLLECTIONS.countryRegionalGroupMap,
    countryRegionalGroupMapRows,
  );
}

export async function seedCountryRegionalGroupMap(rows: CountryRegionalGroupMapRow[]) {
  return seedAdminRows(COLLECTIONS.countryRegionalGroupMap, rows);
}

export async function regenerateDefaultCountryRegionalGroupMap({
  countryRows,
  preserveExisting = true,
}: {
  countryRows: CountryErpRow[];
  preserveExisting?: boolean;
}) {
  const adminDb = getAdminDb();
  if (!isFirebaseAdminConfigured() || !adminDb) {
    return {
      ok: false,
      created: 0,
      updated: 0,
      mergedTotal: 0,
      error: "Firebase Admin not configured.",
    };
  }

  const existingSnapshot = await adminDb.collection(COLLECTIONS.countryRegionalGroupMap).get();
  const existingRows = existingSnapshot.docs.map((doc) => doc.data() as CountryRegionalGroupMapRow);
  const merged = new Map<string, CountryRegionalGroupMapRow>();

  if (preserveExisting) {
    for (const row of existingRows) {
      merged.set(row.id, row);
    }
  }

  let created = 0;
  let updated = 0;

  for (const country of countryRows) {
    const mappings = getDefaultMappingsForCountry(country.countryName, country.countryCode);

    for (const mapping of mappings) {
      const id = buildMapId(country.countryCode, country.countryName, mapping.regionalGroup);
      const candidate: CountryRegionalGroupMapRow = {
        id,
        countryName: country.countryName,
        countryCode: country.countryCode,
        regionalGroup: mapping.regionalGroup,
        regionType: mapping.regionType,
        active: true,
        sourceMethod: "Default generator",
        status: mapping.status ?? "OK",
        notes: mapping.notes ?? "",
      };

      const exists = merged.get(id);
      if (exists && preserveExisting) {
        continue;
      }

      merged.set(id, candidate);
      if (exists) {
        updated += 1;
      } else {
        created += 1;
      }
    }
  }

  for (const row of merged.values()) {
    await adminDb.collection(COLLECTIONS.countryRegionalGroupMap).doc(row.id).set(row, {
      merge: true,
    });
  }

  return {
    ok: true,
    created,
    updated,
    mergedTotal: merged.size,
  };
}

export async function getRegionalGroupDefinitions(): Promise<
  RepositoryResult<RegionalGroupDefinition[]>
> {
  return getCollectionRows<RegionalGroupDefinition>(
    COLLECTIONS.regionalGroupDefinitions,
    regionalGroupDefinitions,
  );
}

export async function seedRegionalGroupDefinitions(rows: RegionalGroupDefinition[]) {
  return seedAdminRows(COLLECTIONS.regionalGroupDefinitions, rows);
}

export async function ensureDefaultRegionalGroupDefinitions() {
  const existing = await getRegionalGroupDefinitions();
  if (existing.data.length > 0) {
    return { ok: true, seeded: 0, skipped: existing.data.length };
  }

  const seed = await seedRegionalGroupDefinitions(regionalGroupDefinitions);
  return {
    ok: seed.ok,
    seeded: seed.seeded,
    skipped: 0,
    error: seed.error,
  };
}

export async function getCountryRiskErpSourceNotes(): Promise<
  RepositoryResult<CountryRiskErpSourceNote[]>
> {
  return getCollectionRows<CountryRiskErpSourceNote>(
    COLLECTIONS.countryRiskErpSourceNotes,
    countryRiskErpSourceNotes,
  );
}

export async function upsertCountryRiskErpSourceNote(note: CountryRiskErpSourceNote) {
  return upsertAdminRow(COLLECTIONS.countryRiskErpSourceNotes, note);
}

export async function getErpUsageRules(): Promise<RepositoryResult<ErpUsageRule[]>> {
  return getCollectionRows<ErpUsageRule>(COLLECTIONS.erpUsageRules, erpUsageRules);
}

export async function seedErpUsageRules(rows: ErpUsageRule[]) {
  return seedAdminRows(COLLECTIONS.erpUsageRules, rows);
}

export async function getWeightedErpFormulaGuide(): Promise<
  RepositoryResult<WeightedErpFormulaGuide[]>
> {
  return getCollectionRows<WeightedErpFormulaGuide>(
    COLLECTIONS.weightedErpFormulaGuide,
    weightedErpFormulaGuideRows,
  );
}

export async function seedWeightedErpFormulaGuide(rows: WeightedErpFormulaGuide[]) {
  return seedAdminRows(COLLECTIONS.weightedErpFormulaGuide, rows);
}

export async function getCountryRiskErpImportStatus(): Promise<
  RepositoryResult<CountryRiskErpImportStatus>
> {
  const adminDb = getAdminDb();
  if (isFirebaseAdminConfigured() && adminDb) {
    try {
      const snapshot = await adminDb
        .collection(COLLECTIONS.countryRiskErpImportStatus)
        .doc(IMPORT_STATUS_DOC_ID)
        .get();
      if (snapshot.exists) {
        return { data: snapshot.data() as CountryRiskErpImportStatus, source: "firestore" };
      }
    } catch {
      // continue to client fallback
    }
  }

  const db = getFirestoreDbSafe();
  if (!db) {
    return {
      data: mockCountryRiskErpImportStatus,
      source: "mock",
      error: "Firestore not initialized.",
    };
  }

  try {
    const snapshot = await getDoc(
      doc(db, COLLECTIONS.countryRiskErpImportStatus, IMPORT_STATUS_DOC_ID),
    );
    if (!snapshot.exists()) {
      return { data: mockCountryRiskErpImportStatus, source: "mock" };
    }
    return { data: snapshot.data() as CountryRiskErpImportStatus, source: "firestore" };
  } catch (error) {
    return {
      data: mockCountryRiskErpImportStatus,
      source: "mock",
      error: error instanceof Error ? error.message : "Unknown import status read error.",
    };
  }
}

export async function updateCountryRiskErpImportStatus(status: CountryRiskErpImportStatus) {
  return upsertAdminRow(COLLECTIONS.countryRiskErpImportStatus, {
    ...status,
    id: IMPORT_STATUS_DOC_ID,
  });
}

export async function seedCountryRiskErpModuleDefaults() {
  const seeded: Array<{ name: string; count: number }> = [];
  const errors: string[] = [];

  const countrySeed = await seedCountryErpRows(countryErpRows);
  if (countrySeed.ok) seeded.push({ name: "countryErpRows", count: countrySeed.seeded });
  else if (countrySeed.error) errors.push(countrySeed.error);

  const mapSeed = await seedCountryRegionalGroupMap(countryRegionalGroupMapRows);
  if (mapSeed.ok) seeded.push({ name: "countryRegionalGroupMap", count: mapSeed.seeded });
  else if (mapSeed.error) errors.push(mapSeed.error);

  const defSeed = await seedRegionalGroupDefinitions(regionalGroupDefinitions);
  if (defSeed.ok) seeded.push({ name: "regionalGroupDefinitions", count: defSeed.seeded });
  else if (defSeed.error) errors.push(defSeed.error);

  const notesSeed = await seedAdminRows(
    COLLECTIONS.countryRiskErpSourceNotes,
    countryRiskErpSourceNotes,
  );
  if (notesSeed.ok) seeded.push({ name: "countryRiskErpSourceNotes", count: notesSeed.seeded });
  else if (notesSeed.error) errors.push(notesSeed.error);

  const rulesSeed = await seedErpUsageRules(erpUsageRules);
  if (rulesSeed.ok) seeded.push({ name: "erpUsageRules", count: rulesSeed.seeded });
  else if (rulesSeed.error) errors.push(rulesSeed.error);

  const guideSeed = await seedWeightedErpFormulaGuide(weightedErpFormulaGuideRows);
  if (guideSeed.ok) seeded.push({ name: "weightedErpFormulaGuide", count: guideSeed.seeded });
  else if (guideSeed.error) errors.push(guideSeed.error);

  const regionalCalculated = calculateRegionalErp(
    countryErpRows,
    countryRegionalGroupMapRows,
    regionalGroupDefinitions,
  );
  const regionalSeed = await seedRegionalErpRows(regionalCalculated);
  if (regionalSeed.ok) seeded.push({ name: "regionalErpRows", count: regionalSeed.seeded });
  else if (regionalSeed.error) errors.push(regionalSeed.error);

  return {
    ok: errors.length === 0,
    seeded,
    errors,
  };
}
