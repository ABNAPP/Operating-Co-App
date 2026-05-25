import "server-only";
import { Timestamp } from "firebase-admin/firestore";
import { buildFxPairRowsFromCurrencyMap, getSelectedFxRate } from "@/lib/data-hub/rateSelectors";
import { fetchFxRateFromProviderChain } from "@/lib/data-hub/fx-providers/providerChain";
import { ensureRequiredFxPairsForCompanies } from "@/lib/data-hub/requiredFxPairs";
import { getAdminDb, isFirebaseAdminConfigured } from "@/lib/firebase/admin";
import { COLLECTIONS } from "@/lib/firestore/collections";
import { currencyMapRows, fxRateConfigs } from "@/lib/mock-reference-data";
import type { CurrencyMapRow, FxPairRateRow } from "@/lib/types";

export interface FxRefreshSummary {
  success: boolean;
  status: string;
  updated: number;
  skipped: number;
  manualOverride: number;
  sameCurrency: number;
  errors: string[];
  warnings: string[];
  providersUsed: string[];
  providersFailed: string[];
  providerUsageCounts: Record<string, number>;
  providerAttempts: number;
  startedAt: string;
  finishedAt: string;
  lastSuccessfulRefresh: string | null;
}

export interface FxRefreshBuckets {
  sameCurrencyRows: FxPairRateRow[];
  requiredRows: FxPairRateRow[];
  manualRows: FxPairRateRow[];
  otherReferenceRows: FxPairRateRow[];
}

export function buildFxRefreshBuckets(rows: FxPairRateRow[]): FxRefreshBuckets {
  const getRowPriority = (row: FxPairRateRow) =>
    row.priority ?? (row.requiredByCompany ? 10 : 100);

  const sameCurrencyRows = rows
    .filter((row) => row.fromCurrency === row.toCurrency)
    .sort((a, b) => a.fxPair.localeCompare(b.fxPair));

  const requiredRows = rows
    .filter(
      (row) =>
        row.fromCurrency !== row.toCurrency &&
        row.requiredByCompany &&
        row.manualOverride === null,
    )
    .sort((a, b) => {
      const reverseA = a.purpose === "Reverse / Reference Conversion" ? 1 : 0;
      const reverseB = b.purpose === "Reverse / Reference Conversion" ? 1 : 0;
      if (reverseA !== reverseB) {
        return reverseA - reverseB;
      }
      if (getRowPriority(a) !== getRowPriority(b)) {
        return getRowPriority(a) - getRowPriority(b);
      }
      return a.fxPair.localeCompare(b.fxPair);
    });

  const manualRows = rows
    .filter((row) => row.fromCurrency !== row.toCurrency && row.manualOverride !== null)
    .sort((a, b) => a.fxPair.localeCompare(b.fxPair));

  const otherReferenceRows = rows
    .filter(
      (row) =>
        row.fromCurrency !== row.toCurrency &&
        !row.requiredByCompany &&
        row.manualOverride === null,
    )
    .sort((a, b) => a.fxPair.localeCompare(b.fxPair));

  return {
    sameCurrencyRows,
    requiredRows,
    manualRows,
    otherReferenceRows,
  };
}

export function runFxRefreshBucketQaCheck() {
  const sampleRows: FxPairRateRow[] = [
    {
      id: "fx_USD_USD",
      fromCurrency: "USD",
      toCurrency: "USD",
      fxPair: "USDUSD",
      liveFxRate: 1,
      manualOverride: null,
      selectedFxRate: 1,
      source: "System",
      lastUpdated: new Date().toISOString(),
      status: "OK",
      notes: "Same-currency pair.",
      purpose: "Same Currency",
    },
    {
      id: "fx_CHF_USD",
      fromCurrency: "CHF",
      toCurrency: "USD",
      fxPair: "CHFUSD",
      liveFxRate: null,
      manualOverride: null,
      selectedFxRate: null,
      source: "Required",
      lastUpdated: new Date().toISOString(),
      status: "Currency Review / Not Updated",
      notes: "",
      requiredByCompany: true,
      purpose: "Current Price Conversion",
      priority: 1,
    },
    {
      id: "fx_USD_CHF",
      fromCurrency: "USD",
      toCurrency: "CHF",
      fxPair: "USDCHF",
      liveFxRate: null,
      manualOverride: null,
      selectedFxRate: null,
      source: "Required",
      lastUpdated: new Date().toISOString(),
      status: "Currency Review / Not Updated",
      notes: "",
      requiredByCompany: true,
      purpose: "Reverse / Reference Conversion",
      priority: 2,
    },
    {
      id: "fx_EUR_USD",
      fromCurrency: "EUR",
      toCurrency: "USD",
      fxPair: "EURUSD",
      liveFxRate: null,
      manualOverride: null,
      selectedFxRate: null,
      source: "Reference",
      lastUpdated: new Date().toISOString(),
      status: "Currency Review / Not Updated",
      notes: "",
      requiredByCompany: false,
      purpose: "Reference Pair",
      priority: 100,
    },
  ];

  const buckets = buildFxRefreshBuckets(sampleRows);
  return {
    requiredBeforeReference:
      buckets.requiredRows.length > 0 && buckets.otherReferenceRows.length > 0,
    hasBidirectionalRequiredExample:
      buckets.requiredRows.some((row) => row.fxPair === "CHFUSD") &&
      buckets.requiredRows.some((row) => row.fxPair === "USDCHF"),
    sameCurrencySeparated: buckets.sameCurrencyRows.some((row) => row.fxPair === "USDUSD"),
  };
}

