import type { CompanyBetaPolicyInputs } from "@/lib/types/beta-engine";
import type { CurrencyCode, CurrencyReviewStatus } from "@/lib/types/currency";
import type { CompanyIntrinsicValueFoundationInputs } from "@/lib/types/intrinsic-value-engine";
import type {
  BalanceSheetBridgeInputs,
  DecisionLayerInputs,
  ForecastInputs,
  RiskWaccInputs,
  TerminalValueInputs,
} from "@/lib/types/inputs";
import type { CompanyWaccFoundationInputs } from "@/lib/types/wacc-engine";

/** Current persisted manual-inputs schema version. */
export const COMPANY_MANUAL_INPUTS_SCHEMA_VERSION = 1 as const;

export type CompanyManualInputsSchemaVersion = typeof COMPANY_MANUAL_INPUTS_SCHEMA_VERSION;

/**
 * Wiring boundary for saved manual inputs.
 * - persistence_only: stored on Inputs tab only (legacy / pre-2B-2 saves)
 * - market_overlay_wired: current price + required MOS → MOS / Dashboard overlay only
 * - engine_wired: future full valuation merge (not implemented)
 */
export type ManualInputsWiringStatus =
  | "persistence_only"
  | "market_overlay_wired"
  | "engine_wired";

export type ManualInputsPersistSource = "user" | "seed" | "import";

/** Optional field overrides saved separately from the base company document. */
export interface CompanyManualInputOverrides {
  identity?: {
    companyName?: string;
    fullTicker?: string;
    exchange?: string;
    websiteUrl?: string;
    countryOfRisk?: string;
    damodaranIndustrialBenchmark?: string;
  };
  currencies?: {
    reportingCurrency?: CurrencyCode;
    valuationCurrency?: CurrencyCode;
    tradingCurrency?: CurrencyCode;
    fxPairToValuation?: string;
    reviewStatus?: CurrencyReviewStatus;
    note?: string;
  };
  companySetup?: {
    valuationDate?: string;
  };
  market?: {
    currentPrice?: number;
    /** Absolute currency units (same as CompanyDataModel.marketInputs.marketCap). */
    marketCap?: number;
    manualShareCountOverride?: number;
    beta?: number;
  };
  forecastInputs?: Partial<ForecastInputs>;
  riskWaccInputs?: Partial<RiskWaccInputs>;
  betaPolicyInputs?: Partial<CompanyBetaPolicyInputs>;
  waccFoundationInputs?: Partial<CompanyWaccFoundationInputs>;
  terminalValueInputs?: Partial<TerminalValueInputs>;
  balanceSheetBridgeInputs?: Partial<BalanceSheetBridgeInputs>;
  intrinsicValueFoundationInputs?: Partial<CompanyIntrinsicValueFoundationInputs>;
  decisionLayerInputs?: Partial<DecisionLayerInputs>;
  historicalLtm?: {
    revenue?: number;
    freeCashFlow?: number;
  };
}

/** Firestore / in-memory persisted document in `companyInputs` collection. */
export interface PersistedCompanyManualInputs {
  schemaVersion: CompanyManualInputsSchemaVersion;
  cleanTicker: string;
  savedAt: string;
  source: ManualInputsPersistSource;
  wiringStatus: ManualInputsWiringStatus;
  overrides: CompanyManualInputOverrides;
  validationWarnings?: string[];
}

/** Sanitized payload accepted by saveCompanyManualInputs (no document metadata). */
export interface CompanyManualInputsSavePayload {
  overrides: CompanyManualInputOverrides;
  source?: ManualInputsPersistSource;
}

export interface ManualInputsSanitizeResult {
  payload: CompanyManualInputsSavePayload;
  warnings: string[];
  errors: string[];
}

export interface ManualInputsSaveResult {
  ok: boolean;
  document: PersistedCompanyManualInputs | null;
  warnings: string[];
  errors: string[];
  /** Full valuation cache invalidation — only when engine_wired (future). */
  shouldInvalidateFoundationCache: boolean;
  /** Market-overlay STALE path — when market_overlay_wired save changes price/MOS. */
  shouldRecomputeMarketOverlayOnly: boolean;
}

export interface ManualInputsLoadResult {
  data: PersistedCompanyManualInputs | null;
  source: "firestore" | "memory" | "none";
  error?: string;
}
