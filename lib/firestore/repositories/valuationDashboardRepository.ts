import "server-only";

import { collection, doc, getDoc, getDocs, setDoc } from "firebase/firestore";
import { getFirestoreDbSafe } from "@/lib/firebase/client";
import { COLLECTIONS } from "@/lib/firestore/collections";
import { recordFirestoreReadAttempt } from "@/lib/firestore/status";
import type { RepositoryResult } from "@/lib/firestore/repositories/companiesRepository";
import { upsertValuationResult } from "@/lib/firestore/repositories/valuationResultsRepository";
import type { ValuationResultDocument } from "@/lib/types/valuation-results-firestore";
import type { ValuationDashboardSnapshotDocument } from "@/lib/types/dashboard-snapshot-firestore";

export async function getValuationDashboardSnapshots(): Promise<
  RepositoryResult<ValuationDashboardSnapshotDocument[]>
> {
  const db = getFirestoreDbSafe();

  if (!db) {
    recordFirestoreReadAttempt(COLLECTIONS.dashboardRows, false, "Firestore not initialized.");
    return { data: [], source: "mock", error: "Firestore not initialized." };
  }

  try {
    const snapshot = await getDocs(collection(db, COLLECTIONS.dashboardRows));
    const rows = snapshot.docs.map((item) => item.data() as ValuationDashboardSnapshotDocument);

    recordFirestoreReadAttempt(
      COLLECTIONS.dashboardRows,
      true,
      `Read ${rows.length} dashboard snapshot docs.`,
    );

    return { data: rows, source: "firestore" };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown dashboard snapshot read error.";
    recordFirestoreReadAttempt(COLLECTIONS.dashboardRows, false, message);
    return { data: [], source: "mock", error: message };
  }
}

export async function getValuationDashboardSnapshotByCleanTicker(
  cleanTicker: string,
): Promise<RepositoryResult<ValuationDashboardSnapshotDocument | null>> {
  const db = getFirestoreDbSafe();

  if (!db) {
    return { data: null, source: "mock", error: "Firestore not initialized." };
  }

  try {
    const ref = doc(db, COLLECTIONS.dashboardRows, cleanTicker);
    const snapshot = await getDoc(ref);

    recordFirestoreReadAttempt(COLLECTIONS.dashboardRows, true, `Lookup ${cleanTicker}.`);

    if (!snapshot.exists()) {
      return { data: null, source: "firestore" };
    }

    return {
      data: snapshot.data() as ValuationDashboardSnapshotDocument,
      source: "firestore",
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown dashboard snapshot lookup error.";
    recordFirestoreReadAttempt(COLLECTIONS.dashboardRows, false, message);
    return { data: null, source: "mock", error: message };
  }
}

export async function upsertValuationDashboardSnapshot(
  document: ValuationDashboardSnapshotDocument,
): Promise<{ ok: boolean; error?: string }> {
  const db = getFirestoreDbSafe();

  if (!db) {
    return { ok: false, error: "Firestore not initialized." };
  }

  try {
    await setDoc(doc(db, COLLECTIONS.dashboardRows, document.cleanTicker), document, {
      merge: false,
    });
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error ? error.message : "Unknown dashboard snapshot write error.",
    };
  }
}

/**
 * Atomic dual-write helper for Phase B — writes dashboard row + full valuation result.
 * Uses separate writes today; upgrade to Admin batch/transaction when worker lands.
 */
export async function upsertValuationArtifactsPair(input: {
  valuationResult: ValuationResultDocument;
  dashboardSnapshot: ValuationDashboardSnapshotDocument;
}): Promise<{ ok: boolean; error?: string }> {
  const valuationWrite = await upsertValuationResult(input.valuationResult);

  if (!valuationWrite.ok) {
    return valuationWrite;
  }

  return upsertValuationDashboardSnapshot(input.dashboardSnapshot);
}
