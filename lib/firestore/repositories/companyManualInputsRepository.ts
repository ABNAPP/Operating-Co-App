import { doc, getDoc, setDoc } from "firebase/firestore";
import { getFirestoreDbSafe } from "@/lib/firebase/client";
import { COLLECTIONS } from "@/lib/firestore/collections";
import { recordFirestoreReadAttempt } from "@/lib/firestore/status";
import type { RepositoryResult } from "@/lib/firestore/repositories/companiesRepository";
import {
  readManualInputsFromMemory,
  writeManualInputsToMemory,
} from "@/lib/company-workspace/manualInputsMemoryStore";
import type { PersistedCompanyManualInputs } from "@/lib/types/company-manual-inputs";

export {
  clearManualInputsMemoryStore,
  getManualInputsMemoryStore as getInMemoryManualInputsStore,
} from "@/lib/company-workspace/manualInputsMemoryStore";

export async function readCompanyManualInputsDocument(
  cleanTicker: string,
): Promise<RepositoryResult<PersistedCompanyManualInputs | null>> {
  const normalized = cleanTicker.trim();
  const db = getFirestoreDbSafe();

  if (!db) {
    const cached = readManualInputsFromMemory(normalized);
    return {
      data: cached,
      source: "mock",
      error: cached ? undefined : "Firestore not initialized — using in-memory manual inputs store.",
    };
  }

  try {
    const ref = doc(db, COLLECTIONS.companyInputs, normalized);
    const snapshot = await getDoc(ref);

    recordFirestoreReadAttempt(COLLECTIONS.companyInputs, true, `Lookup manual inputs ${normalized}.`);

    if (snapshot.exists()) {
      return { data: snapshot.data() as PersistedCompanyManualInputs, source: "firestore" };
    }

    const memory = readManualInputsFromMemory(normalized);
    return { data: memory, source: memory ? "mock" : "firestore" };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown company manual inputs read error.";
    recordFirestoreReadAttempt(COLLECTIONS.companyInputs, false, message);
    return {
      data: readManualInputsFromMemory(normalized),
      source: "mock",
      error: message,
    };
  }
}

export async function writeCompanyManualInputsDocument(
  document: PersistedCompanyManualInputs,
): Promise<{ ok: boolean; source: "firestore" | "memory"; error?: string }> {
  const normalized = document.cleanTicker.trim();
  const db = getFirestoreDbSafe();

  writeManualInputsToMemory(document);

  if (!db) {
    return {
      ok: true,
      source: "memory",
      error: "Firestore not initialized — persisted to in-memory manual inputs store only.",
    };
  }

  try {
    await setDoc(doc(db, COLLECTIONS.companyInputs, normalized), document, { merge: true });
    return { ok: true, source: "firestore" };
  } catch (error) {
    return {
      ok: false,
      source: "memory",
      error: error instanceof Error ? error.message : "Unknown company manual inputs write error.",
    };
  }
}
