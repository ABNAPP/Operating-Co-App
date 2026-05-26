import type { WaccInput, WaccReadinessStatus, WaccResult, WaccStatus } from "@/lib/types/wacc-engine";

export const COST_OF_EQUITY_FORMULA = "Cost of Equity = Riskfree Rate + Selected Beta × ERP";
export const AFTER_TAX_COST_OF_DEBT_FORMULA =
  "After-tax Cost of Debt = Pre-tax Cost of Debt × (1 − Tax Rate)";
export const WACC_FORMULA =
  "WACC = Equity Weight × Cost of Equity + Debt Weight × After-tax Cost of Debt";

const REVENUE_WEIGHTED_ERP_REVIEW_NOTE =
  "Revenue-weighted ERP not implemented yet; country-of-risk ERP used as foundation input.";

export function isPlausibleBeta(value: number | null): value is number {
  return value !== null && Number.isFinite(value) && value >= 0.05 && value <= 5;
}

export function isPlausibleRate(value: number | null): value is number {
  return value !== null && Number.isFinite(value) && value >= -0.05 && value <= 0.5;
}

export function isPlausibleTaxRate(value: number | null): value is number {
  return value !== null && Number.isFinite(value) && value >= 0 && value <= 0.6;
}

export function isPlausibleDebtToEquity(value: number | null): value is number {
  return value !== null && Number.isFinite(value) && value >= 0 && value <= 20;
}

export function isPlausibleWeight(value: number | null): value is number {
  return value !== null && Number.isFinite(value) && value >= 0 && value <= 1;
}

export function calculateCostOfEquity(
  riskfreeRate: number,
  selectedBeta: number,
  equityRiskPremium: number,
): number {
  return riskfreeRate + selectedBeta * equityRiskPremium;
}

export function calculateAfterTaxCostOfDebt(preTaxCostOfDebt: number, taxRate: number): number {
  return preTaxCostOfDebt * (1 - taxRate);
}

export function deriveWeightsFromDebtToEquity(debtToEquity: number): {
  debtWeight: number;
  equityWeight: number;
} {
  const safeDebtToEquity = Math.max(0, debtToEquity);
  const debtWeight = safeDebtToEquity / (1 + safeDebtToEquity);
  const equityWeight = 1 / (1 + safeDebtToEquity);
  return { debtWeight, equityWeight };
}

export function calculateWacc(
  equityWeight: number,
  costOfEquity: number,
  debtWeight: number,
  afterTaxCostOfDebt: number,
): number {
  return equityWeight * costOfEquity + debtWeight * afterTaxCostOfDebt;
}

function inputHasDebtEquityOrWeights(input: WaccInput): boolean {
  if (isPlausibleDebtToEquity(input.selectedDebtToEquity)) {
    return true;
  }
  return isPlausibleWeight(input.selectedDebtWeight) && isPlausibleWeight(input.selectedEquityWeight);
}

function resolveWeights(input: WaccInput): {
  debtWeight: number | null;
  equityWeight: number | null;
  error: string | null;
} {
  if (isPlausibleWeight(input.selectedDebtWeight) && isPlausibleWeight(input.selectedEquityWeight)) {
    const sum = input.selectedDebtWeight + input.selectedEquityWeight;
    if (Math.abs(sum - 1) > 0.02) {
      return {
        debtWeight: null,
        equityWeight: null,
        error: "Explicit debt and equity weights do not sum to 1.",
      };
    }
    if (input.selectedDebtWeight < 0 || input.selectedEquityWeight < 0) {
      return {
        debtWeight: null,
        equityWeight: null,
        error: "Capital structure weights cannot be negative.",
      };
    }
    return {
      debtWeight: input.selectedDebtWeight,
      equityWeight: input.selectedEquityWeight,
      error: null,
    };
  }

  if (!isPlausibleDebtToEquity(input.selectedDebtToEquity)) {
    return { debtWeight: null, equityWeight: null, error: null };
  }

  const derived = deriveWeightsFromDebtToEquity(input.selectedDebtToEquity);
  return { ...derived, error: null };
}

