import { collection, doc, getDocs, setDoc } from "firebase/firestore";
import { getFirestoreDbSafe } from "@/lib/firebase/client";
import { COLLECTIONS } from "@/lib/firestore/collections";
import { recordFirestoreReadAttempt } from "@/lib/firestore/status";
import { dashboardRows } from "@/lib/mock-companies";
import type { DashboardCompanyRow } from "@/lib/types";
import type { RepositoryResult } from "@/lib/firestore/repositories/companiesRepository";

export async function getDashboardRows(): Promise<RepositoryResult<DashboardCompanyRow[]>> {
  const db = getFirestoreDbSafe();

  if (!db) {
    recordFirestoreReadAttempt(
      COLLECTIONS.dashboardRows,
      false,
      "Firestore not initialized.",
    );
    return { data: dashboardRows, source: "mock", error: "Firestore not initialized." };
  }

  try {
    const snapshot = await getDocs(collection(db, COLLECTIONS.dashboardRows));
    const rows = snapshot.docs.map((item) => item.data() as DashboardCompanyRow);

    recordFirestoreReadAttempt(COLLECTIONS.dashboardRows, true, `Read ${rows.length} docs.`);

    if (rows.length === 0) {
      return { data: dashboardRows, source: "mock" };
    }

    return { data: rows, source: "firestore" };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown dashboard read error.";
    recordFirestoreReadAttempt(COLLECTIONS.dashboardRows, false, message);
    return { data: dashboardRows, source: "mock", error: message };
  }
}

export async function upsertDashboardRow(
  row: DashboardCompanyRow,
): Promise<{ ok: boolean; error?: string }> {
  const db = getFirestoreDbSafe();

  if (!db) {
    return { ok: false, error: "Firestore not initialized." };
  }

  try {
    await setDoc(doc(db, COLLECTIONS.dashboardRows, row.ticker), row, { merge: true });
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Unknown dashboard upsert error.",
    };
  }
}

export async function seedMockDashboardRows() {
  const db = getFirestoreDbSafe();

  if (!db) {
    return { ok: false, seeded: 0, error: "Firestore not initialized." };
  }

  try {
    for (const row of dashboardRows) {
      await setDoc(doc(db, COLLECTIONS.dashboardRows, row.ticker), row, { merge: true });
    }

    return { ok: true, seeded: dashboardRows.length };
  } catch (error) {
    return {
      ok: false,
      seeded: 0,
      error: error instanceof Error ? error.message : "Unknown dashboard seed error.",
    };
  }
}
