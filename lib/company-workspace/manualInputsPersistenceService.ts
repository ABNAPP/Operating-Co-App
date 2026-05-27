import "server-only";

import { mergeStoredCompanyWithManualInputs } from "@/lib/company-workspace/mergeStoredCompanyWithManualInputs";
import {
  pruneEmptyOverrides,
  workspaceModelToSavePayload,
} from "@/lib/company-workspace/manualInputsMapping";
import type { ManualInputsWorkspaceModel } from "@/lib/company-workspace/manualInputsWorkspaceModel";
import { sanitizeCompanyManualInputsSavePayload } from "@/lib/company-workspace/manualInputsValidation";
import {
  shouldInvalidateFoundationCacheOnManualInputsSave,
  shouldRecomputeMarketOverlayOnlyOnManualInputsSave,
} from "@/lib/engines/company-foundation/manualInputsFingerprint";
import {
  readCompanyManualInputsDocument,
  writeCompanyManualInputsDocument,
} from "@/lib/firestore/repositories/companyManualInputsRepository";
import type { CompanyDataModel } from "@/lib/types/company";
import {
  COMPANY_MANUAL_INPUTS_SCHEMA_VERSION,
  type CompanyManualInputsSavePayload,
  type ManualInputsLoadResult,
  type ManualInputsSaveResult,
  type PersistedCompanyManualInputs,
} from "@/lib/types/company-manual-inputs";

export { mergeStoredCompanyWithManualInputs } from "@/lib/company-workspace/mergeStoredCompanyWithManualInputs";
export { workspaceModelToSavePayload } from "@/lib/company-workspace/manualInputsMapping";

export async function loadCompanyManualInputs(
  cleanTicker: string,
): Promise<ManualInputsLoadResult> {
  const result = await readCompanyManualInputsDocument(cleanTicker);

  if (!result.data) {
    return {
      data: null,
      source: "none",
      error: result.error,
    };
  }

  return {
    data: result.data,
    source: result.source === "firestore" ? "firestore" : "memory",
    error: result.error,
  };
}

export async function saveCompanyManualInputs(
  cleanTicker: string,
  payload: CompanyManualInputsSavePayload,
  options?: { allowedBenchmarks?: string[] },
): Promise<ManualInputsSaveResult> {
  const sanitized = sanitizeCompanyManualInputsSavePayload(payload, options);

  if (sanitized.errors.length > 0) {
    return {
      ok: false,
      document: null,
      warnings: sanitized.warnings,
      errors: sanitized.errors,
      shouldInvalidateFoundationCache: false,
      shouldRecomputeMarketOverlayOnly: false,
    };
  }

  const overrides = pruneEmptyOverrides(sanitized.payload.overrides);

  if (Object.keys(overrides).length === 0) {
    return {
      ok: false,
      document: null,
      warnings: sanitized.warnings,
      errors: ["No valid manual input overrides to save."],
      shouldInvalidateFoundationCache: false,
      shouldRecomputeMarketOverlayOnly: false,
    };
  }

  const document: PersistedCompanyManualInputs = {
    schemaVersion: COMPANY_MANUAL_INPUTS_SCHEMA_VERSION,
    cleanTicker: cleanTicker.trim(),
    savedAt: new Date().toISOString(),
    source: sanitized.payload.source ?? "user",
    wiringStatus: "market_overlay_wired",
    overrides,
    validationWarnings: sanitized.warnings.length > 0 ? sanitized.warnings : undefined,
  };

  const write = await writeCompanyManualInputsDocument(document);

  if (!write.ok) {
    return {
      ok: false,
      document: null,
      warnings: sanitized.warnings,
      errors: [write.error ?? "Failed to persist manual inputs."],
      shouldInvalidateFoundationCache: false,
      shouldRecomputeMarketOverlayOnly: false,
    };
  }

  return {
    ok: true,
    document,
    warnings: sanitized.warnings,
    errors: [],
    shouldInvalidateFoundationCache: shouldInvalidateFoundationCacheOnManualInputsSave(
      document.wiringStatus,
    ),
    shouldRecomputeMarketOverlayOnly: shouldRecomputeMarketOverlayOnlyOnManualInputsSave(
      document.wiringStatus,
    ),
  };
}

/** Convenience: workspace draft → sanitize → save. */
export async function saveCompanyManualInputsFromWorkspace(
  model: ManualInputsWorkspaceModel,
  options?: { allowedBenchmarks?: string[] },
): Promise<ManualInputsSaveResult> {
  const payload = workspaceModelToSavePayload(model);
  return saveCompanyManualInputs(model.cleanTicker, payload, options);
}

/**
 * Load persisted overrides and merge for display-only surfaces (Inputs tab).
 * Valuation engines should keep using the base company until wiringStatus is engine_wired.
 */
export async function loadCompanyForManualInputsWorkspace(
  company: CompanyDataModel,
): Promise<{
  companyForInputs: CompanyDataModel;
  persisted: PersistedCompanyManualInputs | null;
  loadSource: ManualInputsLoadResult["source"];
}> {
  const loaded = await loadCompanyManualInputs(company.identity.cleanTicker);
  const companyForInputs = mergeStoredCompanyWithManualInputs(company, loaded.data);

  return {
    companyForInputs,
    persisted: loaded.data,
    loadSource: loaded.source,
  };
}
