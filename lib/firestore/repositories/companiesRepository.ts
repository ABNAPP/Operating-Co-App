import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
} from "firebase/firestore";
import { getFirestoreDbSafe } from "@/lib/firebase/client";
import { COLLECTIONS } from "@/lib/firestore/collections";
import { recordFirestoreReadAttempt } from "@/lib/firestore/status";
import { getMockCompanyByTicker, mockCompanies } from "@/lib/mock-companies";
import type { CompanyDataModel } from "@/lib/types";

export interface RepositoryResult<T> {
  data: T;
  source: "firestore" | "mock";
  error?: string;
}

export async function getCompanies(): Promise<RepositoryResult<CompanyDataModel[]>> {
  const db = getFirestoreDbSafe();

  if (!db) {
    recordFirestoreReadAttempt(COLLECTIONS.companies, false, "Firestore not initialized.");
    return { data: mockCompanies, source: "mock", error: "Firestore not initialized." };
  }

  try {
    const snapshot = await getDocs(collection(db, COLLECTIONS.companies));
    const companies = snapshot.docs.map((item) => item.data() as CompanyDataModel);

    recordFirestoreReadAttempt(COLLECTIONS.companies, true, `Read ${companies.length} docs.`);

    if (companies.length === 0) {
      return { data: mockCompanies, source: "mock" };
    }

    return { data: companies, source: "firestore" };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown companies read error.";
    recordFirestoreReadAttempt(COLLECTIONS.companies, false, message);
    return { data: mockCompanies, source: "mock", error: message };
  }
}

export async function getCompanyByCleanTicker(
  cleanTicker: string,
): Promise<RepositoryResult<CompanyDataModel | null>> {
  const db = getFirestoreDbSafe();

  if (!db) {
    return {
      data: getMockCompanyByTicker(cleanTicker) ?? null,
      source: "mock",
      error: "Firestore not initialized.",
    };
  }

  try {
    const ref = doc(db, COLLECTIONS.companies, cleanTicker);
    const snapshot = await getDoc(ref);

    recordFirestoreReadAttempt(COLLECTIONS.companies, true, `Lookup ${cleanTicker}.`);

    if (snapshot.exists()) {
      return { data: snapshot.data() as CompanyDataModel, source: "firestore" };
    }

    return { data: getMockCompanyByTicker(cleanTicker) ?? null, source: "mock" };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown company lookup error.";
    recordFirestoreReadAttempt(COLLECTIONS.companies, false, message);
    return {
      data: getMockCompanyByTicker(cleanTicker) ?? null,
      source: "mock",
      error: message,
    };
  }
}

export async function upsertCompany(company: CompanyDataModel): Promise<{ ok: boolean; error?: string }> {
  const db = getFirestoreDbSafe();

  if (!db) {
    return { ok: false, error: "Firestore not initialized." };
  }

  try {
    await setDoc(doc(db, COLLECTIONS.companies, company.identity.cleanTicker), company, {
      merge: true,
    });
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Unknown company upsert error.",
    };
  }
}

export async function seedMockCompanies() {
  const db = getFirestoreDbSafe();

  if (!db) {
    return { ok: false, seeded: 0, error: "Firestore not initialized." };
  }

  try {
    for (const company of mockCompanies) {
      await setDoc(doc(db, COLLECTIONS.companies, company.identity.cleanTicker), company, {
        merge: true,
      });
    }

    return { ok: true, seeded: mockCompanies.length };
  } catch (error) {
    return {
      ok: false,
      seeded: 0,
      error: error instanceof Error ? error.message : "Unknown companies seed error.",
    };
  }
}