function emptyResult(params: {
  status: WaccStatus;
  warnings?: string[];
  errors?: string[];
  notes?: string[];
  sourceSummary?: Record<string, string>;
}): WaccResult {
  return {
    costOfEquity: null,
    afterTaxCostOfDebt: null,
    debtWeight: null,
    equityWeight: null,
    wacc: null,
    status: params.status,
    warnings: params.warnings ?? [],
    errors: params.errors ?? [],
    notes: params.notes ?? [],
    sourceSummary: params.sourceSummary ?? {},
  };
}

export function computeWaccReadinessFromInput(input: WaccInput): WaccReadinessStatus {
  const missingInputs: string[] = [];
  const reviewFlags: string[] = [];

  if (!input.selectedBenchmark.trim()) {
    return {
      hasSelectedBeta: false,
      hasRiskfreeRate: false,
      hasERP: false,
      hasDebtEquityOrWeights: false,
      hasPreTaxCostOfDebt: false,
      hasTaxRate: false,
      status: "Not Applicable",
      missingInputs: ["Damodaran Industrial Benchmark"],
      reviewFlags: [],
    };
  }

  const hasSelectedBeta = isPlausibleBeta(input.selectedBeta);
  const hasRiskfreeRate = isPlausibleRate(input.riskfreeRate);
  const hasERP = isPlausibleRate(input.equityRiskPremium);
  const hasDebtEquityOrWeights = inputHasDebtEquityOrWeights(input);
  const hasPreTaxCostOfDebt = isPlausibleRate(input.preTaxCostOfDebt);
  const hasTaxRate = isPlausibleTaxRate(input.selectedTaxRate);

  if (!hasSelectedBeta) missingInputs.push("selected beta");
  if (!hasRiskfreeRate) missingInputs.push("riskfree rate");
  if (!hasERP) missingInputs.push("equity risk premium");
  if (!hasDebtEquityOrWeights) missingInputs.push("debt/equity or capital weights");
  if (!hasPreTaxCostOfDebt) missingInputs.push("pre-tax cost of debt");
  if (!hasTaxRate) missingInputs.push("tax rate");

  if (input.notes.includes(REVENUE_WEIGHTED_ERP_REVIEW_NOTE)) {
    reviewFlags.push(REVENUE_WEIGHTED_ERP_REVIEW_NOTE);
  }

  let status: WaccStatus = "Ready";
  if (missingInputs.includes("selected beta") || missingInputs.includes("riskfree rate") || missingInputs.includes("equity risk premium")) {
    status = "Missing";
  } else if (missingInputs.length > 0) {
    status = "Review";
  } else if (reviewFlags.length > 0) {
    status = "Review";
  }

  return {
    hasSelectedBeta,
    hasRiskfreeRate,
    hasERP,
    hasDebtEquityOrWeights,
    hasPreTaxCostOfDebt,
    hasTaxRate,
    status,
    missingInputs,
    reviewFlags,
  };
}

