import type { PersistedCompanyManualInputs } from "../types/company-manual-inputs.ts";

/** Dev/QA in-memory fallback when Firestore is unavailable. */
const memoryStore = new Map<string, PersistedCompanyManualInputs>();

export function getManualInputsMemoryStore(): Map<string, PersistedCompanyManualInputs> {
  return memoryStore;
}

export function readManualInputsFromMemory(
  cleanTicker: string,
): PersistedCompanyManualInputs | null {
  return memoryStore.get(cleanTicker.trim()) ?? null;
}

export function writeManualInputsToMemory(
  document: PersistedCompanyManualInputs,
): void {
  memoryStore.set(document.cleanTicker.trim(), document);
}

export function clearManualInputsMemoryStore(): void {
  memoryStore.clear();
}

/** Alias for repository re-export compatibility. */
export const clearInMemoryManualInputsStore = clearManualInputsMemoryStore;
