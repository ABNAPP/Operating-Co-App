export type ReinvestmentFcffReadinessStatus = "Ready" | "Review" | "Missing" | "Not Applicable";

export type ReinvestmentMethodLabel =
  | "Direct Method"
  | "Sales-to-Capital Method"
  | "Stable Method"
  | "Missing / Review";

export interface ReinvestmentFcffInput {
  companyId: string;
  selectedBenchmark: string;
  forecastYear: string;

  revenue: number | null;
  priorRevenue: number | null;
  ebit: number | null;
  taxRate: number | null;

  capex: number | null;
  depreciationAmortization: number | null;
  changeInNonCashWorkingCapital: number | null;

  salesToCapital: number | null;
  methodOverride: ReinvestmentMethodLabel | null;

  sourceNotes: string[];
}

export interface ReinvestmentMethodComparison {
  directAvailable: boolean;
  directReinvestment: number | null;
  salesToCapitalAvailable: boolean;
  salesToCapitalReinvestment: number | null;
  chosenMethod: ReinvestmentMethodLabel | null;
  comparisonNote: string | null;
}

export interface ReinvestmentFcffResult {
  nopat: number | null;
  selectedReinvestmentMethod: ReinvestmentMethodLabel | null;
  reinvestment: number | null;
  fcff: number | null;
  status: ReinvestmentFcffReadinessStatus;
  missingInputs: string[];
  warnings: string[];
  notes: string[];
  methodComparison: ReinvestmentMethodComparison;
}