export function computeWaccFromInput(input: WaccInput): WaccResult {
  const warnings: string[] = [];
  const errors: string[] = [];
  const notes = [...input.notes];
  const sourceSummary: Record<string, string> = {};

  if (input.selectedBetaSource) sourceSummary.selectedBeta = input.selectedBetaSource;
  if (input.riskfreeSource) sourceSummary.riskfreeRate = input.riskfreeSource;
  if (input.equityRiskPremiumSource) sourceSummary.equityRiskPremium = input.equityRiskPremiumSource;
  if (input.countryRiskPremiumSource) sourceSummary.countryRiskPremium = input.countryRiskPremiumSource;
  if (input.costOfDebtSource) sourceSummary.preTaxCostOfDebt = input.costOfDebtSource;
  if (input.taxRateSource) sourceSummary.taxRate = input.taxRateSource;

  if (!input.selectedBenchmark.trim()) {
    return emptyResult({
      status: "Not Applicable",
      errors: ["No Damodaran Industrial Benchmark selected."],
      notes: ["Select a benchmark before WACC foundation can run."],
      sourceSummary,
    });
  }

  const readiness = computeWaccReadinessFromInput(input);

  if (
    readiness.missingInputs.includes("selected beta") ||
    readiness.missingInputs.includes("riskfree rate") ||
    readiness.missingInputs.includes("equity risk premium")
  ) {
    return emptyResult({
      status: "Missing",
      warnings,
      errors: [`Missing required WACC inputs: ${readiness.missingInputs.join(", ")}.`],
      notes,
      sourceSummary,
    });
  }

  const canComputeCostOfEquity =
    isPlausibleRate(input.riskfreeRate) &&
    isPlausibleBeta(input.selectedBeta) &&
    isPlausibleRate(input.equityRiskPremium);

  if (
    readiness.missingInputs.includes("debt/equity or capital weights") ||
    readiness.missingInputs.includes("pre-tax cost of debt") ||
    readiness.missingInputs.includes("tax rate")
  ) {
    const costOfEquity = canComputeCostOfEquity
      ? calculateCostOfEquity(input.riskfreeRate!, input.selectedBeta!, input.equityRiskPremium!)
      : null;

    const capitalStructureMissing = readiness.missingInputs.filter((item) =>
      ["debt/equity or capital weights", "pre-tax cost of debt", "tax rate"].includes(item),
    );

    return {
      costOfEquity,
      afterTaxCostOfDebt: null,
      debtWeight: null,
      equityWeight: null,
      wacc: null,
      status: "Review",
      warnings: costOfEquity
        ? [
            "Cost of Equity shown for review; WACC not calculated because capital structure / cost of debt inputs are incomplete.",
            ...readiness.reviewFlags,
          ]
        : [...readiness.reviewFlags],
      errors:
        capitalStructureMissing.length > 0
          ? [`Missing capital structure / cost of debt inputs: ${capitalStructureMissing.join(", ")}.`]
          : [],
      notes,
      sourceSummary,
    };
  }

  const riskfreeRate = input.riskfreeRate!;
  const selectedBeta = input.selectedBeta!;
  const equityRiskPremium = input.equityRiskPremium!;
  const preTaxCostOfDebt = input.preTaxCostOfDebt!;
  const taxRate = input.selectedTaxRate!;

  const costOfEquity = calculateCostOfEquity(riskfreeRate, selectedBeta, equityRiskPremium);
  const afterTaxCostOfDebt = calculateAfterTaxCostOfDebt(preTaxCostOfDebt, taxRate);

  const weights = resolveWeights(input);
  if (weights.error) {
    return emptyResult({
      status: "Review",
      warnings: [weights.error],
      notes,
      sourceSummary,
    });
  }

  if (weights.debtWeight === null || weights.equityWeight === null) {
    return emptyResult({
      status: "Review",
      errors: ["Unable to derive capital structure weights."],
      notes,
      sourceSummary,
    });
  }

  const wacc = calculateWacc(
    weights.equityWeight,
    costOfEquity,
    weights.debtWeight,
    afterTaxCostOfDebt,
  );

  let status: WaccStatus = "Ready";
  if (readiness.reviewFlags.length > 0) {
    status = "Review";
    warnings.push(...readiness.reviewFlags);
  }

  notes.push("WACC foundation output only — not connected to FCFF, terminal value, or intrinsic value.");

  return {
    costOfEquity,
    afterTaxCostOfDebt,
    debtWeight: weights.debtWeight,
    equityWeight: weights.equityWeight,
    wacc,
    status,
    warnings,
    errors,
    notes,
    sourceSummary,
  };
}