function toFirestoreSafeFxRow(row: FxPairRateRow) {
  return {
    ...row,
    requiredByCompany: row.requiredByCompany ?? false,
    requiredByTickers: row.requiredByTickers ?? [],
    purpose: row.purpose ?? "Reference Pair",
    priority: row.priority ?? 100,
    lastProviderAttempted: row.lastProviderAttempted ?? null,
    providerAttemptCount: row.providerAttemptCount ?? 0,
    refreshSkippedReason: row.refreshSkippedReason ?? null,
    derivedFromPair: row.derivedFromPair ?? null,
    isInverseDerived: row.isInverseDerived ?? false,
  };
}

function getRefreshLimit() {
  const rawLimit = process.env.FX_REFRESH_MAX_PAIRS_PER_RUN;
  const parsed = rawLimit ? Number(rawLimit) : NaN;
  if (Number.isFinite(parsed) && parsed > 0) {
    return Math.floor(parsed);
  }
  return 10;
}

async function loadCurrencyMap(db: ReturnType<typeof getAdminDb>): Promise<CurrencyMapRow[]> {
  if (!db) {
    return currencyMapRows;
  }

  const snapshot = await db.collection(COLLECTIONS.currencyMap).get();
  if (snapshot.empty) {
    return currencyMapRows;
  }
  return snapshot.docs.map((doc) => doc.data() as CurrencyMapRow);
}

async function loadFxPairRows(db: ReturnType<typeof getAdminDb>): Promise<FxPairRateRow[]> {
  if (!db) {
    return fxRateConfigs;
  }

  const snapshot = await db.collection(COLLECTIONS.fxRates).get();
  if (snapshot.empty) {
    return fxRateConfigs;
  }
  return snapshot.docs.map((doc) => doc.data() as FxPairRateRow);
}

