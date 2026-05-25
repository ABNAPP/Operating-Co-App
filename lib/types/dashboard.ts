import type { CurrencyCode } from "@/lib/types/currency";
import type {
  DamodaranIndustrialBenchmark,
  Exchange,
  ISMSector,
  LogoUrl,
} from "@/lib/types/company";
import type { DecisionStatus } from "@/lib/types/valuation-results";
import type { ReviewSeverity } from "@/lib/types/review-flags";

export interface DashboardCompanyRow {
  companyLogoUrl: LogoUrl;
  companyName: string;
  ticker: string;
  exchange: Exchange;
  ismSector: ISMSector;
  damodaranIndustrialBenchmark: DamodaranIndustrialBenchmark;
  currentPrice: number;
  marketCap: number;
  valuationCurrency: CurrencyCode;
  intrinsicValuePerShare: number;
  finalMOS: number;
  entryPrice: number;
  exitPrice12m: number;
  return12mFromEntry: number;
  exitPrice3y: number;
  return3yFromEntry: number;
  decisionStatus: DecisionStatus;
  reviewFlag: ReviewSeverity;
  statusNote: string;
  beta: number;
  erp: number;
  wacc: number;
  forecastQuality: ReviewSeverity;
  fadeQuality: ReviewSeverity;
  terminalReadiness: ReviewSeverity;
  financialHealth: ReviewSeverity;
  businessQuality: ReviewSeverity;
  shareCountReview: ReviewSeverity;
  sbcDilutionReview: ReviewSeverity;
  currencyReview: ReviewSeverity;
  lastUpdated: string;
  websiteUrl: string;
  openCompanyUrl: string;
}
