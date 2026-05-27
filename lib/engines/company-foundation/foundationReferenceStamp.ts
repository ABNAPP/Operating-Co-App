import "server-only";

import { getCountryRiskErpImportStatus } from "@/lib/firestore/repositories/countryRiskErpRepository";
import { getRiskfreeRates } from "@/lib/firestore/repositories/referenceDataRepository";
import { FOUNDATION_ENGINE_VERSION } from "@/lib/engines/company-foundation/companyFoundationFingerprint";

const REFERENCE_STAMP_TTL_MS = 5 * 60 * 1000;

let cachedStamp: { value: string; expiresAtMs: number } | null = null;

function maxIsoDate(dates: string[]): string {
  return dates.reduce((max, date) => (date > max ? date : max), "");
}

/**
 * Lightweight reference-data version for foundation cache fingerprints.
 * Cached in-process for a few minutes to avoid Firestore reads on every page load.
 */
export async function resolveFoundationReferenceDataStamp(): Promise<string> {
  const envOverride = process.env.COMPANY_FOUNDATION_REFERENCE_STAMP?.trim();
  if (envOverride) {
    return `${FOUNDATION_ENGINE_VERSION}|env:${envOverride}`;
  }

  const now = Date.now();
  if (cachedStamp && now < cachedStamp.expiresAtMs) {
    return cachedStamp.value;
  }

  const parts = [FOUNDATION_ENGINE_VERSION];

  try {
    const [riskfreeResult, erpImportResult] = await Promise.all([
      getRiskfreeRates(),
      getCountryRiskErpImportStatus(),
    ]);

    const riskfreeUpdated = maxIsoDate(
      riskfreeResult.data
        .flatMap((row) => [row.importedLastUpdated, row.sourceUpdateDate])
        .filter((value): value is string => Boolean(value)),
    );
    parts.push(`riskfree:${riskfreeResult.source}:${riskfreeUpdated || "none"}`);

    const erpStatus = erpImportResult.data;
    parts.push(
      `erp:${erpImportResult.source}:${erpStatus?.importedLastUpdated ?? erpStatus?.sourceUpdateDate ?? erpStatus?.status ?? "none"}`,
    );
  } catch {
    parts.push("reference:fallback");
  }

  const value = parts.join("|");
  cachedStamp = { value, expiresAtMs: now + REFERENCE_STAMP_TTL_MS };
  return value;
}

export function resetFoundationReferenceStampCacheForTests(): void {
  cachedStamp = null;
}
