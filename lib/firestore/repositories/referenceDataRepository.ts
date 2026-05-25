import { collection, doc, getDoc, getDocs, setDoc } from "firebase/firestore";
import { getFirestoreDbSafe } from "@/lib/firebase/client";
import { COLLECTIONS } from "@/lib/firestore/collections";
import { recordFirestoreReadAttempt } from "@/lib/firestore/status";
import {
  apiProviderConfigs,
  betaReferenceData,
  currencyMapRows,
  damodaranDataSections,
  forecastFadeRules,
  fxRateConfigs,
  mockDailyRefreshStatus,
  riskfreeRateConfigs,
  sectorIndustryMappings,
} from "@/lib/mock-reference-data";
import type {
  CurrencyCode,
  CurrencyMapRow,
  DailyRefreshStatus,
  FxPairRateRow,
  RiskfreeRateRow,
} from "@/lib/types";
import type { RepositoryResult } from "@/lib/firestore/repositories/companiesRepository";
import {
  buildFxPairRowsFromCurrencyMap,
  getFxStatus,
  getRiskfreeStatus,
  getSelectedFxRate,
  getSelectedRiskfreeRate,
} from "@/lib/data-hub/rateSelectors";

export interface ReferenceDataSummary {
  mode: "mock" | "firestore";
  riskfreeRates: number;
  currencyMap: number;
  fxRates: number;
  damodaranData: number;
  sectorIndustryMapping: number;
  betaReferenceData: number;
  forecastFadeRules: number;
  apiProviderConfigs: number;
}

const mockSummary: ReferenceDataSummary = {
  mode: "mock",
  riskfreeRates: riskfreeRateConfigs.length,
  currencyMap: currencyMapRows.length,
  fxRates: fxRateConfigs.length,
  damodaranData: damodaranDataSections.length,
  sectorIndustryMapping: sectorIndustryMappings.length,
  betaReferenceData: betaReferenceData.length,
  forecastFadeRules: forecastFadeRules.length,
  apiProviderConfigs: apiProviderConfigs.length,
};

async function countCollection(path: string) {
  const db = getFirestoreDbSafe();

  if (!db) {
    return 0;
  }

  const snapshot = await getDocs(collection(db, path));
  return snapshot.size;
}

const DAILY_REFRESH_STATUS_DOC_ID = "daily-refresh-status";

export async function getReferenceDataSummary(): Promise<RepositoryResult<ReferenceDataSummary>> {
  const db = getFirestoreDbSafe();

  if (!db) {
    recordFirestoreReadAttempt(
      COLLECTIONS.referenceData,
      false,
      "Firestore not initialized.",
    );
    return { data: mockSummary, source: "mock", error: "Firestore not initialized." };
  }

  try {
    const summary: ReferenceDataSummary = {
      mode: "firestore",
      riskfreeRates: await countCollection(COLLECTIONS.riskfreeRates),
      currencyMap: await countCollection(COLLECTIONS.currencyMap),
      fxRates: await countCollection(COLLECTIONS.fxRates),
      damodaranData: await countCollection(COLLECTIONS.damodaranData),
      sectorIndustryMapping: await countCollection(COLLECTIONS.sectorIndustryMapping),
      betaReferenceData: await countCollection(COLLECTIONS.betaReferenceData),
      forecastFadeRules: await countCollection(COLLECTIONS.forecastFadeRules),
      apiProviderConfigs: await countCollection(COLLECTIONS.apiProviderConfigs),
    };

    recordFirestoreReadAttempt(COLLECTIONS.referenceData, true, "Reference summary loaded.");

    const hasAnyData = Object.values(summary).some(
      (value) => typeof value === "number" && value > 0,
    );

    if (!hasAnyData) {
      return { data: mockSummary, source: "mock" };
    }

    return { data: summary, source: "firestore" };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown reference summary error.";
    recordFirestoreReadAttempt(COLLECTIONS.referenceData, false, message);
    return { data: mockSummary, source: "mock", error: message };
  }
}

export async function getRiskfreeRates(): Promise<RepositoryResult<RiskfreeRateRow[]>> {
  const db = getFirestoreDbSafe();

  if (!db) {
    return { data: riskfreeRateConfigs, source: "mock", error: "Firestore not initialized." };
  }

  try {
    const snapshot = await getDocs(collection(db, COLLECTIONS.riskfreeRates));
    const rows = snapshot.docs.map((item) => item.data() as RiskfreeRateRow);

    if (rows.length === 0) {
      return { data: riskfreeRateConfigs, source: "mock" };
    }

    return { data: rows, source: "firestore" };
  } catch (error) {
    return {
      data: riskfreeRateConfigs,
      source: "mock",
      error: error instanceof Error ? error.message : "Unknown riskfree read error.",
    };
  }
}

