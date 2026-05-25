import type { HistoricalPeriodValueMap } from "@/lib/types/periods";
import type { CurrencyCode } from "@/lib/types/currency";

export interface CompanySetupInputs {
  companyName: string;
  fullTicker: string;
  cleanTicker: string;
  exchange: string;
  valuationDate: string;
  valuationCurrency: CurrencyCode;
  reportingCurrency: CurrencyCode;
  tradingCurrency: CurrencyCode;
}

export interface MarketInputs {
  currentPrice: number;
  marketCap: number;
  manualShareCountOverride?: number;
  historicalWeightedAverageDilutedShares: HistoricalPeriodValueMap<number>;
  beta?: number;
}

export interface HistoricalIncomeStatementInputs {
  revenue: HistoricalPeriodValueMap<number>;
  grossProfit: HistoricalPeriodValueMap<number>;
  ebitda: HistoricalPeriodValueMap<number>;
  ebit: HistoricalPeriodValueMap<number>;
  netIncome: HistoricalPeriodValueMap<number>;
  eps: HistoricalPeriodValueMap<number>;
  effectiveTaxRate: HistoricalPeriodValueMap<number>;
  interestExpense: HistoricalPeriodValueMap<number>;
  sbc: HistoricalPeriodValueMap<number>;
  dividendsPerShare: HistoricalPeriodValueMap<number>;
}

export interface HistoricalCashFlowInputs {
  operatingCashFlow: HistoricalPeriodValueMap<number>;
  freeCashFlow: HistoricalPeriodValueMap<number>;
  depreciationAndAmortization: HistoricalPeriodValueMap<number>;
  capex: HistoricalPeriodValueMap<number>;
}

export interface WorkingCapitalInputs {
  receivables: HistoricalPeriodValueMap<number>;
  inventory: HistoricalPeriodValueMap<number>;
  accountsPayable: HistoricalPeriodValueMap<number>;
  deferredRevenue: HistoricalPeriodValueMap<number>;
}

export interface BalanceSheetBridgeInputs {
  cashAndCashEquivalents: number;
  marketableSecurities: number;
  grossDebt: number;
  leaseLiabilities: number;
  minorityInterest: number;
  preferredEquity: number;
  pensionDeficit: number;
  otherClaims: number;
}

export interface DebtDetailInputs {
  averageDebtMaturityYears: number;
  averageDebtCost: number;
  fixedVsFloatingMixPercent: number;
  debtCurrencyMix: Partial<Record<CurrencyCode, number>>;
}

export interface LeaseInputs {
  annualLeaseExpense: number;
  leaseDurationYears: number;
  impliedLeaseDiscountRate: number;
}

export interface ForecastInputs {
  revenueGrowthAssumption: number;
  targetOperatingMargin: number;
  targetTaxRate: number;
  targetReinvestmentRate: number;
  targetRoeOrRoic: number;
}

export interface RiskWaccInputs {
  riskfreeRate: number;
  equityRiskPremium: number;
  countryRiskPremium: number;
  beta: number;
  preTaxCostOfDebt: number;
  targetDebtToCapital: number;
  marginalTaxRate: number;
}

export interface TerminalValueInputs {
  terminalGrowthRate: number;
  terminalRoiOrRoic: number;
  terminalMargin: number;
  terminalMethod: "Gordon Growth" | "Exit Multiple" | "Hybrid";
}

export interface DecisionLayerInputs {
  minimumMOSForApprove: number;
  watchlistMOSFloor: number;
  hardExclusionTags: string[];
  analystOverrideNote?: string;
}

export interface ScenarioSensitivityInputs {
  baseCaseWeight: number;
  bullCaseWeight: number;
  bearCaseWeight: number;
  discountRateShockBps: number;
  terminalGrowthShockBps: number;
}

export interface AccountingAdjustmentInputs {
  normalizeOneOffItems: boolean;
  capitalizeRAndD: boolean;
  sbcTreatment: "As Expense" | "Add Back With Dilution" | "Manual";
  leaseTreatment: "Debt-like" | "Operating-only";
}
