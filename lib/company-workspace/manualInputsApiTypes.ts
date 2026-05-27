import type { PersistedCompanyManualInputs } from "@/lib/types/company-manual-inputs";

export interface ManualInputsLoadApiResponse {
  ok: boolean;
  data: PersistedCompanyManualInputs | null;
  source: "firestore" | "memory" | "none";
  error: string | null;
}

export interface ManualInputsSaveApiResponse {
  ok: boolean;
  document?: PersistedCompanyManualInputs | null;
  warnings?: string[];
  errors?: string[];
  shouldInvalidateFoundationCache?: boolean;
}
