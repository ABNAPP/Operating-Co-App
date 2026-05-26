export type BetaReferenceStatus = "Ready" | "Review" | "Missing" | "Not Applicable";

export type BetaMatchType = "Exact" | "Normalized" | "Missing" | "Review";

/** How betaTableKey was resolved from Industry Benchmark Config. */
export type BetaTableKeyMode = "explicit" | "benchmark-default";

export interface BetaReferenceRow {
  benchmarkName: string;
  normalizedBenchmarkName: string;
  betaTableKey: string;
  datasetId: string;
  datasetName: string;
  rawDatasetRowId: string;
  unleveredBeta: number | null;
  leveredBeta: number | null;
  cashAdjustedBeta: number | null;
  numberOfFirms: number | null;
  sourceName: string;
  sourceUrl: string;
  sourceUpdateDate: string;
  importedLastUpdated: string;
  status: BetaReferenceStatus;
  /** Short user-facing note (match quality, review prompts). */
  notes: string;
  /** Column detection and import metadata — shown in collapsed details. */
  technicalNotes?: string;
}

export interface BetaLookupResult {
  selectedBenchmark: string;
  betaTableKey: string | null;
  /** explicit = tblBenchmarkDataPullKeys; benchmark-default = v1.5 industry label default. */
  betaTableKeyMode: BetaTableKeyMode | null;
  datasetId: string | null;
  matched: boolean;
  matchType: BetaMatchType;
  betaReference: BetaReferenceRow | null;
  warnings: string[];
  errors: string[];
}

export interface BetaReadinessStatus {
  selectedBenchmark: string;
  hasIndustryBenchmark: boolean;
  hasBetaPullKey: boolean;
  hasBetaDataset: boolean;
  hasMatchingBetaRow: boolean;
  hasUsableUnleveredBeta: boolean;
  status: BetaReferenceStatus;
  notes: string[];
}

export type BetaSelectionPolicy =
  | "Use Damodaran Unlevered Beta + Relever"
  | "Use Damodaran Levered Beta Reference"
  | "Use Cash-adjusted Beta Reference"
  | "Manual Override"
  | "Review Required";

export type BetaPolicyStatus = "Ready" | "Review" | "Missing" | "Not Applicable";

export interface BetaPolicyInput {
  selectedBenchmark: string;
  unleveredBeta: number | null;
  leveredBetaReference: number | null;
  cashAdjustedBetaReference: number | null;
  selectedBetaOverride: number | null;
  useOverride: boolean;
  marketDebtToEquity: number | null;
  bookDebtToEquity: number | null;
  selectedDebtToEquity: number | null;
  taxRate: number | null;
  selectedTaxRate: number | null;
  cashAdjustmentPolicy: string | null;
  betaSelectionPolicy: BetaSelectionPolicy;
}

export interface BetaPolicyResult {
  selectedUnleveredBeta: number | null;
  selectedLeveredBeta: number | null;
  selectedBeta: number | null;
  selectedBetaSource: BetaSelectionPolicy | string;
  selectedDebtToEquity: number | null;
  selectedTaxRate: number | null;
  releveringFormulaUsed: string | null;
  status: BetaPolicyStatus;
  warnings: string[];
  errors: string[];
  notes: string[];
}

/** Optional company-sheet beta policy inputs (not ISM-driven). */
export interface CompanyBetaPolicyInputs {
  marketDebtToEquity?: number | null;
  bookDebtToEquity?: number | null;
  selectedDebtToEquity?: number | null;
  selectedTaxRate?: number | null;
  selectedBetaOverride?: number | null;
  useOverride?: boolean;
  betaSelectionPolicy?: BetaSelectionPolicy;
  cashAdjustmentPolicy?: string | null;
}
