import type { ForecastPeriodValueMap } from "@/lib/types/periods";
import type { ReviewFlag } from "@/lib/types/review-flags";

export type DecisionStatus = "Approve" | "Watchlist" | "Reject";

export interface ForecastFadeResult {
  revenueGrowthPath: ForecastPeriodValueMap<number>;
  operatingMarginPath: ForecastPeriodValueMap<number>;
  fadeNarrative: string;
}

export interface ReinvestmentFcffResult {
  reinvestmentRatePath: ForecastPeriodValueMap<number>;
  fcffPath: ForecastPeriodValueMap<number>;
  notes: string;
}

export interface RiskWaccResult {
  costOfEquity: number;
  costOfDebtAfterTax: number;
  wacc: number;
  beta: number;
  erp: number;
}

export interface TerminalValueResult {
  terminalMethod: "Gordon Growth" | "Exit Multiple" | "Hybrid";
  terminalValue: number;
  terminalGrowthRate: number;
  terminalYear: string;
}

export interface FirmToEquityBridgeResult {
  enterpriseValue: number;
  cashAndInvestments: number;
  totalDebtAndDebtLikeClaims: number;
  minorityInterest: number;
  preferredEquity: number;
  pensionAndOtherClaims: number;
  equityValue: number;
}

export interface ShareCountResult {
  historicalWeightedAverageDilutedShares: number;
  manualShareCountOverride?: number;
  finalShareCountUsed: number;
  sbcDilutionAssumption: number;
}

export interface PerShareValuationResult {
  intrinsicValuePerShare: number;
  entryPrice: number;
  exitPrice12m: number;
  return12mFromEntry: number;
  exitPrice3y: number;
  return3yFromEntry: number;
  finalMOS: number;
}

export interface DecisionResult {
  decisionStatus: DecisionStatus;
  statusNote: string;
  blockingFlags: string[];
  reviewFlag: ReviewFlag;
}

export interface CompanyValuationResult {
  forecastFadeResult: ForecastFadeResult;
  reinvestmentFcffResult: ReinvestmentFcffResult;
  riskWaccResult: RiskWaccResult;
  terminalValueResult: TerminalValueResult;
  firmToEquityBridgeResult: FirmToEquityBridgeResult;
  shareCountResult: ShareCountResult;
  perShareValuationResult: PerShareValuationResult;
  decisionResult: DecisionResult;
  modelVersion: string;
  calculatedAt: string;
}
