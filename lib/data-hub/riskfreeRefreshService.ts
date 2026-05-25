import "server-only";
import { Timestamp } from "firebase-admin/firestore";
import { getSelectedRiskfreeRate } from "@/lib/data-hub/rateSelectors";
import { fetchLatestFredObservation } from "@/lib/data-hub/fredClient";
import { getAdminDb, isFirebaseAdminConfigured } from "@/lib/firebase/admin";
import { COLLECTIONS } from "@/lib/firestore/collections";
import { riskfreeRateConfigs } from "@/lib/mock-reference-data";
import type { RiskfreeRateRow } from "@/lib/types";

export interface RiskfreeRefreshSummary {
  success: boolean;
  status: string;
  updated: number;
  skipped: number;
  errors: string[];
  warnings: string[];
  lastSuccessfulRefresh: string | null;
  providersUsed: string[];
}

async function loadRiskfreeRows(): Promise<RiskfreeRateRow[]> {
  const db = getAdminDb();

  if (!db) {
    return riskfreeRateConfigs;
  }

  const snapshot = await db.collection(COLLECTIONS.riskfreeRates).get();

  if (snapshot.empty) {
    return riskfreeRateConfigs;
  }

  return snapshot.docs.map((doc) => doc.data() as RiskfreeRateRow);
}

export async function refreshRiskfreeRatesFromFred(): Promise<RiskfreeRefreshSummary> {
  if (!isFirebaseAdminConfigured()) {
    return {
      success: false,
      status: "Firebase Admin not configured",
      updated: 0,
      skipped: 0,
      errors: [],
      warnings: ["Server write unavailable. Configure FIREBASE_ADMIN credentials."],
      lastSuccessfulRefresh: null,
      providersUsed: ["FRED"],
    };
  }

  const db = getAdminDb();

  if (!db) {
    return {
      success: false,
      status: "Firebase Admin not configured",
      updated: 0,
      skipped: 0,
      errors: [],
      warnings: ["Server write unavailable. Admin DB initialization failed."],
      lastSuccessfulRefresh: null,
      providersUsed: ["FRED"],
    };
  }

  const rows = await loadRiskfreeRows();
  let updated = 0;
  let skipped = 0;
  const errors: string[] = [];
  const warnings: string[] = [];
  const nowIso = new Date().toISOString();

  for (const row of rows) {
    if (!row.autoImportEnabled) {
      skipped += 1;
      warnings.push(`${row.currencyCode}: auto import disabled.`);
      continue;
    }

    if (!row.fredSeriesId) {
      skipped += 1;
      const normalizedMissingSeries: RiskfreeRateRow = {
        ...row,
        selectedRiskfreeRate: getSelectedRiskfreeRate(row),
        status: row.manualOverrideRate !== null ? "Manual Override" : "Manual Required / Not Updated",
        notes: "Missing FRED series ID; manual update required.",
      };
      await db.collection(COLLECTIONS.riskfreeRates).doc(row.id).set(normalizedMissingSeries, {
        merge: true,
      });
      continue;
    }

    const fred = await fetchLatestFredObservation(row.fredSeriesId);

    if (!fred.ok || fred.decimalValue === undefined || !fred.observationDate) {
      skipped += 1;
      errors.push(`${row.currencyCode}: ${fred.error ?? "No valid FRED observation."}`);
      const errorStatusRow: RiskfreeRateRow = {
        ...row,
        selectedRiskfreeRate: getSelectedRiskfreeRate(row),
        status: row.manualOverrideRate !== null ? "Manual Override" : "Manual Required / Not Updated",
        notes: `FRED refresh failed: ${fred.error ?? "No valid numeric value."}`,
      };
      await db.collection(COLLECTIONS.riskfreeRates).doc(row.id).set(errorStatusRow, {
        merge: true,
      });
      continue;
    }

    const updatedRow: RiskfreeRateRow = {
      ...row,
      liveRiskfreeRate: fred.decimalValue,
      sourceName: "FRED",
      sourceUrl: fred.sourceUrl ?? row.sourceUrl,
      sourceUpdateDate: fred.observationDate,
      importedLastUpdated: nowIso,
      selectedRiskfreeRate: null,
      status: row.manualOverrideRate !== null ? "Manual Override" : "Auto Updated / OK",
      notes:
        row.manualOverrideRate !== null
          ? "Manual override retained; live FRED value updated in background."
          : "Auto-updated from latest FRED observation.",
    };

    updatedRow.selectedRiskfreeRate = getSelectedRiskfreeRate(updatedRow);

    await db.collection(COLLECTIONS.riskfreeRates).doc(updatedRow.id).set(
      {
        ...updatedRow,
        refreshedAt: Timestamp.fromDate(new Date()),
      },
      { merge: true },
    );
    updated += 1;
  }

  const success = errors.length === 0;

  return {
    success,
    status: success ? "Riskfree Refreshed (FRED)" : "Riskfree Refresh Completed With Errors",
    updated,
    skipped,
    errors,
    warnings,
    lastSuccessfulRefresh: success ? nowIso : null,
    providersUsed: ["FRED"],
  };
}
