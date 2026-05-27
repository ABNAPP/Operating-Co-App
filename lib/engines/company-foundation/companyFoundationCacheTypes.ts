import type { CompanyFoundationBundleResult } from "@/lib/engines/company-foundation/companyFoundationTypes";
import type { CompanyValuationFoundationBundle } from "@/lib/engines/company-foundation/companyFoundationTypes";

export type FoundationCacheEvent = "HIT" | "MISS" | "STALE" | "BYPASS";

export type FoundationCacheStoreEntry = {
  companyId: string;
  valuationFingerprint: string;
  marketFingerprint: string;
  valuationBundle: CompanyValuationFoundationBundle;
  fullBundle: CompanyFoundationBundleResult;
  cachedAtMs: number;
};

/** Pluggable cache backend — in-memory now; Firestore later without changing engines. */
export interface FoundationBundleCacheStore {
  get(companyId: string): FoundationCacheStoreEntry | undefined;
  set(entry: FoundationCacheStoreEntry): void;
  delete(companyId: string): void;
  clear(): void;
}

export type GetCachedCompanyFoundationBundleOptions = {
  refresh?: boolean;
  referenceDataStamp?: string;
};
