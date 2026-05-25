import type { CurrencyConfig } from "@/lib/types/currency";
import type {
  AccountingAdjustmentInputs,
  BalanceSheetBridgeInputs,
  CompanySetupInputs,
  DebtDetailInputs,
  DecisionLayerInputs,
  ForecastInputs,
  HistoricalCashFlowInputs,
  HistoricalIncomeStatementInputs,
  LeaseInputs,
  MarketInputs,
  RiskWaccInputs,
  ScenarioSensitivityInputs,
  TerminalValueInputs,
  WorkingCapitalInputs,
} from "@/lib/types/inputs";
import type { HistoricalPeriod, ForecastPeriod } from "@/lib/types/periods";
import type { DashboardCompanyRow } from "@/lib/types/dashboard";
import type { CompanyValuationResult } from "@/lib/types/valuation-results";
import type { WorstFlagWinsResult } from "@/lib/types/review-flags";

export type FullTicker = string;
export type CleanTicker = string;
export type Exchange = string;
export type CompanyWebsiteDomain = string;
export type LogoUrl = string;

export type ISMSector =
  | "Information Technology"
  | "Communication Services"
  | "Consumer Discretionary"
  | "Consumer Staples"
  | "Financials"
  | "Health Care"
  | "Industrials"
  | "Materials"
  | "Energy"
  | "Utilities"
  | "Real Estate"
  | "Other";

export type DamodaranIndustrialBenchmark = string;

export interface CompanyIdentity {
  companyName: string;
  fullTicker: FullTicker;
  cleanTicker: CleanTicker;
  exchange: Exchange;
  websiteDomain: CompanyWebsiteDomain;
  websiteUrl: string;
  logoUrl: LogoUrl;
  ismSector: ISMSector;
  damodaranIndustrialBenchmark: DamodaranIndustrialBenchmark;
  countryOfRisk: string;
}

export interface CompanyHistoricalData {
  incomeStatement: HistoricalIncomeStatementInputs;
  cashFlow: HistoricalCashFlowInputs;
  workingCapital: WorkingCapitalInputs;
}

export interface CompanyForecastData {
  baseCaseRevenueGrowthByPeriod: Partial<Record<ForecastPeriod, number>>;
  baseCaseOperatingMarginByPeriod: Partial<Record<ForecastPeriod, number>>;
  capexAsPercentRevenueByPeriod: Partial<Record<ForecastPeriod, number>>;
  narrative: string;
}

export interface CompanyDataModel {
  identity: CompanyIdentity;
  currencies: CurrencyConfig;
  companySetupInputs: CompanySetupInputs;
  marketInputs: MarketInputs;
  historicalData: CompanyHistoricalData;
  balanceSheetBridgeInputs: BalanceSheetBridgeInputs;
  debtDetailInputs: DebtDetailInputs;
  leaseInputs: LeaseInputs;
  forecastInputs: ForecastInputs;
  riskWaccInputs: RiskWaccInputs;
  terminalValueInputs: TerminalValueInputs;
  decisionLayerInputs: DecisionLayerInputs;
  scenarioSensitivityInputs: ScenarioSensitivityInputs;
  accountingAdjustmentInputs: AccountingAdjustmentInputs;
  forecastData: CompanyForecastData;
  valuationResult: CompanyValuationResult;
  reviewSummary: WorstFlagWinsResult;
  dashboardRow: DashboardCompanyRow;
  lastUpdated: string;
  availableHistoricalPeriods: HistoricalPeriod[];
}