export async function refreshFxRatesFromProviderPriority(): Promise<FxRefreshSummary> {
  const startedAt = new Date().toISOString();

  if (!isFirebaseAdminConfigured()) {
    return {
      success: false,
      status: "Firebase Admin not configured",
      updated: 0,
      skipped: 0,
      manualOverride: 0,
      sameCurrency: 0,
      errors: [],
      warnings: ["Server write unavailable. Configure Firebase Admin credentials."],
      providersUsed: [],
      providersFailed: [],
      providerUsageCounts: {},
      providerAttempts: 0,
      startedAt,
      finishedAt: new Date().toISOString(),
      lastSuccessfulRefresh: null,
    };
  }

  const db = getAdminDb();
  if (!db) {
    return {
      success: false,
      status: "Firebase Admin not configured",
      updated: 0,
      skipped: 0,
      manualOverride: 0,
      sameCurrency: 0,
      errors: [],
      warnings: ["Server write unavailable. Admin DB initialization failed."],
      providersUsed: [],
      providersFailed: [],
      providerUsageCounts: {},
      providerAttempts: 0,
      startedAt,
      finishedAt: new Date().toISOString(),
      lastSuccessfulRefresh: null,
    };
  }
  const firestore = db;

  const ensureRequiredPairsSummary = await ensureRequiredFxPairsForCompanies();
  const mapRows = await loadCurrencyMap(db);
  const existingRows = await loadFxPairRows(db);
  const generatedRows = buildFxPairRowsFromCurrencyMap(mapRows);
  const rowMap = new Map<string, FxPairRateRow>();

  for (const row of generatedRows) {
    rowMap.set(row.id, row);
  }

  for (const row of existingRows) {
    rowMap.set(row.id, row);
  }

  const rows = Array.from(rowMap.values());
  const refreshLimit = getRefreshLimit();

  let updated = 0;
  let skipped = 0;
  let manualOverride = 0;
  let sameCurrency = 0;
  let providerCallCount = 0;
  const warnings: string[] = [];
  const errors: string[] = [];
  const providersUsedSet = new Set<string>();
  const providersFailedSet = new Set<string>();
  const providerUsageCounts: Record<string, number> = {};
  const processedRows = new Set<string>();

  if (!ensureRequiredPairsSummary.ok) {
    warnings.push(
      ensureRequiredPairsSummary.error ??
        "Required FX pair ensure step failed before refresh.",
    );
  }

  async function persistRow(row: FxPairRateRow) {
    const firestoreRow = toFirestoreSafeFxRow(row);
    await firestore.collection(COLLECTIONS.fxRates).doc(row.id).set(
      { ...firestoreRow, refreshedAt: Timestamp.fromDate(new Date()) },
      { merge: true },
    );
    rowMap.set(row.id, firestoreRow as FxPairRateRow);
    processedRows.add(firestoreRow.id);
  }

  function canUseInverse(counterpart: FxPairRateRow | undefined) {
    if (!counterpart) {
      return false;
    }

    if (!processedRows.has(counterpart.id)) {
      return false;
    }

    if (counterpart.manualOverride !== null) {
      return false;
    }

    const rate = counterpart.selectedFxRate ?? counterpart.liveFxRate;
    return Boolean(rate && Number.isFinite(rate) && rate > 0);
  }

  async function maybeDeriveReversePair(
    row: FxPairRateRow,
    providerLabel: string,
  ) {
    const reverseId = `fx_${row.toCurrency}_${row.fromCurrency}`;
    const reverseRow = rowMap.get(reverseId);

    if (!reverseRow || reverseRow.id === row.id || reverseRow.manualOverride !== null) {
      return;
    }

    const baseRate = row.selectedFxRate ?? row.liveFxRate;
    if (!baseRate || !Number.isFinite(baseRate) || baseRate <= 0) {
      return;
    }

    const inverseRate = 1 / baseRate;
    if (!Number.isFinite(inverseRate) || inverseRate <= 0) {
      return;
    }

    const derived: FxPairRateRow = {
      ...reverseRow,
      liveFxRate: inverseRate,
      selectedFxRate: inverseRate,
      source: `${providerLabel} inverse`,
      status: "OK",
      notes: `Derived as inverse of ${row.fromCurrency}/${row.toCurrency}.`,
      lastUpdated: new Date().toISOString(),
      derivedFromPair: row.fxPair,
      isInverseDerived: true,
      refreshSkippedReason: undefined,
      lastProviderAttempted: undefined,
    };

    await persistRow(derived);
    updated += 1;
  }

  async function refreshByProvider(row: FxPairRateRow, requiredPair: boolean) {
    if (processedRows.has(row.id)) {
      return;
    }

    const reverseId = `fx_${row.toCurrency}_${row.fromCurrency}`;
    const reverseRow = rowMap.get(reverseId);
    if (canUseInverse(reverseRow)) {
      const inverseSource = reverseRow?.source ?? "Inverse";
      const inverseBaseRate = reverseRow?.selectedFxRate ?? reverseRow?.liveFxRate;
      const inverseRate = inverseBaseRate ? 1 / inverseBaseRate : null;

      if (inverseRate && Number.isFinite(inverseRate) && inverseRate > 0) {
        const derivedRow: FxPairRateRow = {
          ...row,
          liveFxRate: inverseRate,
          selectedFxRate: inverseRate,
          source: `${inverseSource} inverse`,
          status: "OK",
          notes: `Derived as inverse of ${reverseRow?.fromCurrency}/${reverseRow?.toCurrency}.`,
          lastUpdated: new Date().toISOString(),
          derivedFromPair: reverseRow?.fxPair,
          isInverseDerived: true,
          refreshSkippedReason: undefined,
          lastProviderAttempted: undefined,
        };
        await persistRow(derivedRow);
        updated += 1;
        return;
      }
    }

    if (providerCallCount >= refreshLimit) {
      skipped += 1;
      const reason = `Skipped due to FX_REFRESH_MAX_PAIRS_PER_RUN=${refreshLimit}.`;
      const skippedRow: FxPairRateRow = {
        ...row,
        refreshSkippedReason: reason,
        status: row.requiredByCompany
          ? "Currency Review / Not Updated"
          : row.status,
        notes: row.requiredByCompany
          ? "Required pair skipped due to refresh cap."
          : row.notes,
      };
      await persistRow(skippedRow);
      warnings.push(
        requiredPair
          ? `${row.fxPair}: required-by-company pair skipped due to refresh limit.`
          : `${row.fxPair}: ${reason}`,
      );
      return;
    }

    providerCallCount += 1;
    const chain = await fetchFxRateFromProviderChain(row.fromCurrency, row.toCurrency);
    chain.providersUsed.forEach((provider) => providersUsedSet.add(provider));
    chain.providersFailed.forEach((provider) => providersFailedSet.add(provider));
    warnings.push(...chain.warnings.map((w) => `${row.fxPair}: ${w}`));
    errors.push(...chain.errors.map((e) => `${row.fxPair}: ${e}`));

    if (!chain.success || !chain.result?.rate) {
      const fallbackSelected = getSelectedFxRate(row);
      const failed: FxPairRateRow = {
        ...row,
        selectedFxRate: fallbackSelected,
        status:
          fallbackSelected !== null
            ? "Currency Review / Not Updated"
            : "Currency Review / Missing FX",
        notes:
          fallbackSelected !== null
            ? "Provider chain failed; retained previous selected FX rate."
            : "Provider chain failed; no FX rate available.",
        providerAttemptCount: chain.providerAttemptCount,
        lastProviderAttempted: chain.providerAttempts.at(-1),
      };
      await persistRow(failed);
      return;
    }

    const providerLabel = chain.result.providerLabel;
    providerUsageCounts[providerLabel] = (providerUsageCounts[providerLabel] ?? 0) + 1;

    const refreshed: FxPairRateRow = {
      ...row,
      liveFxRate: chain.result.rate,
      selectedFxRate: chain.result.rate,
      source: providerLabel,
      lastUpdated: chain.result.quoteDate ?? new Date().toISOString(),
      status: "OK",
      notes: `Auto-updated from ${providerLabel}.`,
      providerAttemptCount: chain.providerAttemptCount,
      lastProviderAttempted: chain.providerUsed ?? chain.providerAttempts.at(-1),
      refreshSkippedReason: undefined,
      derivedFromPair: undefined,
      isInverseDerived: false,
    };

    await persistRow(refreshed);
    updated += 1;
    await maybeDeriveReversePair(refreshed, providerLabel);
  }

  const { sameCurrencyRows, requiredRows, manualRows, otherReferenceRows } =
    buildFxRefreshBuckets(rows);

  for (const row of sameCurrencyRows) {
    sameCurrency += 1;
    const normalized: FxPairRateRow = {
      ...row,
      liveFxRate: 1,
      selectedFxRate: 1,
      source: "System",
      status: "OK",
      purpose: "Same Currency",
      notes: "Same-currency pair.",
      lastUpdated: new Date().toISOString(),
      providerAttemptCount: 0,
      refreshSkippedReason: undefined,
      lastProviderAttempted: undefined,
      derivedFromPair: undefined,
      isInverseDerived: false,
    };
    await persistRow(normalized);
  }

  for (const row of requiredRows) {
    await refreshByProvider(row, true);
  }

  for (const row of manualRows) {
    if (processedRows.has(row.id)) {
      continue;
    }
    manualOverride += 1;
    const normalized: FxPairRateRow = {
      ...row,
      selectedFxRate: row.manualOverride,
      status: "Manual Override",
      notes: "Manual override is authoritative.",
      lastUpdated: new Date().toISOString(),
      providerAttemptCount: 0,
      refreshSkippedReason: undefined,
      lastProviderAttempted: undefined,
    };
    await persistRow(normalized);
  }

  for (const row of otherReferenceRows) {
    await refreshByProvider(row, false);
  }

  const finishedAt = new Date().toISOString();
  const success = errors.length === 0;

  return {
    success,
    status: success ? "FX Refreshed" : "FX Refresh Completed With Errors",
    updated,
    skipped,
    manualOverride,
    sameCurrency,
    errors,
    warnings,
    providersUsed: Array.from(providersUsedSet),
    providersFailed: Array.from(providersFailedSet),
    providerUsageCounts,
    providerAttempts: providerCallCount,
    startedAt,
    finishedAt,
    lastSuccessfulRefresh: success ? finishedAt : null,
  };
}
