export type DecisionStatus = "Approve" | "Watchlist" | "Reject";
export type ReviewFlag = "Green" | "Yellow" | "Red";

export interface CompanyEngineResult {
  companyName: string;
  fullTicker: string;
  cleanTicker: string;
  exchange: string;
  valuationCurrency: string;
  reportingCurrency: string;
  tradingCurrency: string;
  currentPrice: number;
  marketCap: number;
  intrinsicValuePerShare: number;
  entryPrice: number;
  exitPrice12m: number;
  exitPrice3y: number;
  finalMOS: number;
  decisionStatus: DecisionStatus;
  reviewFlag: ReviewFlag;
  statusNote: string;
  lastUpdated: string;
}
