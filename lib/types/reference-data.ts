import type { CurrencyCode } from "@/lib/types/currency";
import type { ISMSector } from "@/lib/types/company";

export interface RiskfreeRateRow {
  id: string;
  currencyCode: CurrencyCode;
  currencyName: string;
  riskfreeProxy: string;
  fredSeriesId: string;
  autoImportEnabled: boolean;
  liveRiskfreeRate: number | null;
  manualOverrideRate: number | null;
  selectedRiskfreeRate: number | null;
  sourceName: string;
  sourceUrl: string;
  sourceUpdateDate: string;
  importedLastUpdated: string | null;
  status: string;
  notes: string;
}

export interface CurrencyMapRow {
  id: string;
  currencyCode: CurrencyCode;
  currencyName: string;
  active: boolean;
  usedAsReporting: boolean;
  usedAsValuation: boolean;
  usedAsTrading: boolean;
  riskfreeRequired: boolean;
  defaultRiskfreeProxy: string;
  notes: string;
}

export interface FxPairRateRow {
  id: string;
  fromCurrency: CurrencyCode;
  toCurrency: CurrencyCode;
  fxPair: string;
  liveFxRate: number | null;
  manualOverride: number | null;
  selectedFxRate: number | null;
  source: string;
  lastUpdated: string;
  status: string;
  notes: string;
  requiredByCompany?: boolean;
  requiredByTickers?: string[];
  purpose?:
    | "Current Price Conversion"
    | "Reporting Currency Review"
    | "Reverse / Reference Conversion"
    | "Reference Pair"
    | "Same Currency";
  priority?: number;
  lastProviderAttempted?: string;
  providerAttemptCount?: number;
  refreshSkippedReason?: string;
  derivedFromPair?: string;
  isInverseDerived?: boolean;
}

export interface CountryRiskErpData {
  country: string;
  countryCode: string;
  sovereignRating: string;
  countryRiskPremium: number;
  equityRiskPremium: number;
  asOfDate: string;
}

export interface DamodaranDataSection {
  sectionName: string;
  versionTag: string;
  asOfDate: string;
  notes: string;
}

export interface SectorIndustryMapping {
  ismSector: ISMSector;
  internalIndustryName: string;
  damodaranIndustry: string;
}

export interface BetaReferenceData {
  benchmarkName: string;
  industry: string;
  unleveredBeta: number;
  releveredBeta: number;
  asOfDate: string;
}

export interface ForecastFadeRules {
  ruleSetName: string;
  fadeStartYear: number;
  fadeEndYear: number;
  targetMarginConvergence: string;
  targetGrowthConvergence: string;
}

export interface ApiProviderConfig {
  provider: string;
  keyEnvVarName: string;
  purpose: string;
  status: "Not Connected" | "Ready for Integration" | "Connected";
  notes: string;
}

export interface DailyRefreshStatus {
  startedAt: string;
  finishedAt: string;
  success: boolean;
  riskfreeRefreshStatus: string;
  fxRefreshStatus: string;
  providersUsed: string[];
  warnings: string[];
  errors: string[];
  lastSuccessfulRefreshAt?: string;
  source: string;
  status: string;
  fxLastAttemptAt?: string;
  fxLastSuccessfulRefreshAt?: string;
  fxProvidersUsed?: string[];
  fxWarnings?: string[];
  fxErrors?: string[];
  fxProviderAttempts?: number;
  fxUpdatedCount?: number;
  fxSkippedCount?: number;
  fxManualOverrideCount?: number;
  fxSameCurrencyCount?: number;
  riskfreeLastAttemptAt?: string;
  riskfreeLastSuccessfulRefreshAt?: string;
}

export type RiskfreeRateConfig = RiskfreeRateRow;
export type FxRateConfig = FxPairRateRow;