export async function getFxRates(): Promise<RepositoryResult<FxPairRateRow[]>> {
  const db = getFirestoreDbSafe();

  if (!db) {
    return { data: fxRateConfigs, source: "mock", error: "Firestore not initialized." };
  }

  try {
    const snapshot = await getDocs(collection(db, COLLECTIONS.fxRates));
    const rows = snapshot.docs.map((item) => item.data() as FxPairRateRow);

    if (rows.length === 0) {
      return { data: fxRateConfigs, source: "mock" };
    }

    return { data: rows, source: "firestore" };
  } catch (error) {
    return {
      data: fxRateConfigs,
      source: "mock",
      error: error instanceof Error ? error.message : "Unknown FX read error.",
    };
  }
}

export async function getRiskfreeRateByCurrency(currencyCode: CurrencyCode) {
  const { data, source, error } = await getRiskfreeRates();
  return {
    data: data.find((row) => row.currencyCode === currencyCode) ?? null,
    source,
    error,
  };
}

export async function upsertRiskfreeRate(
  row: RiskfreeRateRow,
): Promise<{ ok: boolean; error?: string }> {
  const db = getFirestoreDbSafe();

  if (!db) {
    return { ok: false, error: "Firestore not initialized." };
  }

  try {
    const normalizedRow: RiskfreeRateRow = {
      ...row,
      selectedRiskfreeRate: getSelectedRiskfreeRate(row),
      status: getRiskfreeStatus(row),
    };
    await setDoc(doc(db, COLLECTIONS.riskfreeRates, normalizedRow.id), normalizedRow, {
      merge: true,
    });
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Unknown riskfree upsert error.",
    };
  }
}

export async function seedDefaultRiskfreeRates() {
  const db = getFirestoreDbSafe();

  if (!db) {
    return { ok: false, seeded: 0, error: "Firestore not initialized." };
  }

  try {
    let seeded = 0;

    for (const row of riskfreeRateConfigs) {
      await upsertRiskfreeRate(row);
      seeded++;
    }

    return { ok: true, seeded };
  } catch (error) {
    return {
      ok: false,
      seeded: 0,
      error: error instanceof Error ? error.message : "Unknown riskfree seed error.",
    };
  }
}

export async function getCurrencyMap(): Promise<RepositoryResult<CurrencyMapRow[]>> {
  const db = getFirestoreDbSafe();

  if (!db) {
    return { data: currencyMapRows, source: "mock", error: "Firestore not initialized." };
  }

  try {
    const snapshot = await getDocs(collection(db, COLLECTIONS.currencyMap));
    const rows = snapshot.docs.map((item) => item.data() as CurrencyMapRow);

    if (rows.length === 0) {
      return { data: currencyMapRows, source: "mock" };
    }

    return { data: rows, source: "firestore" };
  } catch (error) {
    return {
      data: currencyMapRows,
      source: "mock",
      error: error instanceof Error ? error.message : "Unknown currency map read error.",
    };
  }
}

export async function upsertCurrencyMapRow(
  row: CurrencyMapRow,
): Promise<{ ok: boolean; error?: string }> {
  const db = getFirestoreDbSafe();

  if (!db) {
    return { ok: false, error: "Firestore not initialized." };
  }

  try {
    await setDoc(doc(db, COLLECTIONS.currencyMap, row.id), row, { merge: true });
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Unknown currency map upsert error.",
    };
  }
}

export async function seedDefaultCurrencyMap() {
  const db = getFirestoreDbSafe();

  if (!db) {
    return { ok: false, seeded: 0, error: "Firestore not initialized." };
  }

  try {
    let seeded = 0;

    for (const row of currencyMapRows) {
      await upsertCurrencyMapRow(row);
      seeded++;
    }

    return { ok: true, seeded };
  } catch (error) {
    return {
      ok: false,
      seeded: 0,
      error: error instanceof Error ? error.message : "Unknown currency map seed error.",
    };
  }
}

export async function getFxPairRates(): Promise<RepositoryResult<FxPairRateRow[]>> {
  return getFxRates();
}

export async function getFxPairRate(fromCurrency: CurrencyCode, toCurrency: CurrencyCode) {
  const { data, source, error } = await getFxPairRates();
  return {
    data:
      data.find(
        (row) => row.fromCurrency === fromCurrency && row.toCurrency === toCurrency,
      ) ?? null,
    source,
    error,
  };
}

