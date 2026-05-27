import "server-only";

import { doc, getDoc, setDoc } from "firebase/firestore";
import { getFirestoreDbSafe } from "@/lib/firebase/client";
import { COLLECTIONS } from "@/lib/firestore/collections";
import { recordFirestoreReadAttempt } from "@/lib/firestore/status";
import type { RepositoryResult } from "@/lib/firestore/repositories/companiesRepository";
import type { ValuationResultDocument } from "@/lib/types/valuation-results-firestore";

export async function getValuationResultByCleanTicker(
  cleanTicker: string,
): Promise<RepositoryResult<ValuationResultDocument | null>> {
  const db = getFirestoreDbSafe();

  if (!db) {
    recordFirestoreReadAttempt(
      COLLECTIONS.valuationResults,
      false,
      "Firestore not initialized.",
    );
    return {
      data: null,
      source: "mock",
      error: "Firestore not initialized.",
    };
  }

  try {
    const ref = doc(db, COLLECTIONS.valuationResults, cleanTicker);
    const snapshot = await getDoc(ref);

    recordFirestoreReadAttempt(
      COLLECTIONS.valuationResults,
      true,
      `Lookup ${cleanTicker}.`,
    );

    if (!snapshot.exists()) {
      return { data: null, source: "firestore" };
    }

    return {
      data: snapshot.data() as ValuationResultDocument,
      source: "firestore",
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown valuation result read error.";
    recordFirestoreReadAttempt(COLLECTIONS.valuationResults, false, message);
    return { data: null, source: "mock", error: message };
  }
}

/**
 * Persists a valuation result document. Phase B workers should use Admin SDK;
 * this client write path supports dev/manual seed until workers land.
 */
export async function upsertValuationResult(
  document: ValuationResultDocument,
): Promise<{ ok: boolean; error?: string }> {
  const db = getFirestoreDbSafe();

  if (!db) {
    return { ok: false, error: "Firestore not initialized." };
  }

  try {
    await setDoc(doc(db, COLLECTIONS.valuationResults, document.cleanTicker), document, {
      merge: false,
    });
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Unknown valuation result write error.",
    };
  }
}
