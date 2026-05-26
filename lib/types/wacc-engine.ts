export type WaccStatus = "Ready" | "Review" | "Missing" | "Not Applicable";

export interface WaccManualOverrides {
  selectedBeta?: number | null;
  riskfreeRate?: number | null;
  equityRiskPremium?: number | null;
  preTaxCostOfDebt?: number | null;
  selectedTaxRate?: number | null;
  selectedDebtToEquity?: number | null;
  selectedDebtWeight?: number | null;
  selectedEquityWeight?: number | null;
}

export interface WaccInput {
  companyId: string;
  selectedBenchmark: string;
  valuationCurrency: string;
  countryOfRisk: string;
  selectedBeta: number | null;
  selectedBetaSource: string | null;
  riskfreeRate: number | null;
  riskfreeSource: string | null;
  equityRiskPremium: number | null;
  equityRiskPremiumSource: string | null;
  countryRiskPremium: number | null;
  countryRiskPremiumSource: string | null;
  selectedDebtToEquity: number | null;
  selectedDebtWeight: number | null;
  selectedEquityWeight: number | null;
  preTaxCostOfDebt: number | null;
  costOfDebtSource: string | null;
  selectedTaxRate: number | null;
  taxRateSource: string | null;
  manualOverrides: WaccManualOverrides;
  notes: string[];
}

export interface WaccResult {
  costOfEquity: number | null;
  afterTaxCostOfDebt: number | null;
  debtWeight: number | null;
  equityWeight: number | null;
  wacc: number | null;
  status: WaccStatus;
  warnings: string[];
  errors: string[];
  notes: string[];
  sourceSummary: Record<string, string>;
}

export interface WaccReadinessStatus {
  hasSelectedBeta: boolean;
  hasRiskfreeRate: boolean;
  hasERP: boolean;
  hasDebtEquityOrWeights: boolean;
  hasPreTaxCostOfDebt: boolean;
  hasTaxRate: boolean;
  status: WaccStatus;
  missingInputs: string[];
  reviewFlags: string[];
}

/** Explicit mock/scaffold WACC foundation inputs — not live company data. */
export interface CompanyWaccFoundationInputs {
  preTaxCostOfDebt?: number | null;
  selectedDebtToEquity?: number | null;
  selectedDebtWeight?: number | null;
  selectedEquityWeight?: number | null;
  selectedTaxRate?: number | null;
  costOfDebtSource?: string;
  taxRateSource?: string;
  notes?: string;
}