export async function upsertFxPairRate(
  row: FxPairRateRow,
): Promise<{ ok: boolean; error?: string }> {
  const db = getFirestoreDbSafe();

  if (!db) {
    return { ok: false, error: "Firestore not initialized." };
  }

  try {
    const normalizedRow: FxPairRateRow = {
      ...row,
      selectedFxRate: getSelectedFxRate(row),
      status: getFxStatus(row),
    };
    await setDoc(doc(db, COLLECTIONS.fxRates, normalizedRow.id), normalizedRow, {
      merge: true,
    });
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Unknown FX pair upsert error.",
    };
  }
}

export async function seedDefaultFxPairsFromCurrencyMap() {
  const db = getFirestoreDbSafe();

  if (!db) {
    return { ok: false, seeded: 0, error: "Firestore not initialized." };
  }

  try {
    const { data: mapRows } = await getCurrencyMap();
    const generatedRows = buildFxPairRowsFromCurrencyMap(mapRows);
    let seeded = 0;

    for (const row of generatedRows) {
      await upsertFxPairRate(row);
      seeded++;
    }

    return { ok: true, seeded };
  } catch (error) {
    return {
      ok: false,
      seeded: 0,
      error: error instanceof Error ? error.message : "Unknown FX pair seed error.",
    };
  }
}

export async function getDailyRefreshStatus(): Promise<RepositoryResult<DailyRefreshStatus>> {
  const db = getFirestoreDbSafe();

  if (!db) {
    return { data: mockDailyRefreshStatus, source: "mock", error: "Firestore not initialized." };
  }

  try {
    const snapshot = await getDoc(doc(db, COLLECTIONS.settings, DAILY_REFRESH_STATUS_DOC_ID));

    if (!snapshot.exists()) {
      return { data: mockDailyRefreshStatus, source: "mock" };
    }

    return { data: snapshot.data() as DailyRefreshStatus, source: "firestore" };
  } catch (error) {
    return {
      data: mockDailyRefreshStatus,
      source: "mock",
      error: error instanceof Error ? error.message : "Unknown refresh status read error.",
    };
  }
}

export async function upsertDailyRefreshStatus(
  status: DailyRefreshStatus,
): Promise<{ ok: boolean; error?: string }> {
  const db = getFirestoreDbSafe();

  if (!db) {
    return { ok: false, error: "Firestore not initialized." };
  }

  try {
    await setDoc(doc(db, COLLECTIONS.settings, DAILY_REFRESH_STATUS_DOC_ID), status, {
      merge: true,
    });
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Unknown refresh status upsert error.",
    };
  }
}

export async function seedMockReferenceData() {
  const db = getFirestoreDbSafe();

  if (!db) {
    return { ok: false, seeded: 0, error: "Firestore not initialized." };
  }

  try {
    let seeded = 0;

    const seededRiskfree = await seedDefaultRiskfreeRates();
    seeded += seededRiskfree.seeded;

    const seededCurrencyMap = await seedDefaultCurrencyMap();
    seeded += seededCurrencyMap.seeded;

    const seededFxPairs = await seedDefaultFxPairsFromCurrencyMap();
    seeded += seededFxPairs.seeded;

    for (const [index, item] of damodaranDataSections.entries()) {
      await setDoc(doc(db, COLLECTIONS.damodaranData, `${item.sectionName}-${index}`), item, {
        merge: true,
      });
      seeded++;
    }

    for (const [index, item] of sectorIndustryMappings.entries()) {
      await setDoc(
        doc(db, COLLECTIONS.sectorIndustryMapping, `${item.internalIndustryName}-${index}`),
        item,
        { merge: true },
      );
      seeded++;
    }

    for (const [index, item] of betaReferenceData.entries()) {
      await setDoc(doc(db, COLLECTIONS.betaReferenceData, `${item.industry}-${index}`), item, {
        merge: true,
      });
      seeded++;
    }

    for (const [index, item] of forecastFadeRules.entries()) {
      await setDoc(doc(db, COLLECTIONS.forecastFadeRules, `${item.ruleSetName}-${index}`), item, {
        merge: true,
      });
      seeded++;
    }

    for (const [index, item] of apiProviderConfigs.entries()) {
      await setDoc(doc(db, COLLECTIONS.apiProviderConfigs, `${item.provider}-${index}`), item, {
        merge: true,
      });
      seeded++;
    }

    return { ok: true, seeded };
  } catch (error) {
    return {
      ok: false,
      seeded: 0,
      error: error instanceof Error ? error.message : "Unknown reference seed error.",
    };
  }
}
