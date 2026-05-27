import "server-only";

import { getAdminDb, isFirebaseAdminConfigured } from "@/lib/firebase/admin";
import { COLLECTIONS } from "@/lib/firestore/collections";
import type { ValuationResultDocument } from "@/lib/types/valuation-results-firestore";
import type { ValuationDashboardSnapshotDocument } from "@/lib/types/dashboard-snapshot-firestore";
import { upsertValuationResultAdmin } from "@/lib/firestore/repositories/valuationResultsAdminRepository";

export async function upsertValuationDashboardSnapshotAdmin(
  document: ValuationDashboardSnapshotDocument,
): Promise<{ ok: boolean; error?: string }> {
  if (!isFirebaseAdminConfigured()) {
    return {
      ok: false,
      error:
        "Firebase Admin is not configured. Set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY.",
    };
  }

  const db = getAdminDb();
  if (!db) {
    return { ok: false, error: "Firebase Admin Firestore is unavailable." };
  }

  try {
    await db
      .collection(COLLECTIONS.dashboardRows)
      .doc(document.cleanTicker)
      .set(document, { merge: false });
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error ? error.message : "Unknown Admin dashboard snapshot write error.",
    };
  }
}

export async function upsertValuationArtifactsPairAdmin(input: {
  valuationResult: ValuationResultDocument;
  dashboardSnapshot: ValuationDashboardSnapshotDocument;
}): Promise<{ ok: boolean; error?: string }> {
  const valuationWrite = await upsertValuationResultAdmin(input.valuationResult);
  if (!valuationWrite.ok) {
    return valuationWrite;
  }

  return upsertValuationDashboardSnapshotAdmin(input.dashboardSnapshot);
}
