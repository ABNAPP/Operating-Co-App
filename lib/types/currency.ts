export type CurrencyCode =
  | "USD"
  | "EUR"
  | "SEK"
  | "NOK"
  | "DKK"
  | "CAD"
  | "AUD"
  | "JPY"
  | "CHF"
  | "GBP";

export type ValuationCurrency = CurrencyCode;
export type ReportingCurrency = CurrencyCode;
export type TradingCurrency = CurrencyCode;

export type CurrencyReviewStatus =
  | "Aligned"
  | "Needs Attention"
  | "Manual Override"
  | "Pending Review";

export interface CurrencyConfig {
  valuationCurrency: ValuationCurrency;
  reportingCurrency: ReportingCurrency;
  tradingCurrency: TradingCurrency;
  fxPairToValuation?: string;
  lastFxRefreshDate?: string;
  reviewStatus: CurrencyReviewStatus;
  note?: string;
}
