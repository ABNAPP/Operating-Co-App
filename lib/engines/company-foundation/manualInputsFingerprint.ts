import type { PersistedCompanyManualInputs } from "@/lib/types/company-manual-inputs";

export const MANUAL_INPUTS_FINGERPRINT_VERSION = "manual-inputs-v1";

function stableSerialize(value: unknown): string {
  if (value === null || value === undefined) {
    return "null";
  }
  if (typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableSerialize(item)).join(",")}]`;
  }
  const record = value as Record<string, unknown>;
  const keys = Object.keys(record).sort();
  return `{${keys.map((key) => `${JSON.stringify(key)}:${stableSerialize(record[key])}`).join(",")}}`;
}

/**
 * Revision token for persisted manual inputs.
 * Not included in buildValuationFoundationFingerprint until engine wiring is enabled.
 */
export function buildManualInputsRevisionFingerprint(
  manualInputs: PersistedCompanyManualInputs | null | undefined,
): string | null {
  if (!manualInputs) {
    return null;
  }

  const payload = {
    version: MANUAL_INPUTS_FINGERPRINT_VERSION,
    schemaVersion: manualInputs.schemaVersion,
    cleanTicker: manualInputs.cleanTicker,
    savedAt: manualInputs.savedAt,
    wiringStatus: manualInputs.wiringStatus,
    overrides: manualInputs.overrides,
  };

  return stableSerialize(payload);
}

/**
 * Future hook: valuation fingerprint with manual-inputs revision.
 * Part 1 QA only — production cache still uses buildValuationFoundationFingerprint(company, stamp).
 */
export function buildValuationFoundationFingerprintWithManualInputsRevision(
  baseValuationFingerprint: string,
  manualInputsRevision: string | null,
): string {
  return stableSerialize({
    baseValuationFingerprint,
    manualInputsRevision: manualInputsRevision ?? "none",
  });
}

/**
 * Full valuation cache invalidation on save.
 * market_overlay_wired: false — market fingerprint STALE path recomputes MOS only.
 */
export function shouldInvalidateFoundationCacheOnManualInputsSave(
  wiringStatus: PersistedCompanyManualInputs["wiringStatus"],
): boolean {
  return wiringStatus === "engine_wired";
}

export function shouldRecomputeMarketOverlayOnlyOnManualInputsSave(
  wiringStatus: PersistedCompanyManualInputs["wiringStatus"],
): boolean {
  return wiringStatus === "market_overlay_wired";
}
